import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { colors, typography, spacing } from '../../theme';
import { Card, Button, Input, DatePicker } from '../../components/common';
import { AutocompleteInput, AutocompleteOption } from '../../components/common/AutocompleteInput';
import { useAuth } from '../../hooks';
import { useUpdateOwnProfileMutation } from '../../store/api/userApi';
import { useGetCurrentUserQuery } from '../../store/api/authApi';
import { UpdateUserRequest, User, Gender } from '../../types';
import { validators, validationMessages } from '../../utils/validators';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { setUser } from '../../store/slices/authSlice';
import { storageService } from '../../services/storage.service';
import { pickProfileImage, formatDateForPicker } from '../../utils/imageUtils';
import { locationApiService } from '../../services/locationApi.service';

interface FormErrors {
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  profilePhoto?: string;
  houseDoorNo?: string;
  streetArea?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

export const ProfileScreen = () => {
  const { user, isBuyer, isSeller, isAdmin } = useAuth();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
  
  const [updateUser] = useUpdateOwnProfileMutation();
  const { refetch: refetchCurrentUser } = useGetCurrentUserQuery();

  // Form state with all new fields
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || user?.phoneNumber || '',
    alternatePhone: user?.alternatePhone || '',
    gender: user?.gender || '',
    dateOfBirth: user?.dateOfBirth ? formatDateForPicker(user.dateOfBirth) : '',
    profilePhoto: user?.profilePhoto || '',
    // Structured address
    houseDoorNo: user?.houseDoorNo || '',
    streetArea: user?.streetArea || '',
    city: user?.city || '',
    district: user?.district || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
    landmark: user?.landmark || '',
    // Legacy address (for display)
    address: user?.address || '',
  });

  // Track original values to detect changes
  const [originalData, setOriginalData] = useState(formData);
  const [errors, setErrors] = useState<FormErrors>({});

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      const newFormData = {
        fullName: user?.fullName || '',
        username: user?.username || '',
        email: user?.email || '',
        phone: user?.phone || user?.phoneNumber || '',
        alternatePhone: user?.alternatePhone || '',
        gender: user?.gender || '',
        dateOfBirth: user?.dateOfBirth ? formatDateForPicker(user.dateOfBirth) : '',
        profilePhoto: user?.profilePhoto || '',
        houseDoorNo: user?.houseDoorNo || '',
        streetArea: user?.streetArea || '',
        city: user?.city || '',
        district: user?.district || '',
        state: user?.state || '',
        pincode: user?.pincode || '',
        landmark: user?.landmark || '',
        address: user?.address || '',
      };
      setFormData(newFormData);
      setOriginalData(newFormData);
    }
  }, [user]);

  // Check if form has changes
  const hasChanges = () => {
    return Object.keys(formData).some(key => {
      const formKey = key as keyof typeof formData;
      return formData[formKey] !== originalData[formKey];
    });
  };

  // Handle image pick
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
    handleInputChange('pincode', cleanPincode);
    setPincodeError('');
    
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
    handleInputChange('city', text);
    
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
    handleInputChange('district', text);
    
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
    handleInputChange('state', text);
    
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

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Full Name validation
    if (!validators.required(formData.fullName)) {
      newErrors.fullName = validationMessages.required;
    }

    // Username validation
    if (!validators.required(formData.username)) {
      newErrors.username = validationMessages.required;
    } else if (!validators.username(formData.username)) {
      newErrors.username = validationMessages.username;
    }

    // Email validation
    if (!validators.required(formData.email)) {
      newErrors.email = validationMessages.required;
    } else if (!validators.email(formData.email)) {
      newErrors.email = validationMessages.email;
    }

    // Phone validation (optional but must be valid if provided)
    if (formData.phone && formData.phone.trim() !== '' && !validators.phone(formData.phone)) {
      newErrors.phone = validationMessages.phone;
    }

    // Alternate phone validation
    if (formData.alternatePhone && formData.alternatePhone.trim() !== '' && !validators.phone(formData.alternatePhone)) {
      newErrors.alternatePhone = validationMessages.phone;
    }

    // Date of birth validation
    if (formData.dateOfBirth && !validators.dateOfBirth(formData.dateOfBirth)) {
      newErrors.dateOfBirth = validationMessages.dateOfBirth;
    }

    // Profile photo validation
    if (formData.profilePhoto && !validators.image(formData.profilePhoto)) {
      newErrors.profilePhoto = validationMessages.image;
    } else if (formData.profilePhoto && !validators.imageSize(formData.profilePhoto, 5)) {
      newErrors.profilePhoto = validationMessages.imageSize;
    }

    // Structured address validation (optional in edit mode, but must be valid if provided)
    if (formData.pincode && formData.pincode.trim() !== '' && !validators.pincode(formData.pincode)) {
      newErrors.pincode = validationMessages.pincode;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle edit button
  const handleEdit = () => {
    setIsEditMode(true);
    setOriginalData({ ...formData });
    setErrors({});
  };

  // Handle cancel
  const handleCancel = () => {
    setIsEditMode(false);
    setFormData({ ...originalData });
    setErrors({});
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      showErrorToast('Please fix the errors before saving');
      return;
    }

    if (!user?.id) {
      showErrorToast('User ID not found');
      return;
    }

    setIsSaving(true);
    try {
      const updateRequest: UpdateUserRequest = {
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        alternatePhone: formData.alternatePhone.trim() || undefined,
        gender: formData.gender || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        profilePhoto: formData.profilePhoto || undefined,
        houseDoorNo: formData.houseDoorNo.trim() || undefined,
        streetArea: formData.streetArea.trim() || undefined,
        city: formData.city.trim() || undefined,
        district: formData.district.trim() || undefined,
        state: formData.state.trim() || undefined,
        pincode: formData.pincode.trim() || undefined,
        landmark: formData.landmark.trim() || undefined,
      };

      const updatedUser = await updateUser(updateRequest).unwrap();

      // Refresh user data from backend
      try {
        const { data: refreshedUser } = await refetchCurrentUser();
        if (refreshedUser) {
          dispatch(setUser(refreshedUser));
          await storageService.setUserData(refreshedUser);
          const newFormData = {
            fullName: refreshedUser.fullName || '',
            username: refreshedUser.username || '',
            email: refreshedUser.email || '',
            phone: refreshedUser.phone || refreshedUser.phoneNumber || '',
            alternatePhone: refreshedUser.alternatePhone || '',
            gender: refreshedUser.gender || '',
            dateOfBirth: refreshedUser.dateOfBirth ? formatDateForPicker(refreshedUser.dateOfBirth) : '',
            profilePhoto: refreshedUser.profilePhoto || '',
            houseDoorNo: refreshedUser.houseDoorNo || '',
            streetArea: refreshedUser.streetArea || '',
            city: refreshedUser.city || '',
            district: refreshedUser.district || '',
            state: refreshedUser.state || '',
            pincode: refreshedUser.pincode || '',
            landmark: refreshedUser.landmark || '',
            address: refreshedUser.address || '',
          };
          setFormData(newFormData);
          setOriginalData(newFormData);
        } else if (updatedUser) {
          dispatch(setUser(updatedUser));
          await storageService.setUserData(updatedUser);
          const newFormData = {
            fullName: updatedUser.fullName || '',
            username: updatedUser.username || '',
            email: updatedUser.email || '',
            phone: updatedUser.phone || updatedUser.phoneNumber || '',
            alternatePhone: updatedUser.alternatePhone || '',
            gender: updatedUser.gender || '',
            dateOfBirth: updatedUser.dateOfBirth ? formatDateForPicker(updatedUser.dateOfBirth) : '',
            profilePhoto: updatedUser.profilePhoto || '',
            houseDoorNo: updatedUser.houseDoorNo || '',
            streetArea: updatedUser.streetArea || '',
            city: updatedUser.city || '',
            district: updatedUser.district || '',
            state: updatedUser.state || '',
            pincode: updatedUser.pincode || '',
            landmark: updatedUser.landmark || '',
            address: updatedUser.address || '',
          };
          setFormData(newFormData);
          setOriginalData(newFormData);
        }
      } catch (refetchError) {
        if (updatedUser) {
          dispatch(setUser(updatedUser));
          await storageService.setUserData(updatedUser);
          const newFormData = {
            fullName: updatedUser.fullName || '',
            username: updatedUser.username || '',
            email: updatedUser.email || '',
            phone: updatedUser.phone || updatedUser.phoneNumber || '',
            alternatePhone: updatedUser.alternatePhone || '',
            gender: updatedUser.gender || '',
            dateOfBirth: updatedUser.dateOfBirth ? formatDateForPicker(updatedUser.dateOfBirth) : '',
            profilePhoto: updatedUser.profilePhoto || '',
            houseDoorNo: updatedUser.houseDoorNo || '',
            streetArea: updatedUser.streetArea || '',
            city: updatedUser.city || '',
            district: updatedUser.district || '',
            state: updatedUser.state || '',
            pincode: updatedUser.pincode || '',
            landmark: updatedUser.landmark || '',
            address: updatedUser.address || '',
          };
          setFormData(newFormData);
          setOriginalData(newFormData);
        }
      }

      setIsEditMode(false);
      setErrors({});
      showSuccessToast('Profile updated successfully');
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to update profile';
      showErrorToast(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to format address for display
  const formatAddress = () => {
    if (formData.houseDoorNo || formData.streetArea || formData.city) {
      const parts = [
        formData.houseDoorNo,
        formData.streetArea,
        formData.city,
        formData.district,
        formData.state,
        formData.pincode,
      ].filter(Boolean);
      if (formData.landmark) {
        parts.push(`(Landmark: ${formData.landmark})`);
      }
      return parts.join(', ') || 'Not specified';
    }
    return formData.address || 'Not specified';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <Card style={styles.profileCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            {!isEditMode && (
              <Button
                title="Edit"
                onPress={handleEdit}
                variant="outline"
                size="small"
                style={styles.editButton}
              />
            )}
          </View>

          {/* Profile Photo */}
          <View style={styles.photoSection}>
            {isEditMode ? (
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
                    <Text style={styles.photoPlaceholderLabel}>Tap to change</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.photoContainer}>
                {user?.profilePhoto ? (
                  <Image source={{ uri: user.profilePhoto }} style={styles.profilePhoto} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderText}>👤</Text>
                  </View>
                )}
              </View>
            )}
            {errors.profilePhoto && <Text style={styles.errorText}>{errors.profilePhoto}</Text>}
          </View>

          {isEditMode ? (
            // Edit Mode
            <>
              <Input
                label="Full Name"
                value={formData.fullName}
                onChangeText={(value) => handleInputChange('fullName', value)}
                placeholder="Enter your full name"
                error={errors.fullName}
                autoCapitalize="words"
              />

              <Input
                label="Username"
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
                placeholder="Enter username"
                error={errors.username}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Input
                label="Email"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Enter email"
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Input
                label="Phone"
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value.replace(/[^0-9]/g, ''))}
                placeholder="Enter phone number"
                error={errors.phone}
                keyboardType="phone-pad"
                maxLength={10}
              />

              <Input
                label="Alternate Phone"
                value={formData.alternatePhone}
                onChangeText={(value) => handleInputChange('alternatePhone', value.replace(/[^0-9]/g, ''))}
                placeholder="Enter alternate phone (optional)"
                error={errors.alternatePhone}
                keyboardType="phone-pad"
                maxLength={10}
              />

              {/* Gender Picker */}
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.gender}
                    onValueChange={(itemValue) => handleInputChange('gender', itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Gender" value="" />
                    <Picker.Item label="Male" value={Gender.MALE} />
                    <Picker.Item label="Female" value={Gender.FEMALE} />
                    <Picker.Item label="Other" value={Gender.OTHER} />
                  </Picker>
                </View>
              </View>

              <DatePicker
                label="Date of Birth"
                value={formData.dateOfBirth}
                onChange={(date) => {
                  handleInputChange('dateOfBirth', date);
                }}
                maxDate={formatDateForPicker(new Date())} // Today's date
                placeholder="Select date of birth"
              />
              {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}

              {/* Address Section */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Address Details</Text>
              </View>

              <Input
                label="House / Door No"
                value={formData.houseDoorNo}
                onChangeText={(value) => handleInputChange('houseDoorNo', value)}
                placeholder="Enter house/door number"
                error={errors.houseDoorNo}
              />

              <Input
                label="Street / Area"
                value={formData.streetArea}
                onChangeText={(value) => handleInputChange('streetArea', value)}
                placeholder="Enter street/area"
                error={errors.streetArea}
              />

              <AutocompleteInput
                label="City"
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
                label="District"
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
                label="State"
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
                  label="Pincode"
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
                onChangeText={(value) => handleInputChange('landmark', value)}
                placeholder="Enter landmark (optional)"
              />

              <View style={styles.buttonRow}>
                <Button
                  title="Cancel"
                  onPress={handleCancel}
                  variant="outline"
                  style={styles.cancelButton}
                  disabled={isSaving}
                />
                <Button
                  title="Save Changes"
                  onPress={handleSave}
                  style={styles.saveButton}
                  loading={isSaving}
                  disabled={isSaving || !hasChanges()}
                />
              </View>
            </>
          ) : (
            // View Mode
            <>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Full Name</Text>
                <Text style={styles.value}>{user?.fullName || 'Not specified'}</Text>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Username</Text>
                <Text style={styles.value}>{user?.username}</Text>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{user?.email}</Text>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Phone</Text>
                <Text style={styles.value}>{user?.phone || user?.phoneNumber || 'Not specified'}</Text>
              </View>

              {user?.alternatePhone && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Alternate Phone</Text>
                  <Text style={styles.value}>{user.alternatePhone}</Text>
                </View>
              )}

              {user?.gender && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Gender</Text>
                  <Text style={styles.value}>{user.gender}</Text>
                </View>
              )}

              {user?.dateOfBirth && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Date of Birth</Text>
                  <Text style={styles.value}>{formatDateForPicker(user.dateOfBirth)}</Text>
                </View>
              )}

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.value}>{formatAddress()}</Text>
              </View>

              <View style={styles.securitySection}>
                {(isSeller() || isAdmin()) && (
                  <>
                    <Button
                      title="My Buyers"
                      onPress={() => navigation.navigate('ShopBuyers' as never)}
                      variant="outline"
                      fullWidth
                      style={styles.changePasswordButton}
                    />
                    <Button
                      title="Shop Customers"
                      onPress={() => navigation.navigate('ShopCustomers' as never)}
                      variant="outline"
                      fullWidth
                      style={styles.changePasswordButton}
                    />
                    <Button
                      title="20 Litre Cans"
                      onPress={() => navigation.navigate('IssuedCans' as never)}
                      variant="outline"
                      fullWidth
                      style={styles.changePasswordButton}
                    />
                    <Button
                      title="Phone Order"
                      onPress={() => navigation.navigate('PhoneOrder' as never)}
                      variant="outline"
                      fullWidth
                      style={styles.changePasswordButton}
                    />
                    <Button
                      title="Shop Profile / QR"
                      onPress={() => navigation.navigate('ShopProfile' as never)}
                      variant="outline"
                      fullWidth
                      style={styles.changePasswordButton}
                    />
                  </>
                )}
                {isBuyer() && (
                  <>
                    <Button
                      title="My Payments"
                      onPress={() => navigation.navigate('BuyerPayments' as never)}
                      variant="outline"
                      fullWidth
                      style={styles.changePasswordButton}
                    />
                    <Button
                      title="My Empty Cans"
                      onPress={() => navigation.navigate('BuyerEmptyCans' as never)}
                      variant="outline"
                      fullWidth
                      style={styles.changePasswordButton}
                    />
                  </>
                )}
                <Button
                  title="Change Password"
                  onPress={() => navigation.navigate('ChangePassword')}
                  variant="outline"
                  fullWidth
                  style={styles.changePasswordButton}
                />
              </View>
            </>
          )}
        </Card>
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
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  profileCard: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  editButton: {
    minWidth: 80,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.gray100,
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
    fontSize: 50,
  },
  photoPlaceholderLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  pickerContainer: {
    marginVertical: spacing.md,
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
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  securitySection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  changePasswordButton: {
    marginTop: spacing.sm,
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
