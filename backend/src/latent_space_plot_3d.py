import pandas as pd
import matplotlib.pyplot as plt
from color_palette import COLOR_MAP

def plot_latent_space(file_path='../../frontend/latent-stars-app/public/assets/latent_stars_1.csv.gz',
                      elev=0,
                      azim=0,
                      roll=0):
    """
    Loads star data and plots the latent space dimensions.
    """
    try:
        df = pd.read_csv(file_path, compression='gzip')
    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
        return
    
    # Map spectral types to colors for the plot
    df['color'] = df['spect'].str[0].str.upper().map(COLOR_MAP)

    # Set up the plot aesthetics
    plt.style.use('dark_background')

    fig = plt.figure(figsize=(10, 10), facecolor='black')
    ax = fig.add_subplot(111, projection='3d')
    
    # Use a scatter plot to represent the stars, using latent_x and latent_y
    ax.scatter(
        df['latent_x'], 
        df['latent_y'],
        df['latent_z'],
        c=df['color'], 
        alpha=0.5,)

    # Set the static view angle if elevation and azimuth are provided
    ax.view_init(elev=elev, azim=azim, roll=roll)
    
    # Label the axes and provide a clear title
    ax.set_xlabel('Latent Space X', color='white', fontsize=14)
    ax.set_ylabel('Latent Space Y', color='white', fontsize=14)
    #ax.set_zlabel('Latent Space Z', color='white', fontsize=14)
    ax.set_title('Autoencoder 3D Latent Space', color='white', fontsize=18, y=-.025)
    ax.tick_params(colors='white')

    ax.xaxis.pane.set_facecolor('#0a0a1a')
    ax.yaxis.pane.set_facecolor('#0a0a1a')
    ax.zaxis.pane.set_facecolor('#0a0a1a')

    plt.savefig('latent_space_plot_3d.png', bbox_inches='tight', dpi=400)
    print("Static latent space plot successfully saved to 'latent_space_plot_3d.png'")
    plt.close()

if __name__ == "__main__":
    plot_latent_space(elev=-45, azim=135, roll=0)