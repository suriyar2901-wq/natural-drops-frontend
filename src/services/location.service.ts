import { Platform, PermissionsAndroid, Alert } from 'react-native';

// Conditionally import expo-location (may not be available on web)
let Location: any = null;
if (Platform.OS !== 'web') {
  try {
    Location = require('expo-location');
  } catch (e) {
    console.warn('expo-location not available:', e);
  }
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface AddressResult {
  address: string;
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

class LocationService {
  /**
   * Request location permissions
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Web browser geolocation API
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            Alert.alert('Not Supported', 'Geolocation is not supported by your browser.');
            resolve(false);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => {
              Alert.alert(
                'Permission Denied',
                'Location permission is required. Please enable it in your browser settings.'
              );
              resolve(false);
            }
          );
        });
      } else if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to set delivery address.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // iOS - handled by expo-location
        if (!Location) {
          Alert.alert('Not Available', 'Location services are not available.');
          return false;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Validate latitude and longitude coordinates
   */
  private validateCoordinates(latitude: number, longitude: number): boolean {
    // Check if coordinates are valid numbers
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return false;
    }
    
    // Check if coordinates are not NaN or Infinity
    if (isNaN(latitude) || isNaN(longitude) || !isFinite(latitude) || !isFinite(longitude)) {
      return false;
    }
    
    // Validate latitude range: -90 to 90
    if (latitude < -90 || latitude > 90) {
      return false;
    }
    
    // Validate longitude range: -180 to 180
    if (longitude < -180 || longitude > 180) {
      return false;
    }
    
    return true;
  }

  /**
   * Get current location using GPS
   */
  async getCurrentLocation(): Promise<LocationCoordinates | null> {
    try {
      if (Platform.OS === 'web') {
        // Use browser geolocation API
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            Alert.alert('Not Supported', 'Geolocation is not supported by your browser.');
            resolve(null);
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lon = position.coords.longitude;
              
              // Validate coordinates
              if (!this.validateCoordinates(lat, lon)) {
                console.error('Invalid coordinates received:', { lat, lon });
                Alert.alert(
                  'Location Error',
                  'Received invalid location coordinates. Please try again.'
                );
                resolve(null);
                return;
              }
              
              resolve({
                latitude: lat,
                longitude: lon,
              });
            },
            (error) => {
              console.error('Geolocation error:', error);
              Alert.alert(
                'Location Error',
                error.message || 'Failed to get your current location. Please try again.'
              );
              resolve(null);
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }
          );
        });
      } else {
        // Native platforms - use expo-location
        if (!Location) {
          Alert.alert('Not Available', 'Location services are not available.');
          return null;
        }

        // Check if permission is granted
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const granted = await this.requestLocationPermission();
          if (!granted) {
            Alert.alert(
              'Permission Denied',
              'Location permission is required to use current location. Please enable it in settings.'
            );
            return null;
          }
        }

        // Get current position
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 15000,
        });

        const lat = location.coords.latitude;
        const lon = location.coords.longitude;
        
        // Validate coordinates
        if (!this.validateCoordinates(lat, lon)) {
          console.error('Invalid coordinates received:', { lat, lon });
          Alert.alert(
            'Location Error',
            'Received invalid location coordinates. Please try again.'
          );
          return null;
        }

        return {
          latitude: lat,
          longitude: lon,
        };
      }
    } catch (error: any) {
      console.error('Error getting current location:', error);
      Alert.alert(
        'Location Error',
        error.message || 'Failed to get your current location. Please try again.'
      );
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address using OpenStreetMap Nominatim API
   * (Free alternative to Google Maps API)
   */
  async reverseGeocode(coordinates: LocationCoordinates): Promise<string | null> {
    try {
      const { latitude, longitude } = coordinates;
      
      // Use OpenStreetMap Nominatim API (free, no API key required)
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NaturalDropsApp/1.0', // Required by Nominatim
        },
      });

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        // Build formatted address
        const addressParts: string[] = [];
        
        if (addr.house_number) addressParts.push(addr.house_number);
        if (addr.road) addressParts.push(addr.road);
        if (addr.suburb) addressParts.push(addr.suburb);
        if (addr.city || addr.town || addr.village) {
          addressParts.push(addr.city || addr.town || addr.village);
        }
        if (addr.state) addressParts.push(addr.state);
        if (addr.postcode) addressParts.push(addr.postcode);
        if (addr.country) addressParts.push(addr.country);
        
        return addressParts.join(', ') || data.display_name || 'Address not available';
      }
      
      return data.display_name || 'Address not available';
    } catch (error: any) {
      console.error('Error reverse geocoding:', error);
      // Return a basic address format if reverse geocoding fails
      return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
    }
  }

  /**
   * Get current location and convert to address
   */
  async getCurrentLocationWithAddress(): Promise<AddressResult | null> {
    try {
      const coordinates = await this.getCurrentLocation();
      if (!coordinates) {
        return null;
      }

      // Double-check coordinates are valid before reverse geocoding
      if (!this.validateCoordinates(coordinates.latitude, coordinates.longitude)) {
        console.error('Invalid coordinates before reverse geocoding:', coordinates);
        Alert.alert(
          'Location Error',
          'Invalid location coordinates. Please try again.'
        );
        return null;
      }

      const address = await this.reverseGeocode(coordinates);
      if (!address || !address.trim()) {
        // If reverse geocoding fails, return coordinates as address
        const fallbackAddress = `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
        return {
          address: fallbackAddress,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          formattedAddress: fallbackAddress,
        };
      }

      return {
        address,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        formattedAddress: address,
      };
    } catch (error: any) {
      console.error('Error getting location with address:', error);
      Alert.alert(
        'Location Error',
        'Failed to get your location and address. Please try again.'
      );
      return null;
    }
  }
}

export const locationService = new LocationService();
