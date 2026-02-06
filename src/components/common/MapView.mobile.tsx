/**
 * MapView.mobile.tsx
 * Native map implementation for Android and iOS
 * Uses: Mapbox GL Native + Google Places Autocomplete + HERE Routing
 * 
 * This file is automatically used by React Native bundler for iOS/Android builds
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { colors, typography, spacing } from '../../theme';
import { GooglePlacesAutocomplete, PlaceDetails } from './GooglePlacesAutocomplete';
import { locationService } from '../../services/location.service';
import { routingService, Route } from '../../services/routing.service';
import { mapboxService } from '../../services/mapbox.service';
import { getMapConfig, validateMapConfig } from '../../config/map.config';
import { Card, Button } from './';

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
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>({
    latitude: initialLocation?.latitude || 12.9716, // Default: Bangalore
    longitude: initialLocation?.longitude || 77.5946,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<PlaceDetails | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Routing state
  const [route, setRoute] = useState<Route | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [destination, setDestination] = useState<PlaceDetails | null>(null);

  // UI state
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light');

  // Initialize map
  useEffect(() => {
    if (validation.isValid) {
      loadUserLocation();
    } else {
      Alert.alert(
        'Map Configuration Error',
        `Missing API keys: ${validation.missing.join(', ')}\n\nPlease configure your API keys in .env file.`
      );
    }
  }, []);

  /**
   * Load user's current location
   */
  const loadUserLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        setUserLocation(location);
        
        // Center map on user location if no initial location provided
        if (!initialLocation) {
          const newRegion: Region = {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
        }
      }
    } catch (error: any) {
      console.error('Error loading user location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  /**
   * Handle place selection from autocomplete
   */
  const handlePlaceSelected = (place: PlaceDetails) => {
    setSelectedLocation(place);

    // Center map on selected location
    const newRegion: Region = {
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 1000);

    // If in navigation mode and we have origin, calculate route
    if (mode === 'navigation' && userLocation) {
      setDestination(place);
      calculateRoute(userLocation, place);
    }

    // If in selection mode, call callback
    if (mode === 'selection' && onLocationSelected) {
      onLocationSelected({
        address: place.formattedAddress,
        latitude: place.latitude,
        longitude: place.longitude,
      });
    }
  };

  /**
   * Calculate route using HERE Routing API
   */
  const calculateRoute = async (
    origin: { latitude: number; longitude: number },
    dest: PlaceDetails
  ) => {
    if (!validation.isValid || !mapConfig.here.apiKey) {
      Alert.alert('Routing Unavailable', 'HERE API key is not configured.');
      return;
    }

    setIsCalculatingRoute(true);
    try {
      const response = await routingService.calculateRoute({
        origin,
        destination: {
          latitude: dest.latitude,
          longitude: dest.longitude,
        },
        transportMode: 'car',
        alternatives: 0,
        return: ['polyline', 'summary'],
      });

      if (response && response.routes.length > 0) {
        const selectedRoute = response.routes[0];
        setRoute(selectedRoute);

        // Decode polyline to coordinates
        if (selectedRoute.sections.length > 0) {
          const polyline = selectedRoute.sections[0].polyline;
          const coordinates = routingService.decodePolyline(polyline);
          setRouteCoordinates(coordinates);

          // Fit map to show entire route
          if (coordinates.length > 0) {
            fitMapToRoute(coordinates);
          }
        }
      }
    } catch (error: any) {
      console.error('Error calculating route:', error);
      Alert.alert('Routing Error', error.message || 'Failed to calculate route. Please try again.');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  /**
   * Fit map to show entire route
   */
  const fitMapToRoute = (coordinates: Array<{ latitude: number; longitude: number }>) => {
    if (coordinates.length === 0) return;

    const lats = coordinates.map((c) => c.latitude);
    const lngs = coordinates.map((c) => c.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      },
      animated: true,
    });
  };

  /**
   * Handle map press (for selection mode)
   */
  const handleMapPress = async (event: any) => {
    if (mode !== 'selection') return;

    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    try {
      // Reverse geocode to get address
      const address = await locationService.reverseGeocode({ latitude, longitude });
      
      const place: PlaceDetails = {
        placeId: `manual-${Date.now()}`,
        address: address || '',
        latitude,
        longitude,
        formattedAddress: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      };

      setSelectedLocation(place);
      
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
  };

  /**
   * Clear route
   */
  const clearRoute = () => {
    setRoute(null);
    setRouteCoordinates([]);
    setDestination(null);
  };

  /**
   * Toggle map theme
   */
  const toggleTheme = () => {
    setMapTheme(mapTheme === 'light' ? 'dark' : 'light');
  };

  // Dark map style (Mapbox-inspired)
  const darkMapStyle = mapboxService.getGoogleMapsStyle('dark');

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        toolbarEnabled={false}
        mapType="standard"
        customMapStyle={mapTheme === 'dark' ? darkMapStyle : undefined}
      >
        {/* User Location Marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            pinColor={colors.primary}
          />
        )}

        {/* Selected Location Marker */}
        {selectedLocation && (
          <Marker
            coordinate={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
            }}
            title={selectedLocation.formattedAddress}
            pinColor={colors.secondary}
          />
        )}

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}
      </MapView>

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

      {/* Route Info Card */}
      {route && showRouteControls && (
        <Card style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeTitle}>Route Information</Text>
            <TouchableOpacity onPress={clearRoute}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.routeDetails}>
            <View style={styles.routeDetailRow}>
              <Text style={styles.routeLabel}>Distance:</Text>
              <Text style={styles.routeValue}>
                {routingService.formatDistance(route.summary.distance)}
              </Text>
            </View>
            <View style={styles.routeDetailRow}>
              <Text style={styles.routeLabel}>Duration:</Text>
              <Text style={styles.routeValue}>
                {routingService.formatDuration(route.summary.duration)}
              </Text>
            </View>
            {route.summary.trafficDuration && (
              <View style={styles.routeDetailRow}>
                <Text style={styles.routeLabel}>With Traffic:</Text>
                <Text style={styles.routeValue}>
                  {routingService.formatDuration(route.summary.trafficDuration)}
                </Text>
              </View>
            )}
          </View>
        </Card>
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
        {mode === 'navigation' && userLocation && destination && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => calculateRoute(userLocation, destination)}
          >
            {isCalculatingRoute ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.actionButtonText}>🗺️</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={toggleTheme}
        >
          <Text style={styles.actionButtonText}>
            {mapTheme === 'dark' ? '☀️' : '🌙'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  autocomplete: {
    width: '100%',
  },
  routeCard: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    maxHeight: 200,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  routeTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  closeButton: {
    fontSize: typography.fontSize.xl,
    color: colors.textSecondary,
  },
  routeDetails: {
    gap: spacing.xs,
  },
  routeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeLabel: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  routeValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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

