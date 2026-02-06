/**
 * MapScreen - Wrapper screen for MapView component
 * 
 * This screen uses the platform-specific MapView component:
 * - MapView.mobile.tsx for iOS/Android (Mapbox + Google + HERE)
 * - MapView.web.tsx for Web (Google Maps JS API)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { MapViewProps } from '../../components/common/MapView';
import { colors } from '../../theme';

interface MapScreenProps {
  navigation?: any;
  route?: {
    params?: {
      initialLocation?: {
        latitude: number;
        longitude: number;
      };
      mode?: 'selection' | 'navigation';
      onLocationSelected?: (location: { address: string; latitude: number; longitude: number }) => void;
    };
  };
}

export const MapScreen: React.FC<MapScreenProps> = ({ navigation, route }) => {
  const params = route?.params || {};
  
  const mapViewProps: MapViewProps = {
    navigation,
    initialLocation: params.initialLocation,
    onLocationSelected: params.onLocationSelected,
    mode: params.mode || 'selection',
    showSearch: true,
    showRouteControls: true,
  };

  return (
    <View style={styles.container}>
      <MapView {...mapViewProps} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default MapScreen;
