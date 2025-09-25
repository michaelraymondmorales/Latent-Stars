import * as THREE from 'three';

// Three.js Color object for each spectral types 
const spectralColors = {
    'O': new THREE.Color(0x8bd1ff), // Blue
    'B': new THREE.Color(0xa7caff), // Blue-white
    'A': new THREE.Color(0xdae9ff), // White
    'F': new THREE.Color(0xfff7e8), // White-yellow
    'G': new THREE.Color(0xffe9b5), // Yellow
    'K': new THREE.Color(0xffcd89), // Orange
    'M': new THREE.Color(0xffa77d), // Red
    'D': new THREE.Color(0x696969), // Dark Gray - White Dwarf 
    'N': new THREE.Color(0xa52a2a), // Auburn - Cool Carbon Star
    'C': new THREE.Color(0x800000), // Maroon - Carbon Star
    'R': new THREE.Color(0xcd5c5c), // Indian Red - Hot Carbon Star
    'P': new THREE.Color(0x7fffd4), // Aquamarine - Planetary Nebulae
    'S': new THREE.Color(0xdaa520), // Goldenrod - S-Type Star
    'W': new THREE.Color(0x87cefa), // Blue Violet - Wolf Rayet
};

// Constants for the Stefan-Boltzmann law
const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8; // σ in W⋅m⁻²⋅K⁻⁴
const SOLAR_LUMINOSITY = 3.828e26; // L☉ in Watts
const SOLAR_ABSOLUTE_MAGNITUDE = 4.83; // M☉
const SOLAR_RADIUS = 6.957e8; // R☉ in meters

// Temperature mapping for spectral types
const spectralTypeTemps = {
    
    'O': { min: 30000, max: 50000 },
    'B': { min: 10000, max: 30000 },
    'A': { min: 7500, max: 10000 },
    'F': { min: 6000, max: 7500 },
    'G': { min: 5200, max: 6000 },
    'K': { min: 3700, max: 5200 },
    'M': { min: 2400, max: 3700 },
    'D': { min: 4000, max: 100000 },
    'N': { min: 2400, max: 3200 },
    'C': { min: 1600, max: 5300 },
    'R': { min: 3700, max: 5000 },
    'P': { min: 8000, max: 20000 },
    'S': { min: 1800, max: 4000 },
    'W': { min: 20000, max:210000 }

    
};

/** Function to estimate temperature from spectral type
 * @param {string} spect The star's spectral type string (e.g., G2)
 * @returns {float} The star's estimated temperature float.
 */
export const getTemperature = (spect) => {
    if (!spect) return 5778; // Default to Sun's temperature if data is missing

    const type = spect[0].toUpperCase();
    const subtype = spect.length > 1 && !isNaN(spect[1]) ? parseInt(spect[1], 10) : 5;

    const tempRange = spectralTypeTemps[type];
    if (!tempRange) return 5778; // Default to Sun's temperature if type is unknown

    // Linear interpolation based on subtype (0-9)
    const normalizedSubtype = subtype / 9;
    return tempRange.max - (tempRange.max - tempRange.min) * normalizedSubtype;
};

/**
 * Function to calculate Luminosity from Absolute Magnitude
 * @param {float} absmag The star's absolute magnitude float.
 * @returns {float} The star's calculated luminosity float.
 */
export const getLuminosity = (absmag) => {
    // L = L☉ * 10^((M☉ - M) / 2.5)
    return SOLAR_LUMINOSITY * Math.pow(10, (SOLAR_ABSOLUTE_MAGNITUDE - absmag) / 2.5);
};

// Function to calculate Radius from Luminosity and Temperature (Stefan-Boltzmann Law)
export const getRadius = (luminosity, temperature) => {
    // L = 4πR²σT⁴ => R = sqrt(L / (4πσT⁴))
    if (temperature === 0) return 0; // Avoid division by zero
    const radiusInMeters = Math.sqrt(luminosity / (4 * Math.PI * STEFAN_BOLTZMANN_CONSTANT * Math.pow(temperature, 4)));
    return radiusInMeters / SOLAR_RADIUS; // Return radius in solar radii
};

/**
 * Gets a star's color based on its spectral type.
 * @param {string} spectralType The spectral type string (e.g., 'G2').
 * @returns {THREE.Color} The calculated star color.
 */
export const getStarColor = (spectralType) => {
    // Check for a valid spectral type string
    if (!spectralType) {
        return new THREE.Color(0xffffff); // Default to white
    }

    const type = spectralType.charAt(0).toUpperCase();
    const subtype = parseInt(spectralType.charAt(1));
    const baseColor = spectralColors[type] || new THREE.Color(0xffffff);
    
    // Check if subtype is a number between 0-9
    if (!isNaN(subtype) && subtype >= 0 && subtype <= 9) {
        let targetColor;
        if (type === 'K' || type === 'M' || type === 'F' || type === 'G') {
            targetColor = new THREE.Color(0xffe9b5); // Yellow
        } else {
            targetColor = new THREE.Color(0xffffff); // White
        }

        const factor = subtype / 9;
        return baseColor.clone().lerp(targetColor, factor);
    }

    return baseColor;
};

/**
 * Loads and parses star data from a gzipped CSV file.
 * @returns {Promise<Array>} A promise that resolves with an array of star data objects.
 */
export const loadStarData = async () => {
    try {
        const response = await fetch('assets/latent_stars_1.csv.gz');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const decompressedData = await response.text();
        const lines = decompressedData.trim().split('\n');
        
        // Skip the header row and map the rest of the lines
        const parsedData = lines.slice(1).map(line => {
            const [id, latent_x, latent_y, latent_z, x, y, z, absmag, spect] = line.split(',');
            return {
                id: parseInt(id),
                latent_x: parseFloat(latent_x),
                latent_y: parseFloat(latent_y),
                latent_z: parseFloat(latent_z),
                x: parseFloat(x),
                y: parseFloat(y),
                z: parseFloat(z),
                absmag: parseFloat(absmag),
                spect: spect,
            };
        });
        
        return parsedData;
    } catch (e) {
        console.error("Could not load and decompress star data:", e);
        return null;
    }
};

/**
 * Calculates the average latent space coordinates for each star spectral class.
 * This is useful for finding the center of clusters in the H-R diagram visualization.
 *
 * @param {Array<Object>} data An array of star objects. Each object must contain 'spect', 'latent_x', and 'latent_y' properties.
 * @returns {Object<string, Object>} An object where each key is a spectral class (e.g., 'O', 'B', 'A') and the value is an object containing the average 'x' and 'y' coordinates for that class.
 */
export const calculateAverages = (data) => {
    const aggregates = {};
    const spectralClasses = ['O', 'B', 'A', 'F', 'G', 'K', 'M', 
                             'D', 'N', 'C', 'R', 'P', 'S', 'W'];
    
    // Initialize aggregates for each class
    spectralClasses.forEach(c => {
        aggregates[c] = { x: 0, y: 0, count: 0 };
    });

    // Sum up positions for each class
    data.forEach(star => {
        const primaryType = star.spect ? star.spect.charAt(0) : null;
        if (primaryType && aggregates[primaryType]) {
            aggregates[primaryType].x += star.latent_x;
            aggregates[primaryType].y += star.latent_y;
            aggregates[primaryType].count++;
        }
    });

    // Calculate the final averages
    const averages = {};
    for (const type in aggregates) {
        const agg = aggregates[type];
        if (agg.count > 0) {
            averages[type] = {
                x: agg.x / agg.count,
                y: agg.y / agg.count
            };
        }
    }
    return averages;
}