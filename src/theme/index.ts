import { colors } from './colors';
import { comfortableColors } from './comfortableColors';
import { typography } from './typography';
import { spacing, borderRadius, shadows } from './spacing';

export const theme = {
  colors,
  comfortableColors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export type Theme = typeof theme;

export { colors, comfortableColors, typography, spacing, borderRadius, shadows };

