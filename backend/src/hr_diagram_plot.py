import io
import re
import requests
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from color_palette import COLOR_MAP

def download_data():
    """
    Attempts to download the gzipped CSV file from a list of URLs.

    Returns:
        io.BytesIO: A bytes buffer of the compressed data if successful, None otherwise.
    """
    # URLs to official public HYG data set repository and backup copy hosted on Google Drive.
    HYG_URLS = ['https://codeberg.org/astronexus/hyg/media/branch/main/data/hyg/CURRENT/hyg_v42.csv.gz',
                'https://drive.google.com/uc?export=download&id=1U2apsUPjQR_DllzF74y-pV3KjVTK3FJW']

    hyg_file = None
    print("\nStarting data pipeline: Attempting to download star data...")

    for url in HYG_URLS:
        try:
            print(f"Trying URL: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            hyg_file = io.BytesIO(response.content)
            print("Download successful.")
            return hyg_file
        except requests.exceptions.RequestException as e:
            print(f"Error downloading from {url}: {e}")
            print("Trying next URL...")
    
    print("\nAll download attempts failed. Please check your internet connection or the URLs.")
    return None

def process_data(hyg_file):
    """
    Reads, cleans, and filters the raw star data for plotting.

    Args:
        hyg_file (io.BytesIO): A bytes buffer of the compressed data.

    Returns:
        pd.DataFrame: A filtered DataFrame ready for plotting, or None if an error occurs.
    """
    try:
        df = pd.read_csv(hyg_file, compression='gzip')
        print(f"Total HYG stars: {len(df):,}")
    except Exception as e:
        print(f"An unexpected error occurred during data processing: {e}")
        return None

    # Filter for stars with valid spectral types and absolute magnitudes
    df = df.dropna(subset=['absmag', 'ci', 'spect'])

    star_id_to_correct = 65218
    # Print the row before the change
    print(f"\n--- Row before change (ID: {star_id_to_correct}) ---")
    print(df.loc[df['id'] == star_id_to_correct]['spect'])
    
    # The spectral type for star HIP 65423 is listed as '(G3w)F7' in the dataset.
    # This is an unusual format, and the 'F7' designation is the more relevant
    # spectral type for this star system's primary. To ensure consistency and
    # prevent this specific, one-off anomaly from being incorrectly categorized
    # as an '(' type, I am manually correcting this single entry.
    # This avoids the complexity of writing a solution for a single edge case.
    df.loc[df['id'] == 65218, 'spect'] = 'F7'

    # Print the row after the change
    print(f"\n--- Row after change (ID: {star_id_to_correct}) ---")
    print(df.loc[df['id'] == star_id_to_correct]['spect'])
    print("------------------------------------------\n")
    # --- End of the change ---

    def extract_spectral_data(spect):
        """
        Extracts spectral class and intensity from the spectral string.
        """
        if pd.isna(spect) or not spect:
            return None, None
        
        spect = spect.upper().strip()
        
        # Use regex to find the spectral class letter and optional intensity number
        match = re.search(r'([OBAFGKMRNSWCPLD])(\d)?', spect)
        if match:
            # Extract the letter and the number (if it exists)
            spect_class = match.group(1)
            spect_num = match.group(2)
            
            # Convert number to float, defaulting to 5 if not present
            if spect_num is not None:
                return spect_class, float(spect_num)
            else:
                return spect_class, 5.0 # A default value for stars with no subclass
        
        return None, None

    # Apply the new function to the spectral data
    df[['spect_class', 'spect_num']] = df['spect'].apply(
        lambda x: pd.Series(extract_spectral_data(x)))

    # Define colors for all spectral classes, matching the front-end visualization
    df['color'] = df['spect_class'].map(COLOR_MAP)

    print(f"Data filtered. Stars remaining: {len(df):,}")
    print("\n--- HYG Dataset Head (First 5 Rows) ---")
    print(df.head())
    print("\n--- HYG Dataset Tail (Last 5 Rows) ---")
    print(df.tail())
    return df

def create_plot(df, output_path):
    plt.style.use('dark_background')
    plt.figure(figsize=(10, 10))
    
    # Use a scatter plot to represent the stars
    plt.scatter(
        df['ci'], 
        df['lum'], 
        c=df['color'], 
        alpha=0.5,)
    
    # Set up the plot aesthetics
    plt.gca().set_yscale('log')
    plt.xlabel('Color Index', color='white', fontsize=16)
    plt.ylabel('Luminosity', color='white', fontsize=16)
    plt.title('Hertzsprung-Russell Diagram', color='white', fontsize=20)
    plt.grid(True, linestyle='--', alpha=0.3)

    # Create the custom legend
    legend_patches = []
    for star_type, color in COLOR_MAP.items():
        legend_patches.append(mpatches.Patch(color=color, label=star_type))
    
    plt.legend(handles=legend_patches, 
    title='Spectral\n  Class', 
    frameon=True, 
    title_fontsize=12, 
    labelcolor='white')

    plt.savefig(output_path, bbox_inches='tight', dpi=300)
    print(f"\nH-R Diagram successfully saved to '{output_path}'\n")
    plt.close()

def main():
    """
    Downloads the public HYG star database, filters it, and generates a 
    reproducible Hertzsprung-Russell (H-R) diagram.
    """
    hyg_file = download_data()

    if hyg_file:
        df = process_data(hyg_file)
        if df is not None:
            create_plot(df, 'hr_diagram.png')
    
if __name__ == "__main__":
    main()