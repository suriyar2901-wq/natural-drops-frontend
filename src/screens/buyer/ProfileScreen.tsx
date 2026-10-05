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
import { useGetShopProfileQuery, useSaveShopProfileMutation } from '../../store/api/shopApi';
import { formatClockAmPm } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';

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

const clockParts = (value: string) => {
  const [hourRaw, minuteRaw] = (value || '08:00').slice(0, 5).split(':');
  const hour24 = Number(hourRaw);
  const minute = Number(minuteRaw);
  return {
    hour12: hour24 % 12 || 12,
    minute: Number.isNaN(minute) ? 0 : minute,
    suffix: (hour24 >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
  };
};

const toClockValue = (hour12: number, minute: number, suffix: 'AM' | 'PM') => {
  const safeHour = Math.min(12, Math.max(1, hour12 || 12));
  const safeMinute = Math.min(59, Math.max(0, minute || 0));
  let hour24 = safeHour % 12;
  if (suffix === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`;
};

const WEEK_DAYS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

const toYmd = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const LeaveCalendar = ({ dates, onToggle, disabled }: { dates: string[]; onToggle: (value: string) => void; disabled?: boolean }) => {
  const today = new Date();
  const todayKey = toYmd(today);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const selected = new Set(dates);
  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: Array<string | null> = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toYmd(new Date(cursor.year, cursor.month, day)));
  }
  const title = new Date(cursor.year, cursor.month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<string | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return (
    <View style={styles.calendar}>
      <View style={styles.calendarNav}>
        <TouchableOpacity
          style={styles.calendarNavButton}
          onPress={() => setCursor((current) => {
            const date = new Date(current.year, current.month - 1, 1);
            return { year: date.getFullYear(), month: date.getMonth() };
          })}
        >
          <Ionicons name="chevron-back" size={16} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.calendarTitle}>{title}</Text>
        <TouchableOpacity
          style={styles.calendarNavButton}
          onPress={() => setCursor((current) => {
            const date = new Date(current.year, current.month + 1, 1);
            return { year: date.getFullYear(), month: date.getMonth() };
          })}
        >
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.weekRow}>
        {WEEK_DAYS.map((day) => (
          <View key={day.label} style={styles.weekCell}>
            <Text style={[styles.weekLabel, (day.id === 0 || day.id === 6) && styles.weekLabelWeekend]}>{day.label}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((value, dayIndex) => {
            if (!value) return <View key={`empty-${weekIndex}-${dayIndex}`} style={[styles.dayCell, styles.dayCellEmpty]} />;
            const past = value < todayKey;
            const active = selected.has(value);
            const today = value === todayKey;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.dayCell,
                  today && styles.dayCellToday,
                  active && styles.dayCellActive,
                  past && styles.dayCellPast,
                ]}
                disabled={past || disabled}
                onPress={() => onToggle(value)}
              >
                <Text style={[styles.dayText, today && styles.dayTextToday, active && styles.dayTextActive, past && styles.dayTextPast]}>
                  {Number(value.slice(8))}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.dayCellToday]} />
          <Text style={styles.legendText}>Today</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.dayCellActive]} />
          <Text style={styles.legendText}>Leave</Text>
        </View>
      </View>
    </View>
  );
};

const CLOCK_HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const CLOCK_MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

const ShopClock = ({ label, value, onChange, disabled }: { label: string; value: string; onChange: (next: string) => void; disabled?: boolean }) => {
  const parts = clockParts(value);
  const minuteValue = String(parts.minute).padStart(2, '0');

  return (
    <View style={styles.clockBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.clockRow}>
        <View style={styles.clockPicker}>
          <Picker
            enabled={!disabled}
            selectedValue={String(parts.hour12)}
            onValueChange={(item) => onChange(toClockValue(Number(item), parts.minute, parts.suffix))}
            style={styles.clockSelect}
          >
            {CLOCK_HOURS.map((hour) => <Picker.Item key={hour} label={hour} value={hour} />)}
          </Picker>
        </View>
        <Text style={styles.clockColon}>:</Text>
        <View style={styles.clockPicker}>
          <Picker
            enabled={!disabled}
            selectedValue={minuteValue}
            onValueChange={(item) => onChange(toClockValue(parts.hour12, Number(item), parts.suffix))}
            style={styles.clockSelect}
          >
            {CLOCK_MINUTES.map((minute) => <Picker.Item key={minute} label={minute} value={minute} />)}
          </Picker>
        </View>
        <View style={styles.clockPicker}>
          <Picker
            enabled={!disabled}
            selectedValue={parts.suffix}
            onValueChange={(item) => onChange(toClockValue(parts.hour12, parts.minute, item))}
            style={styles.clockSelect}
          >
            <Picker.Item label="AM" value="AM" />
            <Picker.Item label="PM" value="PM" />
          </Picker>
        </View>
      </View>
    </View>
  );
};

export const ProfileScreen = () => {
  const { user, isBuyer, isSeller, isAdmin } = useAuth();
  const { data: shopProfile } = useGetShopProfileQuery(undefined, { skip: !isSeller() });
  const [saveShopProfile, { isLoading: savingHours }] = useSaveShopProfileMutation();
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('20:00');
  const [openDays, setOpenDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [leaveDates, setLeaveDates] = useState<string[]>([]);
  const [showHoursToBuyer, setShowHoursToBuyer] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursEditing, setHoursEditing] = useState(false);
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

  const applyShopHours = (profile?: typeof shopProfile) => {
    setOpenTime(profile?.openTime ? String(profile.openTime).slice(0, 5) : '08:00');
    setCloseTime(profile?.closeTime ? String(profile.closeTime).slice(0, 5) : '20:00');
    const days = String(profile?.openDays || '').split(',').map((part) => Number(part.trim())).filter((day) => day >= 0 && day <= 6);
    setOpenDays(days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6]);
    setLeaveDates(String(profile?.leaveDates || '').split(',').map((part) => part.trim()).filter((part) => /^\d{4}-\d{2}-\d{2}$/.test(part)));
    setShowHoursToBuyer(profile?.showHoursToBuyer === true);
  };

  useEffect(() => {
    if (hoursEditing) return;
    applyShopHours(shopProfile);
  }, [shopProfile, hoursEditing]);

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

              {isSeller() && (
                <View style={styles.hoursCard}>
                  <TouchableOpacity style={styles.iconRow} onPress={() => setHoursOpen((open) => !open)}>
                    <View style={styles.iconBadge}>
                      <Ionicons name="time-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.iconRowText}>
                      <Text style={styles.sectionTitle}>Shop available time</Text>
                      <Text style={styles.hoursPreview}>
                        {formatClockAmPm(openTime)} to {formatClockAmPm(closeTime)}
                      </Text>
                    </View>
                    <Ionicons name={hoursOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {hoursOpen && (
                  <>
                  <View style={styles.hoursToolbar}>
                    <Text style={[styles.hoursHint, styles.toolbarHint]}>
                      {hoursEditing
                        ? 'Change the days, time, and leave dates, then save.'
                        : 'Tap Edit to change these details.'}
                    </Text>
                    {!hoursEditing && (
                      <TouchableOpacity style={styles.editHoursButton} onPress={() => setHoursEditing(true)}>
                        <Ionicons name="create-outline" size={16} color={colors.primary} />
                        <Text style={styles.editHoursText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.label}>Open days</Text>
                  <View style={[styles.dayChipRow, !hoursEditing && styles.lockedBlock]} pointerEvents={hoursEditing ? 'auto' : 'none'}>
                    {WEEK_DAYS.map((day) => {
                      const active = openDays.includes(day.id);
                      return (
                        <TouchableOpacity
                          key={day.id}
                          style={[styles.dayChip, active && styles.dayChipActive]}
                          onPress={() => setOpenDays((current) => (
                            current.includes(day.id) ? current.filter((id) => id !== day.id) : [...current, day.id].sort()
                          ))}
                        >
                          <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={[styles.clockGrid, !hoursEditing && styles.lockedBlock]} pointerEvents={hoursEditing ? 'auto' : 'none'}>
                    <ShopClock label="Opens" value={openTime} onChange={setOpenTime} disabled={!hoursEditing} />
                    <ShopClock label="Closes" value={closeTime} onChange={setCloseTime} disabled={!hoursEditing} />
                  </View>
                  <Text style={styles.label}>Shop leave</Text>
                  <Text style={styles.hoursHint}>Tap a date to mark or clear a leave day.</Text>
                  <View style={!hoursEditing ? styles.lockedBlock : undefined} pointerEvents={hoursEditing ? 'auto' : 'none'}>
                    <LeaveCalendar
                      dates={leaveDates}
                      disabled={!hoursEditing}
                      onToggle={(value) => setLeaveDates((current) => (
                        current.includes(value) ? current.filter((date) => date !== value) : [...current, value].sort()
                      ))}
                    />
                  </View>
                  {leaveDates.length > 0 && (
                    <Text style={styles.hoursHint}>
                      Leave: {leaveDates.map((date) => date.split('-').reverse().join('/')).join(', ')}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.showBuyerRow, !hoursEditing && styles.lockedBlock]}
                    disabled={!hoursEditing}
                    onPress={() => setShowHoursToBuyer((current) => !current)}
                  >
                    <Ionicons
                      name={showHoursToBuyer ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={showHoursToBuyer ? colors.primary : colors.textSecondary}
                    />
                    <View style={styles.iconRowText}>
                      <Text style={styles.showBuyerTitle}>Show these details to customers</Text>
                      <Text style={styles.hoursHint}>
                        Leave this off until you want buyers to see the shop time and leave days. Turn it on only when you need it.
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {hoursEditing && (
                    <View style={styles.hoursActions}>
                      <Button
                        title="Cancel"
                        variant="outline"
                        onPress={() => {
                          applyShopHours(shopProfile);
                          setHoursEditing(false);
                        }}
                        style={styles.hoursActionButton}
                        disabled={savingHours}
                      />
                      <Button
                        title={savingHours ? 'Saving…' : 'Save'}
                        onPress={async () => {
                          if (openDays.length === 0) {
                            showErrorToast('Select at least one open day');
                            return;
                          }
                          try {
                            await saveShopProfile({
                              ...(shopProfile || {}),
                              openTime,
                              closeTime,
                              openDays: openDays.join(','),
                              leaveDates: leaveDates.join(','),
                              showHoursToBuyer,
                            }).unwrap();
                            setHoursEditing(false);
                            showSuccessToast('Shop available time saved');
                          } catch (error: any) {
                            showErrorToast(error?.data?.message || 'Could not save shop time');
                          }
                        }}
                        style={styles.hoursActionButton}
                        disabled={savingHours}
                      />
                    </View>
                  )}
                  </>
                  )}
                </View>
              )}

              <View style={styles.securitySection}>
                {(isSeller() || isAdmin()) && (
                  <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('ShopProfile' as never)}>
                    <View style={styles.iconBadge}>
                      <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.actionRowText}>Shop Profile / QR</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
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
                <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('ChangePassword')}>
                  <View style={styles.iconBadge}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.actionRowText}>Change Password</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
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
  hoursCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    backgroundColor: colors.gray50 || colors.background,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconRowText: {
    flex: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: spacing.sm,
    backgroundColor: colors.white,
  },
  actionRowText: {
    flex: 1,
    color: colors.primary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  toolbarHint: {
    flex: 1,
    marginBottom: 0,
  },
  hoursToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  editHoursButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  editHoursText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  lockedBlock: {
    opacity: 0.72,
  },
  showBuyerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  showBuyerTitle: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  hoursActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hoursActionButton: {
    flex: 1,
  },
  hoursHint: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  hoursPreview: {
    marginBottom: spacing.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  dayChipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  dayChip: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  dayChipTextActive: {
    color: colors.white,
  },
  calendar: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  calendarNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarTitle: {
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    fontSize: typography.fontSize.md,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekLabel: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  weekLabelWeekend: {
    color: colors.primary,
  },
  dayCell: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.gray50,
  },
  dayCellEmpty: {
    backgroundColor: 'transparent',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#E8F2FC',
  },
  dayCellActive: {
    backgroundColor: colors.error,
    borderWidth: 0,
  },
  dayCellPast: {
    backgroundColor: colors.white,
    opacity: 0.45,
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  dayTextToday: {
    color: colors.primaryDark,
    fontWeight: typography.fontWeight.bold,
  },
  dayTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  dayTextPast: {
    color: colors.textSecondary,
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
  clockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  clockBlock: {
    flexGrow: 1,
    flexBasis: 240,
    marginBottom: spacing.md,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  clockPicker: {
    minWidth: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  clockSelect: {
    height: 50,
    color: colors.textPrimary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  clockColon: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
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
