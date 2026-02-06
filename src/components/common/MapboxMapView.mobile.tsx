/**
 * MapboxMapView.mobile.tsx
 * Mapbox GL Native wrapper for iOS and Android only
 * 
 * This file is automatically used by React Native bundler for iOS/Android builds
 * It will NOT be loaded on web, preventing native module import errors
 * 
 * Note: This requires @react-native-mapbox-gl/maps to be properly configured
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { mapboxService } from '../../services/mapbox.service';
import { colors } from '../../theme';

// Import Mapbox GL (only available on native platforms)
let MapboxGL: any = null;
try {
  MapboxGL = require('@react-native-mapbox-gl/maps').default;
} catch (e) {
  console.warn('Mapbox GL not available:', e);
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface MapboxMapViewProps {
  style?: any;
  region: Region;
  onRegionChange?: (region: Region) => void;
  onPress?: (event: any) => void;
  showUserLocation?: boolean;
  theme?: 'light' | 'dark' | 'custom';
  children?: React.ReactNode;
}

/**
 * MapboxMapView - Uses Mapbox on native, Google Maps on web
 */
export const MapboxMapView: React.FC<MapboxMapViewProps> = ({
  style,
  region,
  onRegionChange,
  onPress,
  showUserLocation = true,
  theme = 'light',
  children,
}) => {
  const mapRef = useRef<MapView>(null);

  // Use Google Maps fallback if Mapbox not available
  if (!MapboxGL) {
    return (
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={[styles.map, style]}
        region={region}
        onRegionChangeComplete={onRegionChange}
        onPress={onPress}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={true}
        showsCompass={true}
        customMapStyle={mapboxService.getGoogleMapsStyle(theme)}
      >
        {children}
      </MapView>
    );
  }

  // Use Mapbox on native platforms
  const styleUrl = mapboxService.getStyleUrl(theme);

  return (
    <MapboxGL.MapView
      ref={mapRef}
      styleURL={styleUrl}
      style={[styles.map, style]}
      onRegionDidChange={onRegionChange}
      onPress={onPress}
      logoEnabled={false}
      attributionEnabled={true}
    >
      {showUserLocation && (
        <MapboxGL.UserLocation
          visible={true}
          showsUserHeadingIndicator={true}
        />
      )}
      {children}
    </MapboxGL.MapView>
  );
};

/**
 * MapboxMarker - Custom marker component
 */
export const MapboxMarker: React.FC<{
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  type?: 'origin' | 'destination' | 'user';
}> = ({ coordinate, title, description, type = 'user' }) => {
  if (!MapboxGL) {
    // Fallback to react-native-maps Marker
    return (
      <Marker
        coordinate={coordinate}
        title={title}
        description={description}
        pinColor={type === 'origin' ? colors.primary : colors.secondary}
      />
    );
  }

  const icon = mapboxService.getCustomMarkerIcon(type);

  return (
    <MapboxGL.PointAnnotation
      id={`marker-${coordinate.latitude}-${coordinate.longitude}`}
      coordinate={[coordinate.longitude, coordinate.latitude]}
      title={title}
    >
      <MapboxGL.Callout title={title} />
    </MapboxGL.PointAnnotation>
  );
};

/**
 * MapboxPolyline - Route polyline component
 */
export const MapboxPolyline: React.FC<{
  coordinates: Array<{ latitude: number; longitude: number }>;
  strokeColor?: string;
  strokeWidth?: number;
}> = ({ coordinates, strokeColor = colors.primary, strokeWidth = 4 }) => {
  if (!MapboxGL) {
    // Fallback to react-native-maps Polyline
    return (
      <Polyline
        coordinates={coordinates}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
      />
    );
  }

  if (coordinates.length === 0) {
    return null;
  }

  // Convert to GeoJSON format for Mapbox
  const lineCoordinates = coordinates.map((coord) => [
    coord.longitude,
    coord.latitude,
  ]);

  return (
    <MapboxGL.ShapeSource
      id="route"
      shape={{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: lineCoordinates,
        },
      }}
    >
      <MapboxGL.LineLayer
        id="routeLine"
        style={{
          lineColor: strokeColor,
          lineWidth: strokeWidth,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </MapboxGL.ShapeSource>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  webMapPlaceholder: {
    backgroundColor: colors.gray50 || '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapMessage: {
    alignItems: 'center',
    padding: 20,
  },
  webMapText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary || '#333',
    marginBottom: 8,
  },
  webMapSubtext: {
    fontSize: 14,
    color: colors.textSecondary || '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  webMapCoordinates: {
    fontSize: 12,
    color: colors.textSecondary || '#999',
    fontFamily: 'monospace',
  },
});

