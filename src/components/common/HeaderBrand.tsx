import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface HeaderBrandProps {
  name?: string | null;
  photo?: string | null;
  light?: boolean;
}

const photoUri = (photo?: string | null) => {
  if (!photo) {
    return undefined;
  }
  if (photo.startsWith('data:') || photo.startsWith('http') || photo.startsWith('/')) {
    return photo;
  }
  return `data:image/jpeg;base64,${photo}`;
};

export const HeaderBrand: React.FC<HeaderBrandProps> = ({ name, photo, light }) => {
  const displayName = (name || '').trim() || 'Shop';
  const uri = photoUri(photo);
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.row}>
      {uri ? (
        <Image source={{ uri }} style={[styles.photo, light && styles.photoLight]} />
      ) : (
        <View style={[styles.fallback, light && styles.fallbackLight]}>
          <Text style={[styles.initial, light && styles.initialLight]}>{initial}</Text>
        </View>
      )}
      <Text style={[styles.name, light && styles.nameLight]} numberOfLines={1}>
        {displayName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 260,
  },
  photo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.sm,
    backgroundColor: colors.gray100,
  },
  photoLight: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  fallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLight: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  initial: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  },
  initialLight: {
    color: colors.white,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    flexShrink: 1,
  },
  nameLight: {
    color: colors.white,
  },
});
