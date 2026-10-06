import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { colors, typography, spacing } from '../../theme';
import { Card, EmptyState, Loading, OrderTimer } from '../../components/common';
import { useAuth, useCart } from '../../hooks';
import { useGetBuyerOrdersQuery, useGetBuyerRegularOrderQuery } from '../../store/api/orderApi';
import { replaceCart } from '../../store/slices/cartSlice';
import { 
  useGetUnreadBuyerNotificationsQuery, 
  useGetUnreadBuyerNotificationCountQuery,
  useMarkBuyerNotificationAsReadMutation 
} from '../../store/api/notificationApi';
import { MenuItem, Order, OrderStatus } from '../../types';
import { formatCurrency, formatDateTime, formatOrderStatus } from '../../utils/formatters';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { API_BASE_URL } from '../../utils/constants';
import { storageService } from '../../services/storage.service';
import { ORDER_STATUS_COLORS } from '../../utils/constants';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationPreview } from '../../components/common/NotificationPreview';
import { DeliverySlotBadge } from '../../components/common/DeliverySlotBadge';
import { Ionicons } from '@expo/vector-icons';

const isRegularOrder = (order: Order) => (order.billingNotes || '').toLowerCase().includes('regular');

export const OrdersScreen = ({ navigation }: any) => {
  const { addToCart } = useCart();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [orderFilter, setOrderFilter] = useState<'all' | 'normal' | 'regular'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const { data: regularPlan } = useGetBuyerRegularOrderQuery(undefined, { skip: !user });
  const { data: orders, isLoading, refetch, error } = useGetBuyerOrdersQuery(user?.id || 0, {
    skip: !user,
    // Polling disabled - only refetch on screen focus or manual refresh
    pollingInterval: 0,
  });
  const { data: notifications, isLoading: notificationsLoading, refetch: refetchNotifications } = useGetUnreadBuyerNotificationsQuery(
    user?.id || 0,
    { 
      skip: !user,
      // Polling disabled - only refetch on screen focus or manual refresh
      pollingInterval: 0,
    }
  );
  const { data: unreadCount = 0 } = useGetUnreadBuyerNotificationCountQuery(
    user?.id || 0,
    { 
      skip: !user,
      // Polling disabled - only refetch on screen focus or manual refresh
      pollingInterval: 0,
    }
  );
  const [markAsRead] = useMarkBuyerNotificationAsReadMutation();
  const [preview, setPreview] = useState<any>(null);
  const { showNotification } = useNotifications();
  const previousCountRef = useRef<number>(0);
  const previousNotificationsRef = useRef<any[]>([]);

  // Refetch orders and notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        console.log('🔄 Screen focused - refetching orders and notifications');
        refetch();
        refetchNotifications();
      }
    }, [user?.id, refetch, refetchNotifications])
  );

  // Refetch orders when new notifications arrive
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const hasNewNotification = notifications.some(
        (notif) => !previousNotificationsRef.current.find((prev) => prev.id === notif.id)
      );
      
      if (hasNewNotification) {
        console.log('🔔 New notification detected - refetching orders');
        refetch();
      }
      
      previousNotificationsRef.current = notifications;
    }
  }, [notifications, refetch]);

  // Show push notification when new notification arrives
  useEffect(() => {
    if (unreadCount > previousCountRef.current && previousCountRef.current > 0) {
      const newNotificationsCount = unreadCount - previousCountRef.current;
      console.log(`🔔 ${newNotificationsCount} new notification(s) received`);
      showNotification(
        'Order Update!',
        notifications?.[0]?.message || `You have ${newNotificationsCount} new order update${newNotificationsCount > 1 ? 's' : ''}`,
        { type: 'order' }
      );
      // Refetch orders when notification count increases
      refetch();
    }
    previousCountRef.current = unreadCount;
  }, [unreadCount, showNotification, refetch, notifications]);

  // Debug logging
  useEffect(() => {
    console.log('📦 Buyer Orders loaded:', orders?.length || 0);
    if (orders && orders.length > 0) {
      console.log('📦 Order statuses:', orders.map(o => `Order #${o.id}: ${o.status}`));
      console.log('📦 First order items:', orders[0].items?.length || 0);
    }
    if (error) {
      console.error('❌ Error fetching buyer orders:', error);
    }
  }, [orders, error]);

  // Log notification changes
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      console.log('🔔 Buyer Notifications:', notifications.length);
      notifications.forEach(notif => {
        console.log(`  - ${notif.message} (Order #${notif.orderId})`);
      });
    }
  }, [notifications]);


  const handleReadPreview = async () => {
    if (!preview) return;
    try {
      await markAsRead(preview.id);
      setPreview(null);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getStatusColor = (status: string) => {
    return ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] || colors.gray500;
  };

  const reorder = (order: Order) => {
    const lines = (order.items || []).filter((line) => line.menuItemId && line.quantity > 0);
    if (lines.length === 0) {
      showErrorToast('This order has no products to add again');
      return;
    }
    lines.forEach((line) => {
      const menuItem = {
        id: line.menuItemId,
        name: line.itemName,
        category: 'water',
        stockQuantity: 0,
        rate: line.rate || 0,
        createdAt: '',
        updatedAt: '',
      } as MenuItem;
      addToCart(menuItem, line.quantity);
    });
    showSuccessToast('Products added to cart');
    const parentNav = navigation?.getParent?.();
    if (parentNav?.navigate) parentNav.navigate('Cart');
    else navigation.navigate('Cart');
  };

  const openCart = (params?: { orderKind: 'regular' }) => {
    const parentNav = navigation?.getParent?.();
    if (parentNav?.navigate) parentNav.navigate('Cart', params);
    else navigation.navigate('Cart', params);
  };

  const editRegularOrder = (order: Order) => {
    const planItems = Array.isArray(regularPlan?.items) ? regularPlan.items : [];
    const lines = planItems.length > 0
      ? planItems.map((line: any) => ({
          id: Number(line.menuItemId),
          name: line.itemName,
          quantity: Number(line.quantity) || 1,
          rate: Number(line.rate) || 0,
        }))
      : (order.items || [])
          .filter((line) => line.menuItemId && line.quantity > 0)
          .map((line) => ({
            id: line.menuItemId,
            name: line.itemName,
            quantity: line.quantity,
            rate: line.rate || 0,
          }));
    if (lines.length === 0) {
      showErrorToast('This regular order has no products to edit');
      return;
    }
    dispatch(replaceCart(lines.map((line) => ({
      quantity: line.quantity,
      menuItem: {
        id: line.id,
        name: line.name,
        category: 'water',
        stockQuantity: 0,
        rate: line.rate,
        createdAt: '',
        updatedAt: '',
      } as MenuItem,
    }))));
    openCart({ orderKind: 'regular' });
  };

  const orderDay = (order: Order) => String(order.orderDate || '').slice(0, 10);

  const visibleOrders = useMemo(() => {
    let list = orders || [];
    if (orderFilter === 'regular') list = list.filter(isRegularOrder);
    else if (orderFilter === 'normal') list = list.filter((order) => !isRegularOrder(order));
    if (fromDate) list = list.filter((order) => orderDay(order) >= fromDate);
    if (toDate) list = list.filter((order) => orderDay(order) <= toDate);
    return list;
  }, [orders, orderFilter, fromDate, toDate]);

  const exportOrders = async () => {
    if (fromDate && toDate && fromDate > toDate) {
      showErrorToast('From date must be on or before the To date');
      return;
    }
    if (visibleOrders.length === 0) {
      showErrorToast('No orders in this date range');
      return;
    }
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      if (orderFilter !== 'all') params.set('kind', orderFilter);
      const buyerName = user?.fullName || user?.username || 'Buyer';
      params.set('sellerName', buyerName);
      const token = await storageService.getAuthToken();
      const res = await fetch(`${API_BASE_URL}/orders/export/pdf?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let message = 'Could not export orders';
        try {
          const body = JSON.parse(text);
          message = body?.message || message;
        } catch {
          if (text) message = text;
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const filename = `my-orders${fromDate ? `-${fromDate}` : ''}${toDate ? `-to-${toDate}` : ''}.pdf`;
      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      showSuccessToast('Orders exported');
    } catch (exportError: any) {
      showErrorToast(exportError?.message || 'Could not export orders');
    } finally {
      setExporting(false);
    }
  };

  const downloadBill = async (order: Order) => {
    try {
      setExporting(true);
      const buyerName = user?.fullName || user?.username || 'Buyer';
      const token = await storageService.getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/orders/${order.id}/export/pdf?sellerName=${encodeURIComponent(buyerName)}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let message = 'Could not download this bill';
        try {
          message = JSON.parse(text)?.message || message;
        } catch {
          if (text) message = text;
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const filename = `order-${order.id}-bill.pdf`;
      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      showSuccessToast('Bill downloaded');
    } catch (downloadError: any) {
      showErrorToast(downloadError?.message || 'Could not download this bill');
    } finally {
      setExporting(false);
    }
  };

  const renderOrder = ({ item }: { item: Order }) => {
    return (
        <Card style={styles.orderCard}>
      <TouchableOpacity
        style={styles.billDownload}
        onPress={() => downloadBill(item)}
        disabled={exporting}
      >
        <Ionicons name="download-outline" size={18} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('OrderDetail', { order: item })}
      >
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>Order #{item.id}</Text>
            <View style={styles.headerRight}>
              <OrderTimer order={item} position="header-right" />
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{formatOrderStatus(item.status)}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.orderDate}>{formatDateTime(item.orderDate || item.createdAt)}</Text>

        <View style={styles.orderItems}>
          {item.items && item.items.length > 0 ? (
            item.items.map((orderItem, index) => (
              <Text key={index} style={styles.itemText}>
                {orderItem.quantity}x {orderItem.itemName} - {formatCurrency(orderItem.subtotal)}
              </Text>
            ))
          ) : (
            <Text style={styles.itemText}>No items</Text>
          )}
        </View>

        {(item.deliveryAddress || item.buyerAddress) && (
          <View style={styles.addressContainer}>
            <Text style={styles.addressLabel}>📍 Delivery Address:</Text>
            <Text style={styles.addressText}>
              {item.deliveryAddress || item.buyerAddress || 'Not specified'}
            </Text>
          </View>
        )}

        <View style={styles.orderFooter}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>
              {item.finalBillAmount ? 'Final Bill Amount' : 'Total Amount'}
            </Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(item.finalBillAmount || item.total || item.totalAmount)}
            </Text>
            <DeliverySlotBadge order={item} />
            {item.finalBillAmount && item.finalBillAmount !== item.total && (
              <Text style={styles.originalAmount}>
                Original: {formatCurrency(item.total)}
              </Text>
            )}
            {item.paymentStatus && (
              <View style={[
                styles.paymentStatusBadge,
                item.paymentStatus === 'PAID' && styles.paymentStatusPaid,
                item.paymentStatus === 'UNPAID' && styles.paymentStatusUnpaid,
                item.paymentStatus === 'PARTIALLY_PAID' && styles.paymentStatusPartial,
              ]}>
                <Text style={styles.paymentStatusText}>
                  {item.paymentStatus === 'PAID' ? '🟢 PAID' : 
                   item.paymentStatus === 'UNPAID' ? '🔴 UNPAID' : 
                   '🟡 PARTIALLY PAID'}
                </Text>
              </View>
            )}
            {(item.paymentStatus === 'UNPAID' || item.paymentStatus === 'PARTIALLY_PAID') && (
              <View style={styles.paymentPendingContainer}>
                <Text style={styles.paymentPendingText}>
                  ⚠️ Payment pending. Please contact seller or support.
                </Text>
              </View>
            )}
            {item.status === 'delivered' && (
              <View style={styles.deliveryStatusContainer}>
                <Text style={styles.deliveryStatusText}>
                  ✅ Order Delivered
                </Text>
                {item.deliveredBy && (
                  <Text style={styles.deliveredByText}>
                    Delivered by: {item.deliveredBy}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
        <View style={styles.actionRow}>
          {isRegularOrder(item) && (
            <TouchableOpacity style={styles.editButton} onPress={() => editRegularOrder(item)}>
              <Text style={styles.editText}>Edit regular order</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.reorderButton} onPress={() => reorder(item)}>
            <Text style={styles.reorderText}>Order again</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (isLoading || notificationsLoading) {
    return <Loading fullScreen message="Loading your orders..." />;
  }

  return (
    <View style={styles.container}>
      {/* Notifications Section */}
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.noticeBar} onPress={() => setPreview(notifications?.[0])}>
          <Text style={styles.noticeText}>
            {unreadCount} new update{unreadCount > 1 ? 's' : ''}
          </Text>
          <Text style={styles.noticeAction}>Open</Text>
        </TouchableOpacity>
      )}
      <NotificationPreview
        visible={!!preview}
        message={preview?.message || ''}
        createdAt={preview?.createdAt}
        isRead={false}
        onClose={() => setPreview(null)}
        onRead={handleReadPreview}
      />

      <View style={styles.filterRow}>
        {([
          { id: 'all' as const, label: 'All' },
          { id: 'normal' as const, label: 'Normal order' },
          { id: 'regular' as const, label: 'Regular order' },
        ]).map((option) => {
          const selected = orderFilter === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.filterChip, selected && styles.filterChipActive]}
              onPress={() => setOrderFilter(option.id)}
            >
              <Text style={[styles.filterText, selected && styles.filterTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.exportRow}>
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>From</Text>
          {Platform.OS === 'web' ? (
            React.createElement('input', {
              type: 'date',
              value: fromDate,
              onChange: (event: any) => setFromDate(event.target.value || ''),
              style: dateInputStyle,
            })
          ) : (
            <TextInput
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="yyyy-mm-dd"
              style={styles.dateInput}
            />
          )}
        </View>
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>To</Text>
          {Platform.OS === 'web' ? (
            React.createElement('input', {
              type: 'date',
              value: toDate,
              min: fromDate || undefined,
              onChange: (event: any) => setToDate(event.target.value || ''),
              style: dateInputStyle,
            })
          ) : (
            <TextInput
              value={toDate}
              onChangeText={setToDate}
              placeholder="yyyy-mm-dd"
              style={styles.dateInput}
            />
          )}
        </View>
        {(fromDate || toDate) && (
          <TouchableOpacity onPress={() => { setFromDate(''); setToDate(''); }}>
            <Text style={styles.clearDates}>Clear</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
          onPress={exportOrders}
          disabled={exporting}
        >
          <Text style={styles.exportButtonText}>{exporting ? 'Exporting...' : 'Export'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={isLoading} 
            onRefresh={() => {
              refetch();
              refetchNotifications();
            }} 
            colors={[colors.primary]} 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              title={(fromDate || toDate) ? 'No orders in this date range' : orderFilter === 'all' ? 'No orders yet' : orderFilter === 'regular' ? 'No regular orders' : 'No normal orders'}
              message={(fromDate || toDate) ? 'Choose another date range, or clear the dates.' : orderFilter === 'all' ? 'Start shopping to place your first order.' : 'Try another filter, or place an order from the shop.'}
              actionLabel="Browse shop"
              onAction={() => navigation.navigate('Home')}
            />
            {error && (
              <Text style={styles.errorText}>
                Error: {error?.data?.message || error?.message || 'Failed to load orders'}
              </Text>
            )}
          </View>
        }
      />
    </View>
  );
};

const dateInputStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 14,
  backgroundColor: '#fff',
  color: '#111827',
  width: '100%',
  boxSizing: 'border-box' as const,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textPrimary,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  exportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  dateBox: {
    width: 160,
    maxWidth: '46%',
  },
  dateLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  clearDates: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    paddingBottom: spacing.sm,
  },
  exportButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  editButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  editText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  reorderButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reorderText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  orderCard: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    flexShrink: 1,
    marginTop: 36,
  },
  billDownload: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderId: {
    flexShrink: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  orderDate: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  orderItems: {
    marginBottom: spacing.md,
  },
  itemText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  addressContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addressLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  addressText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  coordinatesText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  totalAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  originalAmount: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textDecorationLine: 'line-through',
  },
  paymentStatusBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  paymentStatusPaid: {
    backgroundColor: '#E8F5E9',
  },
  paymentStatusUnpaid: {
    backgroundColor: '#FFEBEE',
  },
  paymentStatusPartial: {
    backgroundColor: '#FFF3E0',
  },
  paymentStatusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  paymentPendingContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  paymentPendingText: {
    fontSize: typography.fontSize.sm,
    color: '#856404',
    marginTop: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  deliveryStatusContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  deliveryStatusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: '#2E7D32',
  },
  deliveredByText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.sm,
  },
  noticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: spacing.md,
    marginBottom: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  noticeAction: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
});

