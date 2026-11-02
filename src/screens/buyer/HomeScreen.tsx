import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Card, EmptyState, Loading, Input, ProductPhotoPlaceholder } from '../../components/common';
import { useGetMenuItemsQuery } from '../../store/api/menuApi';
import { useGetBuyerAccountSummaryQuery } from '../../store/api/buyerAccountApi';
import { useGetBuyerOrdersQuery } from '../../store/api/orderApi';
import { replaceCart } from '../../store/slices/cartSlice';
import { useCart, useAuth } from '../../hooks';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { moneyValue, orderBillPending } from '../../types/shop.types';
import { MenuItem, Order } from '../../types';
import { formatCurrency, formatDeliverySlot } from '../../utils/formatters';
import { shopAvailability } from '../../utils/shopHours';
import { API_BASE_URL } from '../../utils/constants';
import { navigate } from '../../navigation/navigationRef';

const greetingPart = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const deliveryStage = (order: Order): 'scheduled' | 'on_the_way' | 'delivered' => {
  const status = String(order.status || '').toLowerCase();
  if (status === 'delivered') return 'delivered';
  if (status === 'processing' || status === 'confirmed' || status === 'out_for_delivery') return 'on_the_way';
  return 'scheduled';
};

export const HomeScreen = ({ navigation }: any) => {
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const columns = 2;
  const photoSize = Math.min(120, Math.floor((width - spacing.md * 3) / 2) - 24);
  const { user, isBuyer } = useAuth();
  const { data: products, isLoading, refetch, error } = useGetMenuItemsQuery();
  const { data: account } = useGetBuyerAccountSummaryQuery(undefined, { skip: !isBuyer() });
  const { data: buyerOrders = [] } = useGetBuyerOrdersQuery(user?.id || 0, { skip: !isBuyer() || !user?.id });
  const dispatch = useDispatch();
  const { addToCart, getItemQuantity, incrementQuantity, decrementQuantity, totalItems } = useCart();
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [category, setCategory] = useState<'all' | 'water' | 'beverage'>('all');
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
  const lastNormal = useMemo(() => (
    (buyerOrders as Order[]).find((order) => (
      order.status !== 'canceled'
      && !(order.billingNotes || '').toLowerCase().includes('regular')
      && (order.items || []).some((line) => line.menuItemId && line.quantity > 0)
    ))
  ), [buyerOrders]);

  const dueAmount = useMemo(() => {
    const openBills = (buyerOrders as Order[]).filter((order) => order.status !== 'canceled');
    if (openBills.length === 0) return moneyValue(account?.due);
    return openBills.reduce((sum, order) => sum + orderBillPending(order), 0);
  }, [buyerOrders, account?.due]);
  const shopHours = shopAvailability(account?.shopOpenTime, account?.shopCloseTime, account?.shopOpenDays, account?.shopLeaveDates);
  const shopClosed = isBuyer() && shopHours.hasHours && !shopHours.openNow;

  // Refetch products when screen comes into focus to ensure latest products from seller
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  // In-stock only for buyers; then optional search filter
  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }

    const inStock = products.filter((product: MenuItem) => (product.stockQuantity ?? 0) > 0);
    const byCategory = inStock.filter((product: MenuItem) => {
      if (category === 'all') return true;
      const cat = String(product.category || '').toLowerCase();
      if (category === 'beverage') return cat.includes('beverage') || cat.includes('drink');
      return !cat.includes('beverage') && !cat.includes('drink');
    });
    if (!searchQuery.trim()) return byCategory;
    const query = searchQuery.toLowerCase().trim();
    return byCategory.filter((product: MenuItem) => (product.name || '').toLowerCase().includes(query));
  }, [products, searchQuery, category]);

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
    const isBeverage = String(item.category || '').toLowerCase().includes('beverage')
      || String(item.category || '').toLowerCase().includes('drink');
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.productCardWrap}
        onPress={() => navigate('ProductDetail', { productId: item.id })}
      >
        <Card style={styles.productCard}>
          <View style={[styles.imageContainer, { height: photoSize, backgroundColor: isBeverage ? '#FFE9E6' : '#E3F1FF' }]}>
            {isValidImageUrl ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.productImage}
                resizeMode="contain"
                onError={() => setFailedImages((prev) => new Set(prev).add(item.id))}
              />
            ) : (
              <ProductPhotoPlaceholder size={Math.min(72, photoSize - 16)} />
            )}
          </View>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productDescription} numberOfLines={1}>
            {item.description?.trim() || item.packSize || (isBeverage ? 'Beverage' : 'Refill, return empty can')}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(item.rate || 0)}</Text>
            {qty > 0 ? (
              <View style={styles.qtyControl}>
                <TouchableOpacity style={styles.qtyBtnSm} onPress={() => decrementQuantity(item.id)}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{qty}</Text>
                <TouchableOpacity style={styles.qtyBtnSm} onPress={() => incrementQuantity(item.id)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => addToCart(item, 1)}
                accessibilityLabel={`Add ${item.name}`}
              >
                <Ionicons name="add" size={20} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading products..." />;
  }

  const firstName = (user?.fullName || user?.username || 'there').split(' ')[0];
  const stage = nextDelivery ? deliveryStage(nextDelivery) : 'scheduled';
  const usualLabel = lastNormal
    ? (lastNormal.items || []).map((line) => `${line.quantity}× ${line.itemName}`).join(', ')
    : '';

  const reorderUsual = () => {
    if (!lastNormal) return;
    const lines = (lastNormal.items || []).filter((line) => line.menuItemId && line.quantity > 0);
    if (!lines.length) {
      showErrorToast('This order has no products to add again');
      return;
    }
    dispatch(replaceCart(lines.map((line) => ({
      quantity: line.quantity,
      menuItem: {
        id: line.menuItemId,
        name: line.itemName,
        category: 'water',
        stockQuantity: 0,
        rate: line.rate || 0,
        createdAt: '',
        updatedAt: '',
      } as MenuItem,
    }))));
    showSuccessToast('Usual order copied to cart');
    const parentNav = navigation?.getParent?.();
    if (parentNav?.navigate) parentNav.navigate('Cart');
    else navigation.navigate('Cart');
  };

  const pageHeader = (
    <>
      <View style={styles.header}>
        <Text style={styles.greeting}>{greetingPart()}.</Text>
        <Text style={styles.greetingName}>Hi {firstName}, need water today?</Text>
      </View>

      {isBuyer() ? (
        <View style={[styles.dashRow, compact && styles.dashRowCompact]}>
          <Card style={styles.dashCard}>
            <View style={styles.dashLabelRow}>
              <Ionicons name="wallet-outline" size={16} color={colors.warning} />
              <Text style={styles.dashLabel}>Amount due</Text>
            </View>
            <Text style={styles.dashValue}>{formatCurrency(dueAmount)}</Text>
            <TouchableOpacity style={styles.dashPrimary} onPress={() => navigation.navigate('BuyerPayments')}>
              <Text style={styles.dashPrimaryText}>Pay now</Text>
            </TouchableOpacity>
          </Card>
          <Card style={styles.dashCard}>
            <View style={styles.dashLabelRow}>
              <Ionicons name="water-outline" size={16} color={colors.primary} />
              <Text style={styles.dashLabel}>Cans to return</Text>
            </View>
            <Text style={styles.dashValue}>{account?.emptyCans || 0} cans</Text>
            <TouchableOpacity
              style={styles.dashSecondary}
              onPress={() => navigation.getParent()?.navigate('BuyerEmptyCans') || navigation.navigate('BuyerEmptyCans')}
            >
              <Text style={styles.dashSecondaryText}>Schedule pickup</Text>
            </TouchableOpacity>
          </Card>
        </View>
      ) : null}

      {isBuyer() && lastNormal ? (
        <Card style={styles.usualCard}>
          <View style={styles.usualIcon}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </View>
          <View style={styles.usualCopy}>
            <Text style={styles.usualTitle}>Your usual order</Text>
            <Text style={styles.usualMeta} numberOfLines={1}>{usualLabel}</Text>
          </View>
          <TouchableOpacity style={styles.usualBtn} onPress={reorderUsual}>
            <Text style={styles.usualBtnText}>Reorder</Text>
          </TouchableOpacity>
        </Card>
      ) : null}

      {isBuyer() && nextDelivery ? (
        <Card style={styles.nextCard}>
          <View style={styles.nextTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextTitle}>Next delivery · Order #{nextDelivery.id}</Text>
              <Text style={styles.nextSlot}>{formatDeliverySlot(nextDelivery)}</Text>
            </View>
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => navigation.getParent()?.navigate('OrderDetail', { order: nextDelivery }) || navigation.navigate('OrderDetail', { order: nextDelivery })}
            >
              <Text style={styles.trackBtnText}>Track order</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.stepper}>
            {([
              { key: 'scheduled', label: 'Scheduled' },
              { key: 'on_the_way', label: 'On the way' },
              { key: 'delivered', label: 'Delivered' },
            ] as const).map((item, index) => {
              const current = stage === 'scheduled' ? 0 : stage === 'on_the_way' ? 1 : 2;
              const on = index <= current;
              return (
                <View key={item.key} style={styles.stepItem}>
                  <View style={[styles.stepDot, on && styles.stepDotOn]} />
                  <Text style={[styles.stepLabel, on && styles.stepLabelOn]}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}

      {shopClosed && (
        <Card style={styles.closedCard}>
          <Text style={styles.closedTitle}>Shop is closed</Text>
          <Text style={styles.closedText}>
            The shop opens next {shopHours.nextLabel}. You can still place an order.
          </Text>
        </Card>
      )}

      <Text style={styles.shopHeading}>Shop</Text>
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search products"
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.catRow}>
        {([
          { id: 'all' as const, label: 'All' },
          { id: 'water' as const, label: 'Water' },
          { id: 'beverage' as const, label: 'Beverages' },
        ]).map((item) => {
          const on = category === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.catPill, on && styles.catPillOn]}
              onPress={() => setCategory(item.id)}
            >
              <Text style={[styles.catPillText, on && styles.catPillTextOn]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        key={columns}
        style={styles.list}
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.productRow : undefined}
        ListHeaderComponent={pageHeader}
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
        style={[styles.cartButton, compact && styles.cartButtonCompact]}
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
        <Ionicons name="cart-outline" size={20} color={colors.white} />
        <Text style={styles.cartButtonText}>View Cart{totalItems > 0 ? ` (${totalItems})` : ''}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtnSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 16,
  },
  qtyValue: {
    minWidth: 22,
    textAlign: 'center',
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary,
  },
  greeting: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'rgba(255,255,255,0.9)',
  },
  greetingName: {
    marginTop: 4,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  dashRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: -spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  dashRowCompact: { flexDirection: 'column' },
  dashCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  dashLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  dashLabel: { color: colors.textSecondary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm },
  dashValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  dashPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dashPrimaryText: { color: colors.white, fontWeight: typography.fontWeight.bold },
  dashSecondary: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dashSecondaryText: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  usualCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  usualIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usualCopy: { flex: 1 },
  usualTitle: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
  usualMeta: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold, marginTop: 2 },
  usualBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  usualBtnText: { color: colors.white, fontWeight: typography.fontWeight.bold },
  nextCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  nextTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  nextTitle: { color: colors.textSecondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  nextSlot: { marginTop: 4, color: colors.textPrimary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base },
  trackBtn: {
    backgroundColor: '#FFF1D6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trackBtnText: { color: '#8A5200', fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.sm },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gray300, marginBottom: 6 },
  stepDotOn: { backgroundColor: colors.primary },
  stepLabel: { fontSize: typography.fontSize.xs, color: colors.textSecondary },
  stepLabelOn: { color: colors.primary, fontWeight: typography.fontWeight.semibold },
  closedCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  closedTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.xs },
  closedText: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
  shopHeading: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchInput: { marginBottom: 0 },
  catRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catPillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  catPillText: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  catPillTextOn: { color: colors.white },
  list: { flex: 1 },
  listContent: { paddingBottom: 110 },
  productRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  productCardWrap: { flex: 1, marginBottom: spacing.sm },
  productCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    minWidth: 0,
  },
  imageContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  productImage: { width: '80%', height: '80%' },
  productName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    minHeight: 40,
  },
  productDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  emptyContainer: { padding: spacing.xl, alignItems: 'center' },
  errorText: { fontSize: typography.fontSize.sm, color: colors.error, marginTop: spacing.sm },
  cartButtonCompact: { right: spacing.md, bottom: spacing.md },
  cartButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 30,
    ...shadows.lg,
  },
  cartButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

