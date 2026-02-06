/**
 * Map Configuration
 * Centralized configuration for Google Maps, Mapbox, and HERE APIs
 */

export interface MapConfig {
  google: {
    mapsApiKey: string;
    placesApiKey: string;
  };
  mapbox: {
    accessToken: string;
    styleUrl?: string; // Custom style URL (optional)
    lightStyle?: string; // Mapbox light style
    darkStyle?: string; // Mapbox dark style
  };
  here: {
    apiKey: string;
  };
}

/**
 * Get map configuration from environment variables
 */
export const getMapConfig = (): MapConfig => {
  return {
    google: {
      mapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      placesApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || 
                    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    },
    mapbox: {
      accessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
      lightStyle: 'mapbox://styles/mapbox/light-v11',
      darkStyle: 'mapbox://styles/mapbox/dark-v11',
      styleUrl: process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL,
    },
    here: {
      apiKey: process.env.EXPO_PUBLIC_HERE_API_KEY || '',
    },
  };
};

/**
 * Validate map configuration
 */
export const validateMapConfig = (config: MapConfig): {
  isValid: boolean;
  missing: string[];
} => {
  const missing: string[] = [];

  if (!config.google.mapsApiKey) {
    missing.push('Google Maps API Key');
  }
  if (!config.google.placesApiKey) {
    missing.push('Google Places API Key');
  }
  if (!config.mapbox.accessToken) {
    missing.push('Mapbox Access Token');
  }
  if (!config.here.apiKey) {
    missing.push('HERE API Key');
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
};

/**
 * Default map configuration (for development/testing)
 * Replace with actual keys in production
 */
export const defaultMapConfig: MapConfig = {
  google: {
    mapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
    placesApiKey: 'YOUR_GOOGLE_PLACES_API_KEY',
  },
  mapbox: {
    accessToken: 'YOUR_MAPBOX_ACCESS_TOKEN',
    lightStyle: 'mapbox://styles/mapbox/light-v11',
    darkStyle: 'mapbox://styles/mapbox/dark-v11',
  },
  here: {
    apiKey: 'YOUR_HERE_API_KEY',
  },
};

