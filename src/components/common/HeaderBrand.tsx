import React from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface HeaderBrandProps {
  name?: string | null;
  photo?: string | null;
  light?: boolean;
}

const PHOTO_SIZE = 28;

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
  const { width } = useWindowDimensions();
  const displayName = (name || '').trim() || 'Shop';
  const uri = photoUri(photo);
  const initial = displayName.charAt(0).toUpperCase();
  const maxNameWidth = width < 520 ? Math.max(96, width * 0.36) : width >= 960 ? 280 : 200;

  return (
    <View style={[styles.row, { maxWidth: maxNameWidth + PHOTO_SIZE + spacing.sm }]}>
      <View style={[styles.photoFrame, light && styles.photoFrameLight]}>
        {uri ? (
          <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.fallback, light && styles.fallbackLight]}>
            <Text style={[styles.initial, light && styles.initialLight]}>{initial}</Text>
          </View>
        )}
      </View>
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
    flexShrink: 1,
    minWidth: 0,
    height: 40,
    overflow: 'hidden',
  },
  photoFrame: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    marginRight: spacing.sm,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    flexShrink: 0,
  },
  photoFrameLight: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLight: {
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    minWidth: 0,
  },
  nameLight: {
    color: colors.white,
  },
});
