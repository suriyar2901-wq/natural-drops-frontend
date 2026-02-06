import { VALIDATION } from './constants';

export const validators = {
  // Email validation
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Phone number validation (Indian format)
  phone: (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // Password validation (medium strength: 8+ chars, at least one letter and one number)
  password: (password: string): boolean => {
    if (!password || password.length < VALIDATION.MIN_PASSWORD_LENGTH) {
      return false;
    }
    
    // Check for at least one letter
    const hasLetter = /[a-zA-Z]/.test(password);
    // Check for at least one number
    const hasNumber = /[0-9]/.test(password);
    
    return hasLetter && hasNumber;
  },

  // Username validation
  username: (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    return (
      username.length >= VALIDATION.MIN_USERNAME_LENGTH &&
      username.length <= VALIDATION.MAX_USERNAME_LENGTH &&
      usernameRegex.test(username)
    );
  },

  // Required field validation
  required: (value: any): boolean => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  },

  // Number validation
  number: (value: any): boolean => {
    return !isNaN(parseFloat(value)) && isFinite(value);
  },

  // Positive number validation
  positiveNumber: (value: number): boolean => {
    return validators.number(value) && value > 0;
  },

  // Min value validation
  min: (value: number, min: number): boolean => {
    return validators.number(value) && value >= min;
  },

  // Max value validation
  max: (value: number, max: number): boolean => {
    return validators.number(value) && value <= max;
  },

  // Length validation
  length: (value: string, length: number): boolean => {
    return value.length === length;
  },

  // Min length validation
  minLength: (value: string, minLength: number): boolean => {
    return value.length >= minLength;
  },

  // Max length validation
  maxLength: (value: string, maxLength: number): boolean => {
    return value.length <= maxLength;
  },

  // UPI ID validation
  upiId: (upiId: string): boolean => {
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    return upiRegex.test(upiId);
  },

  // Pincode validation (6 digits)
  pincode: (pincode: string): boolean => {
    const pincodeRegex = /^[0-9]{6}$/;
    return pincodeRegex.test(pincode);
  },

  // Date validation (must be in the past, not today or future)
  dateOfBirth: (date: string): boolean => {
    if (!date) return false;
    try {
      // Parse YYYY-MM-DD format
      const [year, month, day] = date.split('-').map(Number);
      if (!year || !month || !day) return false;
      
      const dateObj = new Date(year, month - 1, day);
      dateObj.setHours(0, 0, 0, 0);
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) return false;
      
      // Check if date components match (handles invalid dates like Feb 30)
      if (dateObj.getFullYear() !== year || 
          dateObj.getMonth() !== month - 1 || 
          dateObj.getDate() !== day) {
        return false;
      }
      
      // Must be in the past (before today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check year range (1900 to current year)
      if (year < 1900 || year > today.getFullYear()) {
        return false;
      }
      
      return dateObj < today;
    } catch (error) {
      return false;
    }
  },

  // Image validation (base64 or URL)
  image: (image: string): boolean => {
    if (!image) return false;
    // Check if it's a URL
    if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('data:image/')) {
      return true;
    }
    // Check if it's base64
    if (image.startsWith('data:image/')) {
      return true;
    }
    return false;
  },

  // Image size validation (max 5MB for base64)
  imageSize: (base64: string, maxSizeMB: number = 5): boolean => {
    if (!base64 || !base64.startsWith('data:image/')) return false;
    // Approximate base64 size calculation (base64 is ~33% larger than binary)
    const base64Size = base64.length;
    const binarySize = (base64Size * 3) / 4;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return binarySize <= maxSizeBytes;
  },
};

export const validationMessages = {
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid 10-digit phone number',
  password: `Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters and contain at least one letter and one number`,
  username: `Username must be between ${VALIDATION.MIN_USERNAME_LENGTH} and ${VALIDATION.MAX_USERNAME_LENGTH} characters and contain only letters, numbers, and underscores`,
  required: 'This field is required',
  number: 'Please enter a valid number',
  positiveNumber: 'Please enter a positive number',
  upiId: 'Please enter a valid UPI ID',
  pincode: 'Please enter a valid 6-digit pincode',
  dateOfBirth: 'Please select a valid date of birth. Date must be in the past.',
  image: 'Please select a valid image',
  imageSize: 'Image size must be less than 5MB',
};

