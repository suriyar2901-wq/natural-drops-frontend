import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, typography } from '../../theme';

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export const ProductPhotoPlaceholder = ({ size = 120, style }: Props) => (
  <View style={[styles.box, { width: size, height: size, borderRadius: 8 }, style]}>
    <View style={[styles.frame, { width: size * 0.42, height: size * 0.32 }]} />
    <Text style={[styles.label, { fontSize: size < 110 ? 11 : 13 }]}>No photo</Text>
  </View>
);

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    borderWidth: 2,
    borderColor: colors.gray400,
    borderRadius: 4,
    marginBottom: 6,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
});
