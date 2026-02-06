/**
 * Comfortable Color Palette for Reading
 * Optimized for visual comfort, accessibility, and modern design
 * All colors meet WCAG AA contrast requirements with improved visibility
 */

export const comfortableColors = {
  // Background colors - Soft but clearly visible
  background: '#FAFBFC', // Soft off-white with better visibility
  backgroundSecondary: '#F5F7FA', // Slightly darker for cards/sections
  surface: '#FFFFFF', // Pure white for elevated surfaces
  surfaceElevated: '#FFFFFF', // For cards and modals
  
  // Text colors - Darker for better visibility while still comfortable
  textPrimary: '#1E293B', // Dark slate - high contrast, easy to read
  textSecondary: '#475569', // Medium slate - clearly visible
  textTertiary: '#64748B', // Light slate for hints - still readable
  textDisabled: '#94A3B8', // Disabled text - visible but muted
  textOnPrimary: '#FFFFFF', // White text on colored backgrounds
  
  // Primary colors - Clear and visible
  primary: '#4F46E5', // Indigo - strong but not harsh
  primaryDark: '#4338CA', // Darker shade for hover/press
  primaryLight: '#6366F1', // Lighter shade for backgrounds
  primaryBackground: '#EEF2FF', // Very light indigo for subtle backgrounds
  
  // Secondary colors
  secondary: '#6366F1', // Indigo variant
  secondaryDark: '#4F46E5',
  secondaryLight: '#818CF8',
  
  // Accent colors - Clear and visible
  accent: '#6366F1', // Indigo accent
  accentLight: '#EEF2FF', // Very light accent background
  
  // Status colors - Clear and visible
  success: '#059669', // Strong green - clearly visible
  successLight: '#D1FAE5', // Light green background
  warning: '#D97706', // Strong orange - clearly visible
  warningLight: '#FEF3C7', // Light orange background
  error: '#DC2626', // Strong red - clearly visible
  errorLight: '#FEE2E2', // Light red background
  info: '#0284C7', // Strong blue - clearly visible
  infoLight: '#E0F2FE', // Light blue background
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Border colors - Clear but not harsh
  border: '#E2E8F0', // Clear gray border
  borderLight: '#F1F5F9', // Very light border
  borderDark: '#CBD5E1', // Darker border for emphasis
  divider: '#E2E8F0', // Divider lines
  
  // Gray scale - Clear progression
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',
  
  // Button colors - High contrast
  buttonPrimary: '#4F46E5', // Strong indigo
  buttonPrimaryPressed: '#4338CA',
  buttonSecondary: '#475569', // Dark slate
  buttonSecondaryPressed: '#334155',
  buttonOutline: 'transparent',
  buttonOutlineBorder: '#4F46E5',
  
  // Header colors
  headerBackground: '#4F46E5', // Primary color
  headerText: '#FFFFFF',
  headerSubtext: '#E0E7FF', // Light indigo
  
  // Card colors
  cardBackground: '#FFFFFF',
  cardShadow: 'rgba(15, 23, 42, 0.1)', // Clear shadow
  cardBorder: '#E2E8F0',
  
  // Input colors - High contrast
  inputBackground: '#FFFFFF',
  inputBorder: '#CBD5E1', // Clear border
  inputBorderFocused: '#4F46E5', // Strong focus color
  inputPlaceholder: '#94A3B8', // Visible placeholder
  
  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)', // Clear overlay
  overlayLight: 'rgba(15, 23, 42, 0.3)', // Light overlay
  
  // Reading-specific colors - High contrast
  readingBackground: '#FFFFFF', // White for best readability
  readingText: '#1E293B', // Dark slate - high contrast
  readingTextSecondary: '#475569', // Medium slate - clearly visible
  readingHighlight: '#EEF2FF', // Highlight color for selected text
};

export type ComfortableColors = typeof comfortableColors;

