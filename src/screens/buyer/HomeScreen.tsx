import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Alert, Platform, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme';
import { Card, EmptyState, Loading, Input, HeaderBrand, ProductPhotoPlaceholder } from '../../components/common';
import { useGetMenuItemsQuery } from '../../store/api/menuApi';
import { useGetBuyerAccountSummaryQuery } from '../../store/api/buyerAccountApi';
import { useGetBuyerOrdersQuery } from '../../store/api/orderApi';
import { useCart, useAuth } from '../../hooks';
import { moneyValue } from '../../types/shop.types';
import { MenuItem, Order } from '../../types';
import { formatCurrency, formatDeliverySlot } from '../../utils/formatters';
import { shopAvailability } from '../../utils/shopHours';
import { API_BASE_URL } from '../../utils/constants';
import { navigate } from '../../navigation/navigationRef';

export const HomeScreen = ({ navigation }: any) => {
  const { width } = useWindowDimensions();
  const photoSize = width < 520 ? 84 : 120;
  const { user, isBuyer } = useAuth();
  const { data: products, isLoading, refetch, error } = useGetMenuItemsQuery();
  const { data: account } = useGetBuyerAccountSummaryQuery(undefined, { skip: !isBuyer() });
  const { data: buyerOrders = [] } = useGetBuyerOrdersQuery(user?.id || 0, { skip: !isBuyer() || !user?.id });
  const { addToCart, getItemQuantity, incrementQuantity, decrementQuantity, totalItems } = useCart();
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const nextDelivery = useMemo(() => {
    const open = (buyerOrders as Order[]).filter((order) => (
      order.status !== 'canceled'
      && order.status !== 'delivered'
      && !!order.scheduledDeliveryDate
    ));
    open.sort((left, right) => {
      const dateCompare = String(left.scheduledDeliveryDate).localeCompare(String(right.scheduledDeliveryDate));
      if (dateCompare !== 0) return dateCompare;
      return String(left.estimatedDelivery || '').localeCompare(String(right.estimatedDelivery || ''));
    });
    return open[0];
  }, [buyerOrders]);
  const shopHours = shopAvailability(account?.shopOpenTime, account?.shopCloseTime, account?.shopOpenDays, account?.shopLeaveDates);
  const shopClosed = isBuyer() && shopHours.hasHours && !shopHours.openNow;

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
          <View style={[styles.imageContainer, { width: photoSize, height: photoSize }]}>
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
          <View style={[styles.placeholderImage, { width: photoSize, height: photoSize }]}>
            <ProductPhotoPlaceholder size={photoSize} />
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
        {isBuyer() && (
          <View style={styles.shopBrand}>
            <HeaderBrand
              name={account?.companyName || account?.sellerBusiness}
              photo={account?.sellerProfilePhoto}
              light
            />
          </View>
        )}
        <Text style={styles.greeting}>Welcome, {user?.username || user?.fullName || 'User'}!</Text>
        <Text style={styles.subtitle}>
          {shopHours.hasHours
            ? `Shop available ${shopHours.openLabel} to ${shopHours.closeLabel}`
            : 'Order fresh water today'}
        </Text>
        {isBuyer() && (
          <View style={styles.accountRow}>
            <TouchableOpacity
              style={styles.accountChip}
              onPress={() => navigation.navigate('BuyerPayments')}
            >
              <Text style={styles.accountValue}>{formatCurrency(moneyValue(account?.due))}</Text>
              <Text style={styles.accountLabel}>Due</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.accountChip}
              onPress={() => navigation.getParent()?.navigate('BuyerEmptyCans') || navigation.navigate('BuyerEmptyCans')}
            >
              <Text style={styles.accountValue}>{account?.emptyCans || 0}</Text>
              <Text style={styles.accountLabel}>Cans to return</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isBuyer() && nextDelivery && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.getParent()?.navigate('OrderDetail', { order: nextDelivery }) || navigation.navigate('OrderDetail', { order: nextDelivery })}
        >
          <Card style={styles.nextDelivery}>
            <Text style={styles.nextDeliveryTitle}>Next delivery</Text>
            <Text style={styles.nextDeliverySlot}>{formatDeliverySlot(nextDelivery)}</Text>
            <Text style={styles.nextDeliveryMeta}>Order #{nextDelivery.id}</Text>
          </Card>
        </TouchableOpacity>
      )}

      {shopClosed && (
        <Card style={styles.closedCard}>
          <Text style={styles.closedTitle}>Shop is closed</Text>
          <Text style={styles.closedText}>
            The shop opens next {shopHours.nextLabel}. You can still place an order. The seller will receive it, and it will be taken when the shop opens.
          </Text>
        </Card>
      )}

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
              <EmptyState title="No products found" message="Try a different search term." />
            ) : (
              <>
                <EmptyState title="No products available" message="Products from your seller will show here." />
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
            Alert.alert('Info', msg);
            return;
          }
          // Cart is not a bottom tab anymore; it lives in the parent Stack.
          const parentNav = navigation?.getParent?.();
          if (parentNav?.navigate) parentNav.navigate('Cart');
          else navigation.navigate('Cart');
        }}
      >
        <Text style={styles.cartButtonText}>View Cart{totalItems > 0 ? ` (${totalItems})` : ''}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
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
  shopBrand: {
    marginBottom: spacing.sm,
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
  accountRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  closedCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  closedTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  closedText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  nextDelivery: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  nextDeliveryTitle: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
  nextDeliverySlot: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.base,
  },
  nextDeliveryMeta: {
    marginTop: 2,
    color: colors.textSecondary,
  },
  accountChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    padding: spacing.sm,
  },
  accountValue: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  accountLabel: {
    color: colors.white,
    opacity: 0.85,
    marginTop: 2,
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
    paddingBottom: 110,
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
    minWidth: 0,
  },
  productName: {
    flexShrink: 1,
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

