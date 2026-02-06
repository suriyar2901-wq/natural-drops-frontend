/**
 * MapView.web.tsx
 * Web-compatible map implementation using Google Maps JavaScript API
 * 
 * This file is automatically used by React Native bundler for Web builds
 * No native modules are imported here - only web-compatible code
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { GooglePlacesAutocomplete, PlaceDetails } from './GooglePlacesAutocomplete';
import { locationService } from '../../services/location.service';
import { getMapConfig, validateMapConfig } from '../../config/map.config';
import { Card } from './Card';
import { Button } from './Button';

const { width, height } = Dimensions.get('window');

export interface MapViewProps {
  navigation?: any;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
  onLocationSelected?: (location: { address: string; latitude: number; longitude: number }) => void;
  mode?: 'selection' | 'navigation';
  showSearch?: boolean;
  showRouteControls?: boolean;
}

// Declare Google Maps types for TypeScript
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export const MapView: React.FC<MapViewProps> = ({
  navigation,
  initialLocation,
  onLocationSelected,
  mode = 'selection',
  showSearch = true,
  showRouteControls = true,
}) => {
  const mapConfig = getMapConfig();
  const validation = validateMapConfig(mapConfig);

  // Map state
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PlaceDetails | null>(null);
  const [currentCenter, setCurrentCenter] = useState({
    latitude: initialLocation?.latitude || 12.9716,
    longitude: initialLocation?.longitude || 77.5946,
  });

  // Initialize Google Maps on web
  useEffect(() => {
    if (typeof window !== 'undefined' && mapConfig.google.mapsApiKey) {
      loadGoogleMaps();
    }
  }, []);

  /**
   * Load Google Maps JavaScript API
   */
  const loadGoogleMaps = () => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for script to load
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          initializeMap();
        }
      }, 100);
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapConfig.google.mapsApiKey}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;
    
    window.initMap = initializeMap;
    
    script.onerror = () => {
      Alert.alert('Map Error', 'Failed to load Google Maps. Please check your API key.');
    };

    document.head.appendChild(script);
  };

  /**
   * Initialize Google Maps instance
   */
  const initializeMap = () => {
    if (!mapContainerRef.current || !window.google || !window.google.maps) {
      return;
    }

    const center = new window.google.maps.LatLng(
      currentCenter.latitude,
      currentCenter.longitude
    );

    const mapOptions = {
      center,
      zoom: 13,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    };

    const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);

    // Add click listener for selection mode
    if (mode === 'selection') {
      map.addListener('click', async (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        try {
          const address = await locationService.reverseGeocode({ latitude: lat, longitude: lng });
          
          const place: PlaceDetails = {
            placeId: `manual-${Date.now()}`,
            address: address || '',
            latitude: lat,
            longitude: lng,
            formattedAddress: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          };

          setSelectedLocation(place);
          addMarker(map, lat, lng, place.formattedAddress);
          
          if (onLocationSelected) {
            onLocationSelected({
              address: place.formattedAddress,
              latitude: place.latitude,
              longitude: place.longitude,
            });
          }
        } catch (error: any) {
          console.error('Error reverse geocoding:', error);
        }
      });
    }

    mapInstanceRef.current = map;
    setIsMapLoaded(true);
  };

  /**
   * Add marker to map
   */
  const addMarker = (map: any, lat: number, lng: number, title: string) => {
    if (!window.google || !window.google.maps) return;

    // Remove existing markers (simple implementation)
    // In production, you'd want to track markers properly
    
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map,
      title,
      animation: window.google.maps.Animation.DROP,
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `<div style="padding: 8px;"><strong>${title}</strong></div>`,
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    return marker;
  };

  /**
   * Load user's current location
   */
  const loadUserLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        setUserLocation(location);
        setCurrentCenter(location);
        
        if (mapInstanceRef.current) {
          const center = new window.google.maps.LatLng(location.latitude, location.longitude);
          mapInstanceRef.current.setCenter(center);
          mapInstanceRef.current.setZoom(15);
          
          // Add user location marker
          addMarker(mapInstanceRef.current, location.latitude, location.longitude, 'Your Location');
        }
      }
    } catch (error: any) {
      console.error('Error loading user location:', error);
      Alert.alert('Location Error', 'Failed to get your location. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  /**
   * Handle place selection from autocomplete
   */
  const handlePlaceSelected = (place: PlaceDetails) => {
    setSelectedLocation(place);
    setCurrentCenter({ latitude: place.latitude, longitude: place.longitude });

    if (mapInstanceRef.current && window.google) {
      const center = new window.google.maps.LatLng(place.latitude, place.longitude);
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(15);
      
      // Add marker for selected location
      addMarker(mapInstanceRef.current, place.latitude, place.longitude, place.formattedAddress);
    }

    if (mode === 'selection' && onLocationSelected) {
      onLocationSelected({
        address: place.formattedAddress,
        latitude: place.latitude,
        longitude: place.longitude,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Map Container */}
      <View style={styles.mapContainer}>
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
            minHeight: height,
          }}
        />
        {!isMapLoaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      {showSearch && validation.isValid && (
        <View style={styles.searchContainer}>
          <GooglePlacesAutocomplete
            onPlaceSelected={handlePlaceSelected}
            placeholder="Search for an address..."
            apiKey={mapConfig.google.placesApiKey}
            countryRestriction="IN"
            style={styles.autocomplete}
          />
        </View>
      )}

      {/* Selected Location Info */}
      {selectedLocation && mode === 'selection' && (
        <Card style={styles.locationCard}>
          <Text style={styles.locationTitle}>Selected Location</Text>
          <Text style={styles.locationAddress} numberOfLines={2}>
            {selectedLocation.formattedAddress}
          </Text>
          <Text style={styles.locationCoordinates}>
            {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </Text>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={loadUserLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.actionButtonText}>📍</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  autocomplete: {
    width: '100%',
  },
  locationCard: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  locationTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  locationAddress: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  locationCoordinates: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  actionButtons: {
    position: 'absolute',
    right: spacing.md,
    bottom: 150,
    zIndex: 1000,
    gap: spacing.sm,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: 20,
  },
});

export default MapView;

