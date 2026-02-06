import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Card } from './Card';
import { Button } from './Button';
import { locationService, AddressResult } from '../../services/location.service';
import { useAuth } from '../../hooks';

interface DeliveryLocationSelectorProps {
  onLocationSelected: (address: string, latitude?: number, longitude?: number) => void;
  initialAddress?: string;
}

export const DeliveryLocationSelector: React.FC<DeliveryLocationSelectorProps> = ({
  onLocationSelected,
  initialAddress,
}) => {
  const { user } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState<string>(initialAddress || '');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAddress, setEditedAddress] = useState<string>('');
  const [locationData, setLocationData] = useState<{ latitude?: number; longitude?: number }>({});

  /**
   * Validate latitude and longitude coordinates
   */
  const validateCoordinates = (lat?: number, lon?: number): boolean => {
    // If both are undefined, that's valid (saved address without GPS)
    if (lat === undefined && lon === undefined) {
      return true;
    }
    
    // If one is provided, both must be provided
    if ((lat === undefined) !== (lon === undefined)) {
      return false;
    }
    
    // If both are provided, validate them
    if (lat !== undefined && lon !== undefined) {
      // Check if they are valid numbers
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return false;
      }
      
      // Check if they are not NaN or Infinity
      if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
        return false;
      }
      
      // Validate latitude range: -90 to 90
      if (lat < -90 || lat > 90) {
        return false;
      }
      
      // Validate longitude range: -180 to 180
      if (lon < -180 || lon > 180) {
        return false;
      }
    }
    
    return true;
  };

  const handleUseCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      console.log('📍 Requesting current location...');
      const result = await locationService.getCurrentLocationWithAddress();
      
      if (result) {
        console.log('✅ Location obtained:', result);
        
        // Validate coordinates before using them
        if (!validateCoordinates(result.latitude, result.longitude)) {
          console.error('❌ Invalid coordinates received:', { lat: result.latitude, lon: result.longitude });
          Alert.alert(
            'Location Error',
            'Received invalid location coordinates. Please try again or use your saved address.'
          );
          setIsLoadingLocation(false);
          return;
        }
        
        setSelectedAddress(result.address || result.formattedAddress || '');
        setEditedAddress(result.address || result.formattedAddress || '');
        setLocationData({
          latitude: result.latitude,
          longitude: result.longitude,
        });
        onLocationSelected(result.address || result.formattedAddress || '', result.latitude, result.longitude);
      } else {
        Alert.alert(
          'Location Error',
          'Could not get your current location. Please try again or use your saved address.'
        );
      }
    } catch (error: any) {
      console.error('❌ Error getting location:', error);
      Alert.alert(
        'Location Error',
        error.message || 'Failed to get your location. Please try again.'
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleUseSavedAddress = () => {
    const savedAddress = user?.address || '';
    if (!savedAddress) {
      Alert.alert(
        'No Saved Address',
        'You don\'t have a saved address. Please use current location or add an address in your profile.',
        [
          {
            text: 'OK',
          },
          {
            text: 'Add Address',
            onPress: () => {
              // Navigate to profile to add address
              // This would need navigation prop or context
            },
          },
        ]
      );
      return;
    }

    setSelectedAddress(savedAddress);
    setEditedAddress(savedAddress);
    setLocationData({}); // No GPS coordinates for saved address
    onLocationSelected(savedAddress);
  };

  const handleEditAddress = () => {
    setIsEditing(true);
    setEditedAddress(selectedAddress);
  };

  const handleSaveEditedAddress = () => {
    if (!editedAddress.trim()) {
      Alert.alert('Invalid Address', 'Please enter a valid delivery address.');
      return;
    }

    // Validate coordinates if they exist
    if (locationData.latitude !== undefined && locationData.longitude !== undefined) {
      if (!validateCoordinates(locationData.latitude, locationData.longitude)) {
        Alert.alert(
          'Invalid Coordinates',
          'The location coordinates are invalid. Please use current location again or clear coordinates.'
        );
        return;
      }
    }

    setSelectedAddress(editedAddress);
    setIsEditing(false);
    // Only pass coordinates if they are valid
    const validLat = locationData.latitude !== undefined && validateCoordinates(locationData.latitude, locationData.longitude) 
      ? locationData.latitude 
      : undefined;
    const validLon = locationData.longitude !== undefined && validateCoordinates(locationData.latitude, locationData.longitude)
      ? locationData.longitude
      : undefined;
    onLocationSelected(editedAddress, validLat, validLon);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedAddress(selectedAddress);
  };

  return (
    <Card style={styles.container}>
      <Text style={styles.title}>📍 Delivery Location</Text>
      
      {!selectedAddress ? (
        <View style={styles.selectionButtons}>
          <Button
            title={isLoadingLocation ? 'Getting Location...' : '📍 Use Current Location'}
            onPress={handleUseCurrentLocation}
            loading={isLoadingLocation}
            variant="outline"
            style={styles.locationButton}
            disabled={isLoadingLocation}
          />
          <Button
            title="🏠 Use Saved Address"
            onPress={handleUseSavedAddress}
            variant="outline"
            style={styles.locationButton}
          />
        </View>
      ) : (
        <View style={styles.addressContainer}>
          <View style={styles.addressHeader}>
            <Text style={styles.addressLabel}>Selected Address:</Text>
            <TouchableOpacity onPress={handleEditAddress} style={styles.editButton}>
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>
          
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.addressInput}
                value={editedAddress}
                onChangeText={setEditedAddress}
                placeholder="Enter delivery address"
                multiline
                numberOfLines={3}
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  onPress={handleCancelEdit}
                  style={[styles.editActionButton, styles.cancelButton]}
                >
                  <Text style={styles.editActionText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveEditedAddress}
                  style={[styles.editActionButton, styles.saveButton]}
                >
                  <Text style={[styles.editActionText, styles.saveButtonText]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.addressDisplay}>
              <Text style={styles.addressText}>{selectedAddress}</Text>
              {locationData.latitude && locationData.longitude && (
                <Text style={styles.coordinatesText}>
                  📍 {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.changeButtons}>
            <TouchableOpacity
              onPress={() => {
                setSelectedAddress('');
                setLocationData({});
                setIsEditing(false);
              }}
              style={styles.changeButton}
            >
              <Text style={styles.changeButtonText}>🔄 Change Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  selectionButtons: {
    gap: spacing.sm,
  },
  locationButton: {
    marginBottom: spacing.sm,
  },
  addressContainer: {
    marginTop: spacing.sm,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addressLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  editButton: {
    padding: spacing.xs,
  },
  editButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  addressDisplay: {
    backgroundColor: colors.gray50,
    padding: spacing.md,
    borderRadius: spacing.sm,
    marginBottom: spacing.sm,
  },
  addressText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  coordinatesText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  editContainer: {
    marginBottom: spacing.sm,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: spacing.sm,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  editActionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
  },
  cancelButton: {
    backgroundColor: colors.gray200,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  editActionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  saveButtonText: {
    color: colors.white,
  },
  changeButtons: {
    marginTop: spacing.xs,
  },
  changeButton: {
    padding: spacing.xs,
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
});

