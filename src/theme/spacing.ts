import { Platform } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  space12: 12,
  md: 16,
  space20: 20,
  lg: 24,
  xl: 32,
  space40: 40,
  '2xl': 48,
  '3xl': 64,
};

export const borderRadius = {
  none: 0,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  sheet: 28,
  '2xl': 24,
  full: 999,
};

export const shadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...(Platform.OS === 'web' && { boxShadow: 'none' } as any),
  },
  sm: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    ...(Platform.OS === 'web' && { boxShadow: '0 1px 2px rgba(17, 17, 17, 0.04)' } as any),
  },
  md: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    ...(Platform.OS === 'web' && { boxShadow: '0 2px 8px rgba(17, 17, 17, 0.10)' } as any),
  },
  lg: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    ...(Platform.OS === 'web' && { boxShadow: '0 2px 8px rgba(17, 17, 17, 0.10)' } as any),
  },
  xl: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
    ...(Platform.OS === 'web' && { boxShadow: '0 -4px 24px rgba(17, 17, 17, 0.06)' } as any),
  },
};

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;

