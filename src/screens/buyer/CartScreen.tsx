import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Card, Button, LocationSelectionModal } from '../../components/common';
import { useCart, useAuth } from '../../hooks';
import { useCreateOrderMutation } from '../../store/api/orderApi';
import { formatCurrency } from '../../utils/formatters';
import { CartItem, CreateOrderRequest } from '../../types';
import { useDispatch } from 'react-redux';
import { calculateTotals } from '../../store/slices/cartSlice';

export const CartScreen = ({ navigation }: any) => {
  const { items, total, subtotal, tax, deliveryCharge, incrementQuantity, decrementQuantity, removeFromCart, clearCart, getCartForOrder } = useCart();
  const { user } = useAuth();
  const [createOrder, { isLoading }] = useCreateOrderMutation();
  const dispatch = useDispatch();
  
  // Delivery location state
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | undefined>();
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | undefined>();
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Recalculate totals if items exist but total is invalid
  useEffect(() => {
    if (items.length > 0 && (!total || total === 0 || isNaN(total) || !isFinite(total))) {
      console.log('🔄 Recalculating cart totals...');
      dispatch(calculateTotals());
    }
  }, [items, total, dispatch]);

  const navigateToShop = () => {
    // Cart is a Stack screen; the Shop tab lives inside BuyerApp's Tab Navigator.
    try {
      navigation.navigate('BuyerApp', { screen: 'Home' });
      return;
    } catch {}
    try {
      navigation.navigate('Home');
      return;
    } catch {}
    const parentNav = navigation?.getParent?.();
    if (parentNav?.navigate) {
      try {
        parentNav.navigate('Home');
        return;
      } catch {}
    }
    // last resort
    if (navigation?.goBack) navigation.goBack();
  };

  /**
   * Validate latitude and longitude coordinates
   */
  const validateCoordinates = (lat?: number, lon?: number): boolean => {
    // If both are undefined, that's valid (saved address without GPS)
    if (lat === undefined && lon === undefined) {
      return true;
    }
    
    // If one is provided, both must be provided
    if ((lat === undefined) !== (lon === undefined)) {
      return false;
    }
    
    // If both are provided, validate them
    if (lat !== undefined && lon !== undefined) {
      // Check if they are valid numbers
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return false;
      }
      
      // Check if they are not NaN or Infinity
      if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
        return false;
      }
      
      // Validate latitude range: -90 to 90
      if (lat < -90 || lat > 90) {
        return false;
      }
      
      // Validate longitude range: -180 to 180
      if (lon < -180 || lon > 180) {
        return false;
      }
    }
    
    return true;
  };


  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before checkout');
      return;
    }

    if (!user) {
      Alert.alert('Not Logged In', 'Please login to place an order');
      return;
    }

    // Show location selection modal first
    setShowLocationModal(true);
  };

  const handleLocationSelected = (address: string, latitude?: number, longitude?: number) => {
    console.log('📍 Delivery location selected:', { address, latitude, longitude });
    
    // Validate coordinates if provided
    if (latitude !== undefined || longitude !== undefined) {
      if (!validateCoordinates(latitude, longitude)) {
        console.error('❌ Invalid coordinates received:', { latitude, longitude });
        Alert.alert(
          'Invalid Location',
          'The location coordinates are invalid. Please select location again.'
        );
        return;
      }
    }
    
    setDeliveryAddress(address);
    setDeliveryLatitude(latitude);
    setDeliveryLongitude(longitude);
    // Close modal and proceed with order placement
    setShowLocationModal(false);
    // Proceed with order placement after location is selected
    proceedWithOrder(address, latitude, longitude);
  };

  const proceedWithOrder = async (address: string, latitude?: number, longitude?: number) => {
    try {
      console.log('🛒 Starting checkout process...');
      console.log('📦 Cart items:', items);
      console.log('💰 Cart total:', total);
      console.log('💰 Cart subtotal:', subtotal);
      console.log('💰 Cart tax:', tax);
      console.log('💰 Cart deliveryCharge:', deliveryCharge);
      console.log('👤 User:', user);

      if (!user) {
        Alert.alert('Not Logged In', 'Please login to place an order');
        return;
      }

      // Recalculate total to ensure it's valid
      const calculatedSubtotal = items.reduce(
        (sum, item) => sum + (item.menuItem.rate || 0) * item.quantity,
        0
      );
      const calculatedTax = (calculatedSubtotal * 5) / 100; // 5% tax
      const calculatedDeliveryCharge = deliveryCharge || 20;
      const calculatedTotal = calculatedSubtotal + calculatedTax + calculatedDeliveryCharge;

      // Ensure total is a valid number
      const finalTotal = Number(calculatedTotal) || Number(total) || 0;

      if (finalTotal <= 0) {
        Alert.alert('Invalid Total', 'Cart total must be greater than 0. Please check your cart items.');
        return;
      }

      // Prepare order items in the format expected by backend
      const orderItems = items.map((item) => ({
        menuItemId: item.menuItem.id,
        itemName: item.menuItem.name,
        quantity: item.quantity,
        rate: Number(item.menuItem.rate || 0),
        cartQuantity: item.quantity,
        subtotal: Number((item.menuItem.rate || 0) * item.quantity),
      }));

      // Ensure coordinates are valid before sending
      const validLatitude = (latitude !== undefined && validateCoordinates(latitude, longitude))
        ? latitude
        : undefined;
      const validLongitude = (longitude !== undefined && validateCoordinates(latitude, longitude))
        ? longitude
        : undefined;

      const orderData: CreateOrderRequest = {
        buyerId: user.id,
        buyerName: user.username || 'Unknown',
        buyerPhone: user.phone || '',
        buyerAddress: user.address || 'Not specified',
        deliveryAddress: address.trim(), // Use the address parameter
        latitude: validLatitude,
        longitude: validLongitude,
        total: finalTotal,
        items: orderItems,
      };

      console.log('📤 Order data to send:', JSON.stringify(orderData, null, 2));
      console.log('✅ Final total value:', finalTotal, 'Type:', typeof finalTotal);

      const order = await createOrder(orderData).unwrap();
      console.log('✅ Order created successfully:', order);
      
      clearCart();
      // Reset delivery location state
      setDeliveryAddress('');
      setDeliveryLatitude(undefined);
      setDeliveryLongitude(undefined);
      
      // Redirect to Shop immediately after checkout (no "Browse Products" empty state)
      navigateToShop();
      Alert.alert(
        'Order Placed',
        `Your order #${order.id} has been placed successfully!\n\nTotal: ${formatCurrency(total)}`
      );
    } catch (error: any) {
      console.error('❌ Order creation failed:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      Alert.alert(
        'Order Failed',
        error?.data?.message || error?.message || 'Failed to place order. Please try again.'
      );
    }
  };

  const resolveMenuItemId = (cartItem: CartItem): number | undefined => {
    const anyItem: any = cartItem?.menuItem as any;
    return (cartItem?.menuItem as any)?.id ?? anyItem?.menuItemId;
  };

  const handleClearCart = () => {
    const doClear = () => {
      clearCart();
      // Also reset delivery location when clearing cart
      setDeliveryAddress('');
      setDeliveryLatitude(undefined);
      setDeliveryLongitude(undefined);
      // Instantly navigate back to Shop (no redirecting screen)
      navigateToShop();
    };

    // Web: Alert.alert callbacks are unreliable; use window.confirm
    if (Platform.OS === 'web') {
      const confirmed = (window as any).confirm('Are you sure you want to clear the cart?');
      if (confirmed) doClear();
      return;
    }

    Alert.alert('Clear Cart', 'Are you sure you want to clear the cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', onPress: doClear, style: 'destructive' },
    ]);
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <Card style={styles.cartItem}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.menuItem.name}</Text>
          <Text style={styles.itemSize}>{item.menuItem.packSize}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            const id = resolveMenuItemId(item);
            if (typeof id !== 'number') {
              Alert.alert('Error', 'Unable to remove item. Please try again.');
              return;
            }
            removeFromCart(id);
          }}
        >
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.itemFooter}>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => {
              const id = resolveMenuItemId(item);
              if (typeof id !== 'number') return;
              decrementQuantity(id);
            }}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => {
              const id = resolveMenuItemId(item);
              if (typeof id !== 'number') return;
              incrementQuantity(id);
            }}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.itemPrice}>
          {formatCurrency((item.menuItem.rate || 0) * item.quantity)}
        </Text>
      </View>
    </Card>
  );

  // If cart is empty, auto-redirect to Shop page
  useEffect(() => {
    if (items.length === 0) {
      // Auto-bounce back to Shop if user reaches an empty Cart screen
      navigateToShop();
    }
  }, [items.length, navigation]);

  if (items.length === 0) {
    // Avoid showing a flash of "redirecting" UI; navigation happens in the effect above.
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderCartItem}
        keyExtractor={(item, index) =>
          String((item as any)?.menuItem?.id ?? (item as any)?.menuItem?.menuItemId ?? index)
        }
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.summaryContainer}>
            <Card>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax</Text>
                <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Charge</Text>
                <Text style={styles.summaryValue}>{formatCurrency(deliveryCharge)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
              </View>
            </Card>
          </View>
        }
      />

      <View style={styles.footer}>
        <Button
          title="Clear Cart"
          onPress={handleClearCart}
          variant="outline"
          style={styles.clearButton}
        />
        <Button
          title={`Checkout (${formatCurrency(total)})`}
          onPress={handleCheckout}
          loading={isLoading}
          style={styles.checkoutButton}
        />
      </View>
      
      {/* Location Selection Modal - Shows when user clicks Checkout */}
      <LocationSelectionModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onLocationSelected={handleLocationSelected}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  cartItem: {
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemSize: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  removeText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    fontWeight: typography.fontWeight.medium,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  quantity: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginHorizontal: spacing.md,
    minWidth: 30,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  summaryContainer: {
    marginTop: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  clearButton: {
    flex: 1,
  },
  checkoutButton: {
    flex: 2,
  },
  locationSection: {
    marginBottom: spacing.md,
  },
});

