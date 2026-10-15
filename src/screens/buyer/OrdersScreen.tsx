import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { colors, typography, spacing } from '../../theme';
import { Card, DateRangeModal, EmptyState, Loading, OrderTimer } from '../../components/common';
import { useAuth } from '../../hooks';
import { useGetBuyerOrdersQuery, useGetBuyerRegularOrderQuery, useBuyerUpdatePendingOrderMutation, useBuyerCancelPendingOrderMutation } from '../../store/api/orderApi';
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
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [category, setCategory] = useState<'active' | 'complete'>('active');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus | 'REGULAR'>('ALL');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [qtyDraft, setQtyDraft] = useState<Record<string, number>>({});
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [updatePending] = useBuyerUpdatePendingOrderMutation();
  const [cancelPending] = useBuyerCancelPendingOrderMutation();
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

  const copyOrderToCart = (order: Order) => {
    const lines = (order.items || []).filter((line) => line.menuItemId && line.quantity > 0);
    if (lines.length === 0) {
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
    showSuccessToast('Last order copied to cart');
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
    let list = (orders || []).filter((order) => {
      if (statusFilter === 'REGULAR') return isRegularOrder(order);
      const status = order.status;
      if (statusFilter === OrderStatus.CONFIRMED) {
        return status === OrderStatus.CONFIRMED || status === OrderStatus.PROCESSING;
      }
      if (statusFilter !== 'ALL') return status === statusFilter;
      if (category === 'active') {
        return status === OrderStatus.PENDING || status === OrderStatus.CONFIRMED || status === OrderStatus.PROCESSING;
      }
      return status === OrderStatus.DELIVERED;
    });
    if (fromDate) list = list.filter((order) => orderDay(order) >= fromDate);
    if (toDate) list = list.filter((order) => orderDay(order) <= toDate);
    return list;
  }, [orders, category, statusFilter, fromDate, toDate]);

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
      if (statusFilter === 'REGULAR') params.set('kind', 'regular');
      else if (statusFilter !== 'ALL') params.set('status', statusFilter);
      else if (category === 'complete') params.set('status', OrderStatus.DELIVERED);
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

  const lineQty = (orderId: number, index: number, fallback: number) => qtyDraft[`${orderId}-${index}`] ?? fallback;

  const savePending = async (item: Order) => {
    const items = (item.items || [])
      .map((line, index) => ({
        menuItemId: line.menuItemId,
        quantity: lineQty(item.id, index, line.quantity),
      }))
      .filter((line) => line.menuItemId && line.quantity > 0);
    if (items.length === 0) {
      showErrorToast('Keep at least one product');
      return;
    }
    try {
      setSavingOrderId(item.id);
      await updatePending({ id: item.id, items }).unwrap();
      showSuccessToast('Quantity updated');
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not update this order');
    } finally {
      setSavingOrderId(null);
    }
  };

  const cancelPendingOrder = (item: Order) => {
    Alert.alert('Cancel order', 'Cancel this order before the seller confirms it?', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelPending(item.id).unwrap();
            showSuccessToast('Order canceled');
          } catch (error: any) {
            showErrorToast(error?.data?.message || 'Could not cancel this order');
          }
        },
      },
    ]);
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const paid = item.paymentStatus === 'PAID';
    const partial = item.paymentStatus === 'PARTIALLY_PAID';
    const unpaid = item.paymentStatus === 'UNPAID';
    return (
      <Card style={styles.orderCard}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('OrderDetail', { order: item })}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderIcon}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.orderTitleBlock}>
              <Text style={styles.orderId}>Order #{item.id}</Text>
              <Text style={styles.orderDate}>{formatDateTime(item.orderDate || item.createdAt)}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.billDownload}
                onPress={() => downloadBill(item)}
                disabled={exporting}
              >
                <Ionicons name="download-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{formatOrderStatus(item.status)}</Text>
              </View>
            </View>
          </View>
          <OrderTimer order={item} position="header-right" />

          <View style={styles.orderItems}>
            {item.items && item.items.length > 0 ? (
              item.items.map((orderItem, index) => {
                const quantity = lineQty(item.id, index, orderItem.quantity);
                if (item.status !== 'pending') {
                  return (
                    <View key={index} style={styles.itemRow}>
                      <View style={styles.qtyChip}>
                        <Text style={styles.qtyChipText}>{orderItem.quantity}</Text>
                      </View>
                      <Text style={styles.itemName}>{orderItem.itemName}</Text>
                      <Text style={styles.itemPrice}>{formatCurrency(orderItem.subtotal)}</Text>
                    </View>
                  );
                }
                return (
                  <View key={index} style={styles.qtyRow}>
                    <Text style={styles.itemName}>{orderItem.itemName}</Text>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => setQtyDraft((current) => ({
                          ...current,
                          [`${item.id}-${index}`]: Math.max(1, quantity - 1),
                        }))}
                      >
                        <Text style={styles.qtyButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => setQtyDraft((current) => ({
                          ...current,
                          [`${item.id}-${index}`]: quantity + 1,
                        }))}
                      >
                        <Text style={styles.qtyButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.itemName}>No items</Text>
            )}
          </View>

          {(item.deliveryAddress || item.buyerAddress) && (
            <View style={styles.addressContainer}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <View style={styles.addressCopy}>
                <Text style={styles.addressLabel}>Delivery address</Text>
                <Text style={styles.addressText}>
                  {item.deliveryAddress || item.buyerAddress || 'Not specified'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.orderFooter}>
            <View>
              <Text style={styles.totalLabel}>
                {item.finalBillAmount ? 'Final bill' : 'Total'}
              </Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(item.finalBillAmount || item.total || item.totalAmount)}
              </Text>
              {item.finalBillAmount && item.finalBillAmount !== item.total && (
                <Text style={styles.originalAmount}>Original {formatCurrency(item.total)}</Text>
              )}
            </View>
            {item.paymentStatus && (
              <View style={[
                styles.paymentStatusBadge,
                paid && styles.paymentStatusPaid,
                unpaid && styles.paymentStatusUnpaid,
                partial && styles.paymentStatusPartial,
              ]}>
                <Text style={[
                  styles.paymentStatusText,
                  paid && styles.paymentTextPaid,
                  unpaid && styles.paymentTextUnpaid,
                  partial && styles.paymentTextPartial,
                ]}>
                  {paid ? 'Paid' : unpaid ? 'Unpaid' : 'Partial'}
                </Text>
              </View>
            )}
          </View>
          <DeliverySlotBadge order={item} />
          {(unpaid || partial) && (
            <Text style={styles.paymentPendingText}>Payment is still due for this order.</Text>
          )}
          {item.status === 'delivered' && (
            <Text style={styles.deliveryStatusText}>
              Delivered{item.deliveredBy ? ` by ${item.deliveredBy}` : ''}
            </Text>
          )}
        </TouchableOpacity>
        <View style={styles.actionRow}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity
                style={styles.reorderButton}
                onPress={() => savePending(item)}
                disabled={savingOrderId === item.id}
              >
                <Text style={styles.reorderText}>{savingOrderId === item.id ? 'Saving…' : 'Save quantity'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => cancelPendingOrder(item)}>
                <Text style={styles.cancelText}>Cancel order</Text>
              </TouchableOpacity>
            </>
          )}
          {isRegularOrder(item) && (
            <TouchableOpacity style={styles.editButton} onPress={() => editRegularOrder(item)}>
              <Text style={styles.editText}>Edit regular order</Text>
            </TouchableOpacity>
          )}
          {!isRegularOrder(item) && item.status !== 'canceled' && (
            <TouchableOpacity style={styles.reorderButton} onPress={() => copyOrderToCart(item)}>
              <Text style={styles.reorderText}>Order again</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  if (isLoading || notificationsLoading) {
    return <Loading fullScreen message="Loading your orders..." />;
  }

  const statusLabel = statusFilter === 'ALL'
    ? 'All status'
    : statusFilter === 'REGULAR'
      ? 'Regular order'
      : statusFilter === OrderStatus.CANCELED
        ? 'Cancelled'
        : formatOrderStatus(statusFilter);
  const hasDateRange = !!fromDate && !!toDate;

  const listHeader = (
    <>
      <View style={styles.filterContainer}>
        <View style={styles.categoryRow}>
          {([
            { id: 'active' as const, label: 'Active Order' },
            { id: 'complete' as const, label: 'Complete Order' },
          ]).map((item) => {
            const selected = statusFilter === OrderStatus.CANCELED
              ? false
              : statusFilter === OrderStatus.DELIVERED
                ? item.id === 'complete'
                : statusFilter === OrderStatus.PENDING || statusFilter === OrderStatus.CONFIRMED
                  ? item.id === 'active'
                  : category === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.filterButton, selected && styles.filterButtonActive]}
                onPress={() => {
                  setCategory(item.id);
                  setStatusFilter('ALL');
                  setStatusMenuOpen(false);
                }}
              >
                <Text style={[styles.filterButtonText, selected && styles.filterButtonTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={styles.statusMenuButton}
          onPress={() => setStatusMenuOpen((open) => !open)}
        >
          <Text style={styles.statusMenuText}>{statusLabel}</Text>
          <Text style={styles.statusMenuCaret}>{statusMenuOpen ? '▴' : '▾'}</Text>
        </TouchableOpacity>
        {statusMenuOpen && (
          <View style={styles.statusMenu}>
            {([
              { id: 'ALL' as const, label: 'All status' },
              { id: OrderStatus.PENDING, label: 'Pending' },
              { id: OrderStatus.CONFIRMED, label: 'Confirmed' },
              { id: OrderStatus.DELIVERED, label: 'Delivered' },
              { id: OrderStatus.CANCELED, label: 'Cancelled' },
              { id: 'REGULAR' as const, label: 'Regular order' },
            ]).map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.statusMenuItem, statusFilter === option.id && styles.statusMenuItemActive]}
                onPress={() => {
                  setStatusFilter(option.id);
                  setStatusMenuOpen(false);
                  if (option.id === OrderStatus.DELIVERED) setCategory('complete');
                  if (option.id === OrderStatus.PENDING || option.id === OrderStatus.CONFIRMED) setCategory('active');
                }}
              >
                <Text style={[styles.statusMenuItemText, statusFilter === option.id && styles.statusMenuItemTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.dateRangeRow}>
          <TouchableOpacity style={styles.dateRangeButton} onPress={() => setDateModalVisible(true)}>
            <Text style={styles.dateRangeButtonText}>Select Date Range</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportOrdersButton, exporting && styles.exportOrdersButtonDisabled]}
            onPress={exportOrders}
            disabled={exporting}
          >
            <Text style={styles.exportOrdersButtonText}>{exporting ? 'Exporting…' : 'Export'}</Text>
          </TouchableOpacity>
        </View>
        {hasDateRange && (
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{fromDate} to {toDate}</Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedDateRange({ startDate: null, endDate: null });
                setFromDate('');
                setToDate('');
              }}
              style={styles.datePillClear}
            >
              <Text style={styles.datePillClearText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.page}>
      <NotificationPreview
        visible={!!preview}
        message={preview?.message || ''}
        createdAt={preview?.createdAt}
        isRead={false}
        onClose={() => setPreview(null)}
        onRead={handleReadPreview}
      />
      <FlatList
        style={styles.list}
        data={visibleOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={listHeader}
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
              title={hasDateRange ? 'No orders in this date range' : 'No orders found'}
              message={hasDateRange ? 'Choose another date range, or clear the dates.' : 'Try another filter, or place an order from the shop.'}
              actionLabel="Browse shop"
              onAction={() => navigation.navigate('Home')}
            />
            {error && (
              <Text style={styles.errorText}>
                Error: {(error as any)?.data?.message || (error as any)?.message || 'Failed to load orders'}
              </Text>
            )}
          </View>
        }
      />
      <DateRangeModal
        visible={dateModalVisible}
        initialValue={selectedDateRange}
        onClose={() => setDateModalVisible(false)}
        onApply={(range) => {
          setSelectedDateRange(range);
          const ymd = (date: Date) => {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${date.getFullYear()}-${month}-${day}`;
          };
          const start = range.startDate ? ymd(range.startDate) : '';
          const end = range.endDate ? ymd(range.endDate) : '';
          setFromDate(start);
          setToDate(end);
          setDateModalVisible(false);
        }}
      />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  filterContainer: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  statusMenuButton: {
    minHeight: 44,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statusMenuText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  statusMenuCaret: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  statusMenu: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  statusMenuItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusMenuItemActive: {
    backgroundColor: colors.primary,
  },
  statusMenuItemText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  statusMenuItemTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  exportOrdersButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOrdersButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  exportOrdersButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  dateRangeButton: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRangeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: 999,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  datePillText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  datePillClear: {
    marginLeft: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePillClearText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
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
  },
  dateBox: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 140,
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
  lastOrder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lastOrderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastOrderCopy: { flex: 1, minWidth: 0 },
  lastOrderTitle: { fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  lastOrderItems: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  qtyChip: {
    minWidth: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qtyChipText: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  itemName: { flex: 1, color: colors.textPrimary, fontSize: typography.fontSize.sm },
  itemPrice: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: { color: colors.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg },
  qtyValue: { minWidth: 20, textAlign: 'center', color: colors.textPrimary, fontWeight: typography.fontWeight.bold },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  cancelText: { color: colors.error, fontWeight: typography.fontWeight.semibold },
  editButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  editText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  reorderButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
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
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTitleBlock: { flex: 1, minWidth: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  billDownload: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderId: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  addressCopy: { flex: 1, minWidth: 0 },
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
    gap: spacing.sm,
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
  paymentTextPaid: { color: colors.success },
  paymentTextUnpaid: { color: colors.error },
  paymentTextPartial: { color: colors.warning },
  paymentPendingText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    marginTop: spacing.sm,
  },
  deliveryStatusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
    marginTop: spacing.sm,
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
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
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

