/**
 * MapSelectionScreen - Simplified map screen for location selection
 * Used in checkout flow to select delivery location
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapScreen } from './MapScreen';

interface MapSelectionScreenProps {
  navigation: any;
  route: {
    params?: {
      onLocationSelected?: (location: { address: string; latitude: number; longitude: number }) => void;
    };
  };
}

export const MapSelectionScreen: React.FC<MapSelectionScreenProps> = ({ navigation, route }) => {
  const { onLocationSelected } = route.params || {};

  const handleLocationSelected = (location: { address: string; latitude: number; longitude: number }) => {
    if (onLocationSelected) {
      onLocationSelected(location);
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <MapScreen
        navigation={navigation}
        mode="selection"
        onLocationSelected={handleLocationSelected}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

