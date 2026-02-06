/**
 * HERE Routing API Service
 * Provides turn-by-turn routing, traffic-aware ETA, and route polyline generation
 * 
 * API Documentation: https://developer.here.com/documentation/routing-api
 */

export interface RouteRequest {
  origin: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
  };
  transportMode?: 'car' | 'truck' | 'pedestrian' | 'bicycle' | 'scooter';
  alternatives?: number; // Number of alternative routes (0-3)
  return?: string[]; // What to return: ['polyline', 'summary', 'guidance']
}

export interface RouteSummary {
  distance: number; // in meters
  duration: number; // in seconds
  baseDuration: number; // in seconds (without traffic)
  trafficDuration?: number; // in seconds (with traffic)
}

export interface Route {
  id: string;
  sections: Array<{
    id: string;
    type: string;
    polyline: string; // Encoded polyline
  }>;
  summary: RouteSummary;
}

export interface RoutingResponse {
  routes: Route[];
}

class RoutingService {
  private apiKey: string;
  private baseUrl = 'https://router.hereapi.com/v8';

  constructor() {
    // Get API key from environment or config
    this.apiKey = process.env.EXPO_PUBLIC_HERE_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ HERE API key not found. Please set EXPO_PUBLIC_HERE_API_KEY in your .env file');
    }
  }

  /**
   * Calculate route between two points
   */
  async calculateRoute(request: RouteRequest): Promise<RoutingResponse | null> {
    if (!this.apiKey) {
      throw new Error('HERE API key is not configured');
    }

    try {
      const {
        origin,
        destination,
        transportMode = 'car',
        alternatives = 0,
        return: returnFields = ['polyline', 'summary'],
      } = request;

      // Build waypoints
      const waypoints = [
        `${origin.latitude},${origin.longitude}`,
        `${destination.latitude},${destination.longitude}`,
      ];

      // Build query parameters
      const params = new URLSearchParams({
        apiKey: this.apiKey,
        transportMode,
        origin: waypoints[0],
        destination: waypoints[1],
        return: returnFields.join(','),
        alternatives: alternatives.toString(),
        units: 'metric',
      });

      const url = `${this.baseUrl}/routes?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `HERE Routing API error: ${response.status} - ${errorData.title || response.statusText}`
        );
      }

      const data = await response.json();
      return this.transformResponse(data);
    } catch (error: any) {
      console.error('Error calculating route:', error);
      throw error;
    }
  }

  /**
   * Transform HERE API response to our format
   */
  private transformResponse(data: any): RoutingResponse {
    const routes: Route[] = [];

    if (data.routes && Array.isArray(data.routes)) {
      data.routes.forEach((route: any, index: number) => {
        const sections: any[] = [];
        let totalDistance = 0;
        let totalDuration = 0;
        let totalBaseDuration = 0;

        if (route.sections && Array.isArray(route.sections)) {
          route.sections.forEach((section: any) => {
            // Extract polyline from section
            if (section.polyline) {
              sections.push({
                id: section.id || `section-${sections.length}`,
                type: section.type || 'driving',
                polyline: section.polyline,
              });
            }

            // Sum up distances and durations
            if (section.summary) {
              totalDistance += section.summary.length || 0;
              totalDuration += section.summary.duration || 0;
              totalBaseDuration += section.summary.baseDuration || section.summary.duration || 0;
            }
          });
        }

        routes.push({
          id: route.id || `route-${index}`,
          sections,
          summary: {
            distance: totalDistance,
            duration: totalDuration,
            baseDuration: totalBaseDuration,
            trafficDuration: totalDuration > totalBaseDuration ? totalDuration : undefined,
          },
        });
      });
    }

    return { routes };
  }

  /**
   * Decode polyline string to coordinates array
   * Uses the HERE polyline format (similar to Google's encoded polyline)
   * Supports both HERE's flexible polyline and standard encoded polyline
   */
  decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
    if (!encoded || encoded.length === 0) {
      return [];
    }

    const coordinates: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    try {
      while (index < encoded.length) {
        let shift = 0;
        let result = 0;
        let byte;

        // Decode latitude
        do {
          if (index >= encoded.length) break;
          byte = encoded.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
        } while (byte >= 0x20);

        const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
        lat += deltaLat;

        shift = 0;
        result = 0;

        // Decode longitude
        do {
          if (index >= encoded.length) break;
          byte = encoded.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
        } while (byte >= 0x20);

        const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
        lng += deltaLng;

        coordinates.push({
          latitude: lat * 1e-5,
          longitude: lng * 1e-5,
        });
      }
    } catch (error) {
      console.error('Error decoding polyline:', error);
      return [];
    }

    return coordinates;
  }

  /**
   * Format distance for display
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

export const routingService = new RoutingService();

