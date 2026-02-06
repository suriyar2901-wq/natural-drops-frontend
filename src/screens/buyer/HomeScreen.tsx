import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme';
import { Card, Loading, Input } from '../../components/common';
import { useGetMenuItemsQuery } from '../../store/api/menuApi';
import { useCart, useAuth } from '../../hooks';
import { MenuItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { API_BASE_URL } from '../../utils/constants';
import { navigate } from '../../navigation/navigationRef';

export const HomeScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { data: products, isLoading, refetch, error } = useGetMenuItemsQuery();
  const { addToCart, getItemQuantity, incrementQuantity, decrementQuantity, totalItems } = useCart();
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Refetch products when screen comes into focus to ensure latest products from seller
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Filter products based on search query (case-insensitive)
  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }
    
    if (!searchQuery.trim()) {
      return products;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return products.filter((product: MenuItem) => {
      const productName = product.name?.toLowerCase() || '';
      return productName.includes(query);
    });
  }, [products, searchQuery]);

  const renderProduct = ({ item }: { item: MenuItem }) => {
    // Get image URL - prioritize images array, then direct image field
    // Check both primary image and first image in array
    let imageUrl: string | null = null;
    
    // First, try to get from images array (preferred)
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      // Find primary image first, or use first image
      const primaryImage = item.images.find((img: any) => img.isPrimary || img.primary);
      imageUrl = primaryImage?.imageUrl || primaryImage?.url || item.images[0]?.imageUrl || item.images[0]?.url || null;
    }
    
    // Fallback to direct image field
    if (!imageUrl && item.image) {
      imageUrl = item.image;
    }
    
    // FILTER OUT placeholder.com URLs immediately - don't even try to load them
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.includes('via.placeholder.com')) {
      imageUrl = null; // Set to null so we show placeholder instead
    }
    
    const imageFailed = failedImages.has(item.id);
    
    // If imageUrl is a relative path, convert it to absolute URL
    if (imageUrl && typeof imageUrl === 'string') {
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:') && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('/')) {
        // If it's a relative path without leading slash, try to construct full URL
        // Remove /api from API_BASE_URL to get base server URL
        const baseServerUrl = API_BASE_URL.replace('/api', '');
        imageUrl = `${baseServerUrl}/${imageUrl}`;
      } else if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
        // If it starts with single slash, make it absolute
        const baseServerUrl = API_BASE_URL.replace('/api', '');
        imageUrl = `${baseServerUrl}${imageUrl}`;
      }
    }
    
    // Validate image URL
    const isBlobUrl = imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('blob:');
    const isBase64 = imageUrl && typeof imageUrl === 'string' && (imageUrl.startsWith('data:image') || imageUrl.startsWith('data:'));
    const isExternalUrl = imageUrl && typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
    
    // Show image if it's base64, valid external URL (not placeholder.com), or if we have any URL to try
    // But don't show if we know it failed to load
    // Also ensure we never try to load placeholder.com URLs
    const imageUri = typeof imageUrl === 'string' ? imageUrl : undefined;
    const isValidImageUrl = !imageFailed && 
      !!imageUri && 
      imageUri.trim() !== '' && 
      !imageUri.includes('via.placeholder.com') && (
        isBase64 || 
        (isExternalUrl && !imageUri.includes('via.placeholder.com')) ||
        (!isBlobUrl && imageUri.length > 0)
      );
    
    const qty = getItemQuantity(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          // Navigate to PDP using root navigation ref (works across nested tabs + web deep links)
          navigate('ProductDetail', { productId: item.id });
        }}
      >
        <Card style={styles.productCard}>
        {isValidImageUrl ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.productImage}
              resizeMode="cover"
              onError={() => {
                // Mark this image as failed so we show placeholder on next render
                setFailedImages(prev => new Set(prev).add(item.id));
              }}
              onLoad={() => {
                // Remove from failed set if it loads successfully
                setFailedImages(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(item.id);
                  return newSet;
                });
              }}
            />
          </View>
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>📦</Text>
            <Text style={styles.placeholderSubtext}>No image</Text>
          </View>
        )}
        
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.name}</Text>
          {item.packSize && (
            <Text style={styles.productSize}>{item.packSize}</Text>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(item.rate || 0)}</Text>
          </View>
          {!!item.description?.trim() && (
            <Text style={styles.productDescription} numberOfLines={3}>
              {item.description.trim()}
            </Text>
          )}
          <Text style={styles.description}>{item.category || 'Uncategorized'}</Text>
          
          <View style={styles.quantityRow}>
            <Text style={styles.inCartText}>In Cart: {qty}</Text>
            <View style={styles.qtyControl}>
              <TouchableOpacity
                style={[styles.qtyBtn, qty === 0 && styles.qtyBtnDisabled]}
                onPress={() => {
                  if (qty > 0) decrementQuantity(item.id);
                }}
                disabled={qty === 0}
              >
                <Text style={[styles.qtyBtnText, qty === 0 && styles.qtyBtnTextDisabled]}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{qty}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => {
                  if (qty === 0) addToCart(item, 1);
                  else incrementQuantity(item.id);
                }}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading products..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {user?.username || user?.fullName || 'User'}!</Text>
        <Text style={styles.subtitle}>Order fresh water today</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search products…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {searchQuery.trim() ? (
              <>
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>No products available</Text>
                {error && (
                  <Text style={styles.errorText}>
                    {(() => {
                      const anyErr: any = error as any;
                      return anyErr?.data?.message || anyErr?.message || 'Failed to load products';
                    })()}
                  </Text>
                )}
              </>
            )}
          </View>
        }
      />

      <TouchableOpacity
        style={styles.cartButton}
        onPress={() => {
          if (!totalItems || totalItems <= 0) {
            const msg = 'Your cart is empty. Please add items before viewing the cart.';
            // Web: Alert.alert callbacks/popups are unreliable; use window.alert
            if (Platform.OS === 'web') {
              (window as any).alert(msg);
            } else {
              Alert.alert('Info', msg);
            }
            return;
          }
          // Cart is not a bottom tab anymore; it lives in the parent Stack.
          const parentNav = navigation?.getParent?.();
          if (parentNav?.navigate) parentNav.navigate('Cart');
          else navigation.navigate('Cart');
        }}
      >
        <Text style={styles.cartButtonText}>View Cart</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  inCartText: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    backgroundColor: colors.gray300,
  },
  qtyBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 18,
  },
  qtyBtnTextDisabled: {
    color: colors.white,
    opacity: 0.9,
  },
  qtyValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginHorizontal: spacing.xs,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    backgroundColor: colors.primary,
  },
  greeting: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.white,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  searchInput: {
    marginBottom: 0,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  productCard: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  placeholderText: {
    fontSize: 48,
  },
  placeholderSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  productSize: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  mrp: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  productDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.sm,
  },
  cartButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 30,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
    },
  },
  cartButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

