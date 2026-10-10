import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Button, Input, DatePicker } from '../../components/common';
import { AutocompleteInput, AutocompleteOption } from '../../components/common/AutocompleteInput';
import { useAuth } from '../../hooks';
import { UserRole, Gender } from '../../types';
import { validators, validationMessages } from '../../utils/validators';
import { pickProfileImage, formatDateForPicker } from '../../utils/imageUtils';
import { locationApiService, PincodeLocation } from '../../services/locationApi.service';
import { clearSharedCompanyCode, readSharedCompanyCode, rememberSharedCompanyCode } from '../../utils/appShare';

export const RegisterScreen = ({ navigation, route }: any) => {
  const sharedCompanyCode = readSharedCompanyCode(route?.params?.companyCode);
  const { register, isLoading } = useAuth();
  const { width } = useWindowDimensions();
  const twoCol = width >= 760;
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
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
    companyCode: sharedCompanyCode,
    aadhaarNumber: '',
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
  const sellerLocked = sharedCompanyCode.length >= 3;

  useEffect(() => {
    if (!sellerLocked) {
      return;
    }
    rememberSharedCompanyCode(sharedCompanyCode);
    setFormData((current) => ({
      ...current,
      role: UserRole.BUYER,
      companyCode: sharedCompanyCode,
    }));
  }, [sellerLocked, sharedCompanyCode]);

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

    const name = formData.fullName.trim();
    if (name.length < 2) {
      newErrors.fullName = 'Name is required';
    } else if (name.length > 100) {
      newErrors.fullName = 'Name must be 100 characters or less';
    }

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
      newErrors.companyName = 'Shop name is required';
    }
    if (formData.role === UserRole.SELLER && !/^[0-9]{12}$/.test(formData.aadhaarNumber)) {
      newErrors.aadhaarNumber = 'Aadhaar number must be 12 digits';
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
      fullName: formData.fullName.trim(),
      password: formData.password,
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim(),
      role: sellerLocked ? UserRole.BUYER : formData.role,
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
      aadhaarNumber: formData.role === UserRole.SELLER ? formData.aadhaarNumber : undefined,
      companyName: formData.role === UserRole.SELLER ? formData.companyName.trim() : undefined,
      companyCode: (sellerLocked || formData.role === UserRole.BUYER)
        ? (sellerLocked ? sharedCompanyCode : formData.companyCode.trim())
        : undefined,
    };

    const result = await register(registerData);
    
    if (result.success) {
      clearSharedCompanyCode();
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
      message += ' We emailed your username, application link, and reset password link when an email address was entered. Please go to Login.';

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
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.photoContainer}
              onPress={handlePickImage}
              disabled={imagePickerLoading}
            >
              {formData.profilePhoto ? (
                <Image source={{ uri: formData.profilePhoto }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={22} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>Fill the details in order. Fields with * are required.</Text>
              {errors.profilePhoto ? <Text style={styles.errorText}>{errors.profilePhoto}</Text> : (
                <Text style={styles.photoHint}>Tap the photo to add one. This is optional.</Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Account type</Text>
            {sellerLocked ? (
              <Text style={styles.lockedNote}>
                Buyer account for seller code {sharedCompanyCode}. This link cannot create a seller or admin account, and the company code cannot be changed.
              </Text>
            ) : (
              <View style={styles.choiceRow}>
                {[
                  { label: 'Buyer', value: UserRole.BUYER },
                  { label: 'Seller', value: UserRole.SELLER },
                  { label: 'Admin', value: UserRole.ADMIN },
                ].map((option) => {
                  const active = formData.role === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.choice, active && styles.choiceActive]}
                      onPress={() => setFormData({ ...formData, role: option.value })}
                    >
                      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Login</Text>
            <View style={[styles.row, !twoCol && styles.rowStack]}>
              <View style={[styles.col, !twoCol && styles.colStack]}>
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
              </View>
              <View style={[styles.col, !twoCol && styles.colStack]}>
                <Input
                  label="Password *"
                  value={formData.password}
                  onChangeText={(text) => {
                    setFormData({ ...formData, password: text });
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  placeholder="At least 6 characters"
                  secureTextEntry
                  showPasswordToggle
                  error={errors.password}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Your details</Text>
            <Input
              label="Name *"
              value={formData.fullName}
              onChangeText={(text) => {
                setFormData({ ...formData, fullName: text });
                if (errors.fullName) setErrors({ ...errors, fullName: '' });
              }}
              placeholder="Your name"
              autoCapitalize="words"
              maxLength={100}
              error={errors.fullName}
            />
            {formData.role === UserRole.SELLER && (
              <View style={[styles.row, !twoCol && styles.rowStack]}>
                <View style={[styles.col, !twoCol && styles.colStack]}>
                  <Input
                    label="Shop name *"
                    value={formData.companyName}
                    onChangeText={(text) => setFormData({ ...formData, companyName: text })}
                    placeholder="Your shop name"
                    error={errors.companyName}
                  />
                </View>
                <View style={[styles.col, !twoCol && styles.colStack]}>
                  <Input
                    label="Aadhaar number *"
                    value={formData.aadhaarNumber}
                    onChangeText={(text) => {
                      setFormData({ ...formData, aadhaarNumber: text.replace(/[^0-9]/g, '').slice(0, 12) });
                      if (errors.aadhaarNumber) setErrors({ ...errors, aadhaarNumber: '' });
                    }}
                    placeholder="12-digit Aadhaar number"
                    keyboardType="numeric"
                    maxLength={12}
                    error={errors.aadhaarNumber}
                  />
                </View>
              </View>
            )}
            {(sellerLocked || formData.role === UserRole.BUYER) && (
              <Input
                label="Seller company code *"
                value={sellerLocked ? sharedCompanyCode : formData.companyCode}
                onChangeText={(text) => {
                  if (!sellerLocked) {
                    setFormData({ ...formData, companyCode: text.toUpperCase() });
                  }
                }}
                placeholder="Example: RAVI-0001"
                autoCapitalize="characters"
                editable={!sellerLocked}
                error={errors.companyCode}
              />
            )}
            <View style={[styles.row, !twoCol && styles.rowStack]}>
              <View style={[styles.col, !twoCol && styles.colStack]}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.choiceRow}>
                  {[
                    { label: 'Male', value: Gender.MALE },
                    { label: 'Female', value: Gender.FEMALE },
                    { label: 'Other', value: Gender.OTHER },
                  ].map((option) => {
                    const active = formData.gender === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.choice, active && styles.choiceActive]}
                        onPress={() => setFormData({ ...formData, gender: option.value })}
                      >
                        <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{option.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={[styles.col, !twoCol && styles.colStack]}>
                <DatePicker
                  label="Date of birth"
                  value={formData.dateOfBirth}
                  onChange={(date) => {
                    setFormData({ ...formData, dateOfBirth: date });
                    if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: '' });
                  }}
                  maxDate={formatDateForPicker(new Date())}
                  placeholder="Select date of birth"
                />
                {errors.dateOfBirth ? <Text style={styles.errorText}>{errors.dateOfBirth}</Text> : null}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Contact</Text>
            <View style={[styles.row, !twoCol && styles.rowStack]}>
              <View style={[styles.col, !twoCol && styles.colStack]}>
                <Input
                  label="Phone number *"
                  value={formData.phone}
                  onChangeText={(text) => {
                    setFormData({ ...formData, phone: text.replace(/[^0-9]/g, '') });
                    if (errors.phone) setErrors({ ...errors, phone: '' });
                  }}
                  placeholder="10-digit phone number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  error={errors.phone}
                />
              </View>
              <View style={[styles.col, !twoCol && styles.colStack]}>
                <Input
                  label="Alternate phone"
                  value={formData.alternatePhone}
                  onChangeText={(text) => {
                    setFormData({ ...formData, alternatePhone: text.replace(/[^0-9]/g, '') });
                    if (errors.alternatePhone) setErrors({ ...errors, alternatePhone: '' });
                  }}
                  placeholder="Optional"
                  keyboardType="phone-pad"
                  maxLength={10}
                  error={errors.alternatePhone}
                />
              </View>
            </View>
            <Input
              label="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Optional"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {sellerLocked || formData.role === UserRole.BUYER ? '5. Delivery address' : '5. Address'}
            </Text>
            <Text style={styles.sectionHint}>Enter the pincode first. City, district, and state fill in from it.</Text>
            <Input
              label="Pincode *"
              value={formData.pincode}
              onChangeText={handlePincodeChange}
              placeholder="6-digit pincode"
              keyboardType="phone-pad"
              maxLength={6}
              error={errors.pincode || pincodeError}
            />
            {isLoadingPincode ? <Text style={styles.pincodeLoaderText}>Fetching location...</Text> : null}
            {formData.pincode.length === 6 && !isLoadingPincode && !pincodeError ? (
              <Text style={styles.pincodeSuccess}>Location filled from this pincode</Text>
            ) : null}
            <View style={[styles.row, !twoCol && styles.rowStack]}>
              <View style={[styles.col, !twoCol && styles.colStack]}>
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
                  placeholder="City"
                  error={errors.city}
                  suggestions={citySuggestions}
                  isLoading={isLoadingCity}
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.col, !twoCol && styles.colStack]}>
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
                  placeholder="District"
                  error={errors.district}
                  suggestions={districtSuggestions}
                  isLoading={isLoadingDistrict}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <AutocompleteInput
              label="State *"
              value={formData.state}
              onChangeText={handleStateChange}
              onSelect={(option) => {
                setFormData(prev => ({ ...prev, state: option.name }));
              }}
              placeholder="State"
              error={errors.state}
              suggestions={stateSuggestions}
              isLoading={isLoadingState}
              autoCapitalize="words"
            />
            <View style={[styles.row, !twoCol && styles.rowStack]}>
              <View style={[styles.col, !twoCol && styles.colStack]}>
                <Input
                  label="House / door no *"
                  value={formData.houseDoorNo}
                  onChangeText={(text) => {
                    setFormData({ ...formData, houseDoorNo: text });
                    if (errors.houseDoorNo) setErrors({ ...errors, houseDoorNo: '' });
                  }}
                  placeholder="Door number"
                  error={errors.houseDoorNo}
                />
              </View>
              <View style={[styles.col, !twoCol && styles.colStack]}>
                <Input
                  label="Street / area *"
                  value={formData.streetArea}
                  onChangeText={(text) => {
                    setFormData({ ...formData, streetArea: text });
                    if (errors.streetArea) setErrors({ ...errors, streetArea: '' });
                  }}
                  placeholder="Street or area"
                  error={errors.streetArea}
                />
              </View>
            </View>
            <Input
              label="Landmark"
              value={formData.landmark}
              onChangeText={(text) => setFormData({ ...formData, landmark: text })}
              placeholder="Optional"
            />
          </View>

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
    padding: spacing.lg,
    paddingBottom: spacing.xl * 4,
    alignItems: 'center',
    ...Platform.select({
      default: {
        flexGrow: 1,
      },
    }),
  },
  card: {
    width: '100%',
    maxWidth: 760,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  photoHint: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  photoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.blue300,
    backgroundColor: colors.blue50,
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
  },
  section: {
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowStack: {
    flexDirection: 'column',
    gap: 0,
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  colStack: {
    width: '100%',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  choice: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  choiceActive: {
    borderColor: colors.primary,
    backgroundColor: colors.blue50,
  },
  choiceText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  choiceTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  lockedNote: {
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  registerButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  pincodeLoaderText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  pincodeSuccess: {
    fontSize: typography.fontSize.xs,
    color: colors.success,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },
});
