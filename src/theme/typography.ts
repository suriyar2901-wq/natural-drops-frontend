export const typography = {
  fontFamily: {
    regular: 'Space Grotesk',
    medium: 'Space Grotesk',
    bold: 'Space Grotesk',
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    titleLg: 28,
    '3xl': 28,
    display: 40,
    '4xl': 40,
  },
  
  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeight: {
    caption: 16,
    bodySm: 20,
    heading: 24,
    body: 24,
    button: 24,
    title: 26,
    titleLg: 34,
    display: 44,
    tight: 16,
    normal: 24,
    relaxed: 34,
  },
};

export type Typography = typeof typography;

