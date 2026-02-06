import * as Location from 'expo-location';
import * as Camera from 'expo-camera';
import { Alert, Linking, Platform } from 'react-native';

// Try to import expo-notifications, but handle if not available in Expo Go
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.log('Notifications not available in Expo Go');
}

export const permissions = {
  // Request location permission
  requestLocationPermission: async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to use this feature. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  },

  // Request camera permission
  requestCameraPermission: async (): Promise<boolean> => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Camera permission is required to use this feature. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  },

  // Request notification permission
  requestNotificationPermission: async (): Promise<boolean> => {
    if (!Notifications) {
      console.log('Notifications not available. Use a development build for push notification support.');
      return false;
    }
    
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Notification permission is required to receive order updates. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  },

  // Check if location permission is granted
  hasLocationPermission: async (): Promise<boolean> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  },

  // Check if camera permission is granted
  hasCameraPermission: async (): Promise<boolean> => {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return false;
    }
  },

  // Check if notification permission is granted
  hasNotificationPermission: async (): Promise<boolean> => {
    if (!Notifications) {
      return false;
    }
    
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  },

  // Request all app permissions
  requestAllPermissions: async (): Promise<void> => {
    await permissions.requestNotificationPermission();
    // Location and camera permissions will be requested when needed
  },
};

