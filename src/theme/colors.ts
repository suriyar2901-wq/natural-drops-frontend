/**
 * Neo Design System 2.0 foundation and semantic colors.
 * Existing names stay so screens keep working. New names match the spec tokens.
 */
export const colors = {
  blue600: '#0232AA',
  blue700: '#01267F',
  blue500: '#2A55C9',
  blue300: '#8EA6E6',
  blue100: '#E4EAF9',
  blue50: '#F1F4FC',
  ink900: '#111111',
  ink800: '#1C1C1E',
  grayReadable: '#666A70',
  canvas: '#F4F5F6',

  primary: '#0232AA',
  primaryDark: '#01267F',
  primaryLight: '#2A55C9',

  secondary: '#E4EAF9',
  secondaryDark: '#01267F',
  secondaryLight: '#F1F4FC',

  success: '#166534',
  successTint: '#F0FDF4',
  warning: '#854A0E',
  warningTint: '#FFFAEB',
  error: '#B42318',
  errorTint: '#FEF3F2',
  info: '#0232AA',

  white: '#FFFFFF',
  black: '#111111',
  background: '#F4F5F6',
  surface: '#FFFFFF',

  textPrimary: '#111111',
  textSecondary: '#666A70',
  textDisabled: '#666A70',
  textOnPrimary: '#FFFFFF',

  border: '#E8EAEC',
  borderDark: '#666A70',

  gray50: '#F7F8F8',
  gray100: '#F1F2F3',
  gray200: '#E8EAEC',
  gray300: '#D5D7DA',
  gray400: '#8E9094',
  gray500: '#8E9094',
  gray600: '#666A70',
  gray700: '#666A70',
  gray800: '#1C1C1E',
  gray900: '#111111',

  gradientStart: '#0232AA',
  gradientEnd: '#0232AA',

  pending: '#854A0E',
  delivered: '#166534',
  cancelled: '#B42318',

  overlay: 'rgba(17, 17, 17, 0.45)',
  overlayLight: 'rgba(17, 17, 17, 0.28)',
};

export type Colors = typeof colors;
