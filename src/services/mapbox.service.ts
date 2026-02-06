/**
 * Mapbox Service
 * Provides Mapbox-specific functionality: styling, offline maps, custom markers
 * 
 * Documentation: https://docs.mapbox.com/
 */

import { Platform } from 'react-native';
import { getMapConfig } from '../config/map.config';

export interface MapboxStyle {
  light: string;
  dark: string;
  custom?: string;
}

export interface OfflineRegion {
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  minZoom: number;
  maxZoom: number;
}

class MapboxService {
  private accessToken: string;
  private styles: MapboxStyle;

  constructor() {
    const config = getMapConfig();
    this.accessToken = config.mapbox.accessToken;
    this.styles = {
      light: config.mapbox.lightStyle || 'mapbox://styles/mapbox/light-v11',
      dark: config.mapbox.darkStyle || 'mapbox://styles/mapbox/dark-v11',
      custom: config.mapbox.styleUrl,
    };
  }

  /**
   * Get Mapbox access token
   */
  getAccessToken(): string {
    return this.accessToken;
  }

  /**
   * Get style URL for current theme
   */
  getStyleUrl(theme: 'light' | 'dark' | 'custom' = 'light'): string {
    if (theme === 'custom' && this.styles.custom) {
      return this.styles.custom;
    }
    return theme === 'dark' ? this.styles.dark : this.styles.light;
  }

  /**
   * Check if Mapbox is configured
   */
  isConfigured(): boolean {
    return !!this.accessToken;
  }

  /**
   * Get custom marker icon (SVG/PNG)
   * Returns a data URI or URL for custom marker
   */
  getCustomMarkerIcon(type: 'origin' | 'destination' | 'user'): string {
    // Return custom marker icons based on type
    // You can replace these with actual SVG/PNG URLs
    const markers = {
      origin: '📍', // Replace with actual icon URL
      destination: '🎯', // Replace with actual icon URL
      user: '👤', // Replace with actual icon URL
    };
    return markers[type];
  }

  /**
   * Download offline map region
   * Note: This requires Mapbox Maps SDK native implementation
   */
  async downloadOfflineRegion(region: OfflineRegion): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.warn('Offline maps not supported on web');
      return false;
    }

    // This would require native Mapbox SDK implementation
    // For now, return false as placeholder
    console.log('Offline region download requested:', region);
    return false;
  }

  /**
   * Get available offline regions
   */
  async getOfflineRegions(): Promise<OfflineRegion[]> {
    // Placeholder - would require native implementation
    return [];
  }

  /**
   * Delete offline region
   */
  async deleteOfflineRegion(regionName: string): Promise<boolean> {
    // Placeholder - would require native implementation
    console.log('Delete offline region:', regionName);
    return false;
  }

  /**
   * Get map style configuration for Google Maps
   * Converts Mapbox-style JSON to Google Maps custom style
   */
  getGoogleMapsStyle(theme: 'light' | 'dark' = 'light'): any[] {
    if (theme === 'dark') {
      return [
        {
          elementType: 'geometry',
          stylers: [{ color: '#242f3e' }],
        },
        {
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#242f3e' }],
        },
        {
          elementType: 'labels.text.fill',
          stylers: [{ color: '#746855' }],
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#17263c' }],
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#38414e' }],
        },
        {
          featureType: 'road',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#212a37' }],
        },
        {
          featureType: 'road',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#9ca5b3' }],
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#746855' }],
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#1f2835' }],
        },
        {
          featureType: 'road.highway',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#f3d19c' }],
        },
        {
          featureType: 'transit',
          elementType: 'geometry',
          stylers: [{ color: '#2f3948' }],
        },
        {
          featureType: 'transit.station',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d59563' }],
        },
        {
          featureType: 'poi',
          elementType: 'geometry',
          stylers: [{ color: '#283d6a' }],
        },
        {
          featureType: 'poi',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#6f9ba5' }],
        },
      ];
    }

    // Light theme (default Google Maps style)
    return [];
  }
}

export const mapboxService = new MapboxService();

