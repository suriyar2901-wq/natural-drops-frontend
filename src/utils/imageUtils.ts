import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { validators, validationMessages } from './validators';

/**
 * Convert image URI to base64 data URL
 */
export const convertImageToBase64 = async (uri: string): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('❌ Base64 conversion failed:', error);
    throw error;
  }
};

/**
 * Pick image from gallery or camera
 */
export const pickProfileImage = async (): Promise<string | null> => {
  try {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to upload profile photo.',
        [{ text: 'OK' }]
      );
      return null;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile photos
      quality: 0.7, // Good quality but not too large
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const uri = asset.uri;
      
      // Convert to base64
      const base64 = await convertImageToBase64(uri);
      
      // Validate image size (max 5MB)
      if (!validators.imageSize(base64, 5)) {
        Alert.alert('Error', validationMessages.imageSize);
        return null;
      }
      
      return base64;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error picking image:', error);
    Alert.alert('Error', 'Failed to pick image');
    return null;
  }
};

/**
 * Format date for date picker (YYYY-MM-DD)
 */
export const formatDateForPicker = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse date from picker format (YYYY-MM-DD)
 */
export const parseDateFromPicker = (dateString: string): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date;
};

