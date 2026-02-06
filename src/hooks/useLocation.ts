import { useState, useEffect } from 'react';
import { locationService, LocationCoordinates, LocationAddress } from '../services/location.service';

export const useLocation = () => {
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [address, setAddress] = useState<LocationAddress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      return location;
    } catch (err: any) {
      setError(err.message || 'Failed to get location');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentAddress = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const location = await locationService.getCurrentLocation();
      if (location) {
        const addr = await locationService.reverseGeocodeLocation(location);
        setAddress(addr);
        setCurrentLocation(location);
        return addr;
      }
      return null;
    } catch (err: any) {
      setError(err.message || 'Failed to get address');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeAddress = async (addressString: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const location = await locationService.geocodeAddress(addressString);
      setCurrentLocation(location);
      return location;
    } catch (err: any) {
      setError(err.message || 'Failed to geocode address');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reverseGeocode = async (coordinates: LocationCoordinates) => {
    try {
      setIsLoading(true);
      setError(null);
      const addr = await locationService.reverseGeocodeLocation(coordinates);
      setAddress(addr);
      return addr;
    } catch (err: any) {
      setError(err.message || 'Failed to reverse geocode');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDistance = (destination: LocationCoordinates) => {
    if (currentLocation) {
      return locationService.calculateDistance(currentLocation, destination);
    }
    return null;
  };

  return {
    currentLocation,
    address,
    isLoading,
    error,
    getCurrentLocation,
    getCurrentAddress,
    geocodeAddress,
    reverseGeocode,
    calculateDistance,
  };
};

