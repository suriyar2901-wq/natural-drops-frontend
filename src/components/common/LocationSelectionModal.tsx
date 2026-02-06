import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Button } from './Button';
import { locationService, AddressResult } from '../../services/location.service';
import { useAuth } from '../../hooks';

interface LocationSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (address: string, latitude?: number, longitude?: number) => void;
}

export const LocationSelectionModal: React.FC<LocationSelectionModalProps> = ({
  visible,
  onClose,
  onLocationSelected,
}) => {
  const { user } = useAuth();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedLatitude, setSelectedLatitude] = useState<number | undefined>();
  const [selectedLongitude, setSelectedLongitude] = useState<number | undefined>();

  /**
   * Validate latitude and longitude coordinates
   */
  const validateCoordinates = (lat?: number, lon?: number): boolean => {
    if (lat === undefined && lon === undefined) {
      return true;
    }
    if ((lat === undefined) !== (lon === undefined)) {
      return false;
    }
    if (lat !== undefined && lon !== undefined) {
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return false;
      }
      if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
        return false;
      }
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
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
        
        if (!validateCoordinates(result.latitude, result.longitude)) {
          console.error('❌ Invalid coordinates received');
          Alert.alert(
            'Location Error',
            'Received invalid location coordinates. Please try again.'
          );
          setIsLoadingLocation(false);
          return;
        }
        
        setSelectedAddress(result.address || result.formattedAddress || '');
        setSelectedLatitude(result.latitude);
        setSelectedLongitude(result.longitude);
      } else {
        Alert.alert(
          'Location Error',
          'Could not get your current location. Please try again.'
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
        'You don\'t have a saved address. Please use current location or add an address in your profile.'
      );
      return;
    }

    setSelectedAddress(savedAddress);
    setSelectedLatitude(undefined);
    setSelectedLongitude(undefined);
  };

  const handleConfirm = () => {
    if (!selectedAddress || selectedAddress.trim() === '') {
      Alert.alert('Location Required', 'Please select a delivery location.');
      return;
    }

    onLocationSelected(selectedAddress, selectedLatitude, selectedLongitude);
    // Reset state
    setSelectedAddress('');
    setSelectedLatitude(undefined);
    setSelectedLongitude(undefined);
    onClose();
  };

  const handleCancel = () => {
    setSelectedAddress('');
    setSelectedLatitude(undefined);
    setSelectedLongitude(undefined);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>📍 Select Delivery Location</Text>
          
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
            <View style={styles.selectedLocationContainer}>
              <Text style={styles.selectedLabel}>Selected Address:</Text>
              <View style={styles.addressDisplay}>
                <Text style={styles.addressText}>{selectedAddress}</Text>
                {selectedLatitude && selectedLongitude && (
                  <Text style={styles.coordinatesText}>
                    📍 {selectedLatitude.toFixed(6)}, {selectedLongitude.toFixed(6)}
                  </Text>
                )}
              </View>
              
              <View style={styles.changeButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedAddress('');
                    setSelectedLatitude(undefined);
                    setSelectedLongitude(undefined);
                  }}
                  style={styles.changeButton}
                >
                  <Text style={styles.changeButtonText}>🔄 Change Location</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={handleCancel}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title="Confirm Location"
              onPress={handleConfirm}
              disabled={!selectedAddress || selectedAddress.trim() === ''}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  selectionButtons: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  locationButton: {
    marginBottom: spacing.sm,
  },
  selectedLocationContainer: {
    marginBottom: spacing.lg,
  },
  selectedLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  addressDisplay: {
    backgroundColor: colors.gray50,
    padding: spacing.md,
    borderRadius: spacing.sm,
    marginBottom: spacing.md,
  },
  addressText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  coordinatesText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});

