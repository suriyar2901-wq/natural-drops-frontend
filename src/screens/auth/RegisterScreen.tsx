import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Image, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, typography, spacing } from '../../theme';
import { Button, Input, DatePicker } from '../../components/common';
import { AutocompleteInput, AutocompleteOption } from '../../components/common/AutocompleteInput';
import { useAuth } from '../../hooks';
import { UserRole, Gender } from '../../types';
import { validators, validationMessages } from '../../utils/validators';
import { pickProfileImage, formatDateForPicker } from '../../utils/imageUtils';
import { locationApiService, PincodeLocation } from '../../services/locationApi.service';

export const RegisterScreen = ({ navigation }: any) => {
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    role: UserRole.BUYER,
    // New fields
    gender: '',
    dateOfBirth: '',
    alternatePhone: '',
    profilePhoto: '',
    // Structured address (required)
    houseDoorNo: '',
    streetArea: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    landmark: '',
    companyName: '',
    companyCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePickerLoading, setImagePickerLoading] = useState(false);
  
  // Location autocomplete states
  const [citySuggestions, setCitySuggestions] = useState<AutocompleteOption[]>([]);
  const [districtSuggestions, setDistrictSuggestions] = useState<AutocompleteOption[]>([]);
  const [stateSuggestions, setStateSuggestions] = useState<AutocompleteOption[]>([]);
  const [isLoadingCity, setIsLoadingCity] = useState(false);
  const [isLoadingDistrict, setIsLoadingDistrict] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);
  const [pincodeError, setPincodeError] = useState<string>('');

  // Inject web-specific CSS for scrolling
  useEffect(() => {
    if (Platform.OS === 'web') {
      const styleId = 'register-scroll-styles';
      // Remove existing style if present
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
      
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Ensure KeyboardAvoidingView allows scrolling */
        [data-testid="register-keyboard-view"] {
          display: flex !important;
          flex-direction: column !important;
          height: 100vh !important;
          max-height: 100vh !important;
          overflow: hidden !important;
          position: relative !important;
        }
        /* Make ScrollView scrollable - this is the key fix */
        [data-nativeid="register-scroll-view"],
        [data-testid="register-scroll-view"] {
          flex: 1 !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch !important;
          height: 100% !important;
          max-height: 100% !important;
          position: relative !important;
        }
        /* Ensure content container allows natural height and scrolling */
        [data-nativeid="register-scroll-view"] > div,
        [data-testid="register-scroll-view"] > div {
          min-height: auto !important;
          height: auto !important;
          /* Allow content to extend beyond viewport */
          display: flex !important;
          flex-direction: column !important;
        }
        /* Force scrollbar to be visible on web */
        [data-nativeid="register-scroll-view"]::-webkit-scrollbar,
        [data-testid="register-scroll-view"]::-webkit-scrollbar {
          width: 8px !important;
        }
        [data-nativeid="register-scroll-view"]::-webkit-scrollbar-track,
        [data-testid="register-scroll-view"]::-webkit-scrollbar-track {
          background: #f1f1f1 !important;
        }
        [data-nativeid="register-scroll-view"]::-webkit-scrollbar-thumb,
        [data-testid="register-scroll-view"]::-webkit-scrollbar-thumb {
          background: #888 !important;
          border-radius: 4px !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        const styleToRemove = document.getElementById(styleId);
        if (styleToRemove) {
          document.head.removeChild(styleToRemove);
        }
      };
    }
  }, []);

  const handlePickImage = async () => {
    setImagePickerLoading(true);
    try {
      const base64 = await pickProfileImage();
      if (base64) {
        setFormData({ ...formData, profilePhoto: base64 });
        if (errors.profilePhoto) {
          setErrors({ ...errors, profilePhoto: '' });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setImagePickerLoading(false);
    }
  };

  // Handle pincode change with auto-fill
  const handlePincodeChange = async (pincode: string) => {
    const cleanPincode = pincode.replace(/[^0-9]/g, '');
    setFormData({ ...formData, pincode: cleanPincode });
    setPincodeError('');
    
    if (errors.pincode) {
      setErrors({ ...errors, pincode: '' });
    }

    // Auto-fill when 6 digits are entered
    if (cleanPincode.length === 6) {
      setIsLoadingPincode(true);
      try {
        const location = await locationApiService.getLocationByPincode(cleanPincode);
        if (location) {
          setFormData(prev => ({
            ...prev,
            pincode: cleanPincode,
            city: location.city,
            district: location.district,
            state: location.state,
          }));
          // Clear errors for auto-filled fields
          setErrors(prev => ({
            ...prev,
            city: '',
            district: '',
            state: '',
            pincode: '',
          }));
        } else {
          setPincodeError('Invalid pincode. Please enter a valid 6-digit pincode.');
        }
      } catch (error) {
        console.error('Error fetching pincode location:', error);
        setPincodeError('Failed to fetch location. Please enter manually.');
      } finally {
        setIsLoadingPincode(false);
      }
    }
  };

  // Handle city autocomplete
  const handleCityChange = useCallback(async (text: string) => {
    setFormData(prev => ({ ...prev, city: text }));
    setErrors(prev => {
      if (prev.city) {
        const newErrors = { ...prev };
        delete newErrors.city;
        return newErrors;
      }
      return prev;
    });
    
    if (text.length >= 1) {
      setIsLoadingCity(true);
      try {
        const suggestions = await locationApiService.getLocationSuggestions(text, 'city');
        setCitySuggestions(suggestions.map(s => ({ name: s.name, type: s.type, state: s.state })));
      } catch (error) {
        console.error('Error fetching city suggestions:', error);
      } finally {
        setIsLoadingCity(false);
      }
    } else {
      setCitySuggestions([]);
    }
  }, []);

  // Handle district autocomplete
  const handleDistrictChange = useCallback(async (text: string) => {
    setFormData(prev => ({ ...prev, district: text }));
    setErrors(prev => {
      if (prev.district) {
        const newErrors = { ...prev };
        delete newErrors.district;
        return newErrors;
      }
      return prev;
    });
    
    if (text.length >= 1) {
      setIsLoadingDistrict(true);
      try {
        const suggestions = await locationApiService.getLocationSuggestions(text, 'district');
        setDistrictSuggestions(suggestions.map(s => ({ name: s.name, type: s.type, state: s.state })));
      } catch (error) {
        console.error('Error fetching district suggestions:', error);
      } finally {
        setIsLoadingDistrict(false);
      }
    } else {
      setDistrictSuggestions([]);
    }
  }, []);

  // Handle state autocomplete
  const handleStateChange = useCallback(async (text: string) => {
    setFormData(prev => ({ ...prev, state: text }));
    setErrors(prev => {
      if (prev.state) {
        const newErrors = { ...prev };
        delete newErrors.state;
        return newErrors;
      }
      return prev;
    });
    
    if (text.length >= 1) {
      setIsLoadingState(true);
      try {
        const suggestions = await locationApiService.getLocationSuggestions(text, 'state');
        setStateSuggestions(suggestions.map(s => ({ name: s.name, type: s.type, state: s.state })));
      } catch (error) {
        console.error('Error fetching state suggestions:', error);
      } finally {
        setIsLoadingState(false);
      }
    } else {
      setStateSuggestions([]);
    }
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Username
    if (!validators.required(formData.username)) {
      newErrors.username = validationMessages.required;
    } else if (!validators.username(formData.username)) {
      newErrors.username = validationMessages.username;
    }

    // Password
    if (!validators.required(formData.password)) {
      newErrors.password = validationMessages.required;
    } else if (!validators.password(formData.password)) {
      newErrors.password = validationMessages.password;
    }

    // Phone (required)
    if (!validators.required(formData.phone)) {
      newErrors.phone = validationMessages.required;
    } else if (!validators.phone(formData.phone)) {
      newErrors.phone = validationMessages.phone;
    }

    // Alternate phone (optional but must be valid if provided)
    if (formData.alternatePhone && !validators.phone(formData.alternatePhone)) {
      newErrors.alternatePhone = validationMessages.phone;
    }

    // Date of birth (optional but must be valid if provided)
    if (formData.dateOfBirth && !validators.dateOfBirth(formData.dateOfBirth)) {
      newErrors.dateOfBirth = validationMessages.dateOfBirth;
    }

    // Structured address fields (all required)
    if (!validators.required(formData.houseDoorNo)) {
      newErrors.houseDoorNo = validationMessages.required;
    }

    if (!validators.required(formData.streetArea)) {
      newErrors.streetArea = validationMessages.required;
    }

    if (!validators.required(formData.city)) {
      newErrors.city = validationMessages.required;
    }

    if (!validators.required(formData.district)) {
      newErrors.district = validationMessages.required;
    }

    if (!validators.required(formData.state)) {
      newErrors.state = validationMessages.required;
    }

    if (!validators.required(formData.pincode)) {
      newErrors.pincode = validationMessages.required;
    } else if (!validators.pincode(formData.pincode)) {
      newErrors.pincode = validationMessages.pincode;
    }

    // Profile photo (optional but must be valid if provided)
    if (formData.profilePhoto && !validators.image(formData.profilePhoto)) {
      newErrors.profilePhoto = validationMessages.image;
    } else if (formData.profilePhoto && !validators.imageSize(formData.profilePhoto, 5)) {
      newErrors.profilePhoto = validationMessages.imageSize;
    }

    if (formData.role === UserRole.SELLER && formData.companyName.trim().length < 2) {
      newErrors.companyName = 'Company name is required';
    }
    if (formData.role === UserRole.BUYER && formData.companyCode.trim().length < 3) {
      newErrors.companyCode = 'Seller company code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting');
      return;
    }

    const registerData = {
      username: formData.username.trim(),
      password: formData.password,
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim(),
      role: formData.role,
      gender: formData.gender || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      alternatePhone: formData.alternatePhone.trim() || undefined,
      profilePhoto: formData.profilePhoto || undefined,
      houseDoorNo: formData.houseDoorNo.trim(),
      streetArea: formData.streetArea.trim(),
      city: formData.city.trim(),
      district: formData.district.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      landmark: formData.landmark.trim() || undefined,
      companyName: formData.role === UserRole.SELLER ? formData.companyName.trim() : undefined,
      companyCode: formData.role === UserRole.BUYER ? formData.companyCode.trim() : undefined,
    };

    const result = await register(registerData);
    
    if (result.success) {
      const goToLogin = () => {
        navigation.replace('Login');
      };

      let message = `Welcome ${registerData.username}. Your account was created successfully.`;
      if (formData.role === UserRole.SELLER) {
        message += result.user?.companyCode
          ? ` Your company code is ${result.user.companyCode}. Share this code with buyers so they can join your shop.`
          : ' Your company code is ready.';
        message += ' Your seller account is active. You can log in now. Only an admin can deactivate it later.';
      } else if (formData.role === UserRole.BUYER) {
        message += ` You are linked to seller code ${formData.companyCode.trim()}. You can log in now and you will see only that seller's products.`;
      } else {
        message += ' You can log in now.';
      }
      message += ' Please go to Login.';

      Alert.alert('Account created successfully', message, [
        { text: 'Go to Login', onPress: goToLogin },
      ]);
    } else {
      const errorMessage = result.error || 'Please try again';
      Alert.alert('Registration Failed', errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      enabled={Platform.OS !== 'web'} // Disable on web as it can interfere with scrolling
      {...(Platform.OS === 'web' ? { testID: 'register-keyboard-view' } : {})}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        bounces={Platform.OS !== 'web'}
        alwaysBounceVertical={false}
        scrollEnabled={true}
        // Web-specific: ensure scrolling works
        {...(Platform.OS === 'web' ? {
          // @ts-ignore - Web-specific props
          nativeID: 'register-scroll-view',
          testID: 'register-scroll-view',
        } : {})}
        {...(Platform.OS === 'ios' ? {
          contentInsetAdjustmentBehavior: 'automatic' as const,
        } : {})}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register to get started</Text>
        </View>

        <View style={styles.form}>
          {/* Profile Photo */}
          <View style={styles.photoSection}>
            <Text style={styles.label}>Profile Photo (Optional)</Text>
            <TouchableOpacity 
              style={styles.photoContainer}
              onPress={handlePickImage}
              disabled={imagePickerLoading}
            >
              {formData.profilePhoto ? (
                <Image source={{ uri: formData.profilePhoto }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>📷</Text>
                  <Text style={styles.photoPlaceholderLabel}>Tap to add photo</Text>
                </View>
              )}
            </TouchableOpacity>
            {errors.profilePhoto && <Text style={styles.errorText}>{errors.profilePhoto}</Text>}
          </View>

          <Input
            label="Username *"
            value={formData.username}
            onChangeText={(text) => {
              setFormData({ ...formData, username: text });
              if (errors.username) setErrors({ ...errors, username: '' });
            }}
            placeholder="Choose a username"
            autoCapitalize="none"
            error={errors.username}
          />

          <Input
            label="Password *"
            value={formData.password}
            onChangeText={(text) => {
              setFormData({ ...formData, password: text });
              if (errors.password) setErrors({ ...errors, password: '' });
            }}
            placeholder="Choose a password"
            secureTextEntry
            showPasswordToggle
            error={errors.password}
          />

          <Input
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Enter your email (optional)"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="Phone Number *"
            value={formData.phone}
            onChangeText={(text) => {
              setFormData({ ...formData, phone: text.replace(/[^0-9]/g, '') });
              if (errors.phone) setErrors({ ...errors, phone: '' });
            }}
            placeholder="Enter 10-digit phone number"
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.phone}
          />

          <Input
            label="Alternate Phone Number"
            value={formData.alternatePhone}
            onChangeText={(text) => {
              setFormData({ ...formData, alternatePhone: text.replace(/[^0-9]/g, '') });
              if (errors.alternatePhone) setErrors({ ...errors, alternatePhone: '' });
            }}
            placeholder="Enter alternate phone (optional)"
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.alternatePhone}
          />

          {/* Gender Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Gender (Optional)</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.gender}
                onValueChange={(itemValue) => setFormData({ ...formData, gender: itemValue })}
                style={styles.picker}
              >
                <Picker.Item label="Select Gender" value="" />
                <Picker.Item label="Male" value={Gender.MALE} />
                <Picker.Item label="Female" value={Gender.FEMALE} />
                <Picker.Item label="Other" value={Gender.OTHER} />
              </Picker>
            </View>
          </View>

          {/* Date of Birth */}
          <DatePicker
            label="Date of Birth (Optional)"
            value={formData.dateOfBirth}
            onChange={(date) => {
              setFormData({ ...formData, dateOfBirth: date });
              if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: '' });
            }}
            maxDate={formatDateForPicker(new Date())} // Today's date in YYYY-MM-DD format
            placeholder="Select date of birth"
          />
          {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}

          {/* Address Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Address Details *</Text>
          </View>

          <Input
            label="House / Door No *"
            value={formData.houseDoorNo}
            onChangeText={(text) => {
              setFormData({ ...formData, houseDoorNo: text });
              if (errors.houseDoorNo) setErrors({ ...errors, houseDoorNo: '' });
            }}
            placeholder="Enter house/door number"
            error={errors.houseDoorNo}
          />

          <Input
            label="Street / Area *"
            value={formData.streetArea}
            onChangeText={(text) => {
              setFormData({ ...formData, streetArea: text });
              if (errors.streetArea) setErrors({ ...errors, streetArea: '' });
            }}
            placeholder="Enter street/area"
            error={errors.streetArea}
          />

          <AutocompleteInput
            label="City *"
            value={formData.city}
            onChangeText={handleCityChange}
            onSelect={(option) => {
              setFormData(prev => ({ ...prev, city: option.name }));
              if (option.state && !formData.state) {
                setFormData(prev => ({ ...prev, state: option.state || '' }));
              }
            }}
            placeholder="Start typing city name..."
            error={errors.city}
            suggestions={citySuggestions}
            isLoading={isLoadingCity}
            autoCapitalize="words"
          />

          <AutocompleteInput
            label="District *"
            value={formData.district}
            onChangeText={handleDistrictChange}
            onSelect={(option) => {
              setFormData(prev => ({ ...prev, district: option.name }));
              if (option.state && !formData.state) {
                setFormData(prev => ({ ...prev, state: option.state || '' }));
              }
            }}
            placeholder="Start typing district name..."
            error={errors.district}
            suggestions={districtSuggestions}
            isLoading={isLoadingDistrict}
            autoCapitalize="words"
          />

          <AutocompleteInput
            label="State *"
            value={formData.state}
            onChangeText={handleStateChange}
            onSelect={(option) => {
              setFormData(prev => ({ ...prev, state: option.name }));
            }}
            placeholder="Start typing state name..."
            error={errors.state}
            suggestions={stateSuggestions}
            isLoading={isLoadingState}
            autoCapitalize="words"
          />

          <View style={styles.pincodeContainer}>
            <Input
              label="Pincode *"
              value={formData.pincode}
              onChangeText={handlePincodeChange}
              placeholder="Enter 6-digit pincode"
              keyboardType="phone-pad"
              maxLength={6}
              error={errors.pincode || pincodeError}
            />
            {isLoadingPincode && (
              <View style={styles.pincodeLoader}>
                <Text style={styles.pincodeLoaderText}>Fetching location...</Text>
              </View>
            )}
            {formData.pincode.length === 6 && !isLoadingPincode && !pincodeError && (
              <Text style={styles.pincodeSuccess}>✓ Location auto-filled</Text>
            )}
          </View>

          <Input
            label="Landmark (Optional)"
            value={formData.landmark}
            onChangeText={(text) => setFormData({ ...formData, landmark: text })}
            placeholder="Enter landmark (optional)"
          />

          {/* Role Selector */}
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Account Type *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.role}
                onValueChange={(itemValue) => setFormData({ ...formData, role: itemValue })}
                style={styles.picker}
              >
                <Picker.Item label="🛒 Buyer" value={UserRole.BUYER} />
                <Picker.Item label="🏪 Seller" value={UserRole.SELLER} />
                <Picker.Item label="👨‍💼 Admin" value={UserRole.ADMIN} />
              </Picker>
            </View>
          </View>

          {formData.role === UserRole.SELLER && (
            <Input
              label="Company name *"
              value={formData.companyName}
              onChangeText={(text) => setFormData({ ...formData, companyName: text })}
              placeholder="Your water company name"
              error={errors.companyName}
            />
          )}
          {formData.role === UserRole.BUYER && (
            <Input
              label="Seller company code *"
              value={formData.companyCode}
              onChangeText={(text) => setFormData({ ...formData, companyCode: text.toUpperCase() })}
              placeholder="Example: RAVI-0001"
              autoCapitalize="characters"
              error={errors.companyCode}
            />
          )}

          <Button
            title="Register"
            onPress={handleRegister}
            loading={isLoading}
            fullWidth
            style={styles.registerButton}
          />

          <Button
            title="Already have an account? Login"
            onPress={() => navigation.navigate('Login')}
            variant="text"
            fullWidth
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xl * 6, // Extra padding at bottom so Register button is always visible (192px)
    // Ensure content can extend beyond viewport for proper scrolling
    ...Platform.select({
      web: {
        // Web: Allow natural content height - no constraints
      },
      default: {
        // Mobile: Use flexGrow to ensure proper layout
        flexGrow: 1,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  photoSection: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.gray100,
    marginTop: spacing.sm,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
  },
  photoPlaceholderText: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  photoPlaceholderLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  pickerContainer: {
    marginVertical: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  registerButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  pincodeContainer: {
    marginBottom: spacing.md,
  },
  pincodeLoader: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pincodeLoaderText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontStyle: 'italic',
  },
  pincodeSuccess: {
    fontSize: typography.fontSize.xs,
    color: colors.success,
    marginTop: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
});
