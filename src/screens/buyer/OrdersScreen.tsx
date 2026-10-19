import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { DateRangeModal, EmptyState, Loading, OrderTimer } from '../../components/common';
import { useAuth } from '../../hooks';
import { useGetBuyerOrdersQuery, useGetBuyerRegularOrderQuery, useBuyerUpdatePendingOrderMutation, useBuyerCancelPendingOrderMutation } from '../../store/api/orderApi';
import { replaceCart } from '../../store/slices/cartSlice';
import { 
  useGetUnreadBuyerNotificationsQuery, 
  useGetUnreadBuyerNotificationCountQuery,
  useMarkBuyerNotificationAsReadMutation 
} from '../../store/api/notificationApi';
import { useGetSupportContactsQuery } from '../../store/api/settingsApi';
import { MenuItem, Order, OrderStatus } from '../../types';
import { formatCurrency, formatDateTime, formatDeliverySlot, formatOrderStatus } from '../../utils/formatters';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { API_BASE_URL } from '../../utils/constants';
import { storageService } from '../../services/storage.service';
import { ORDER_STATUS_COLORS } from '../../utils/constants';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationPreview } from '../../components/common/NotificationPreview';
import { openContact, contactLinks } from '../../utils/openContact';
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
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [updatePending] = useBuyerUpdatePendingOrderMutation();
  const [cancelPending] = useBuyerCancelPendingOrderMutation();
  const { data: supportContacts } = useGetSupportContactsQuery();
  const { data: regularPlan } = useGetBuyerRegularOrderQuery(undefined, { skip: !user });
  const { data: orders, isLoading, refetch, error } = useGetBuyerOrdersQuery(user?.id || 0, {
    skip: !user,
    // Polling disabled - only refetch on screen focus or manual refresh
    pollingInterval: 0,
  });
  const supportCall = contactLinks(supportContacts?.phone || supportContacts?.whatsapp).call;
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

  const getDeliveryLabel = (order: Order) => {
    const slot = formatDeliverySlot(order);
    if (slot) return slot;
    return formatDateTime(order.orderDate || (order as any).createdAt || '');
  };

  const getOrderAmount = (order: Order) =>
    formatCurrency(order.finalBillAmount || order.total || (order as any).totalAmount);

  const renderOrder = ({ item }: { item: Order }) => {
    const paid = item.paymentStatus === 'PAID';
    const partial = item.paymentStatus === 'PARTIALLY_PAID';
    const unpaid = item.paymentStatus === 'UNPAID';
    const isPending = item.status === OrderStatus.PENDING || item.status === 'pending';
    const isConfirmed =
      item.status === OrderStatus.CONFIRMED
      || item.status === OrderStatus.PROCESSING
      || item.status === 'confirmed'
      || item.status === 'processing';
    const isDelivered = item.status === OrderStatus.DELIVERED || item.status === 'delivered';
    const isCanceled = item.status === OrderStatus.CANCELED || item.status === 'canceled';
    const expanded = expandedOrderId === item.id;
    const statusColor = getStatusColor(item.status);
    const orderNote = item.billingNotes?.trim();
    const deliveryAddress = item.deliveryAddress || item.buyerAddress || 'Not specified';
    const statusTint = isPending
      ? '#FFF1E0'
      : isConfirmed
        ? colors.blue100
        : isDelivered
          ? colors.successTint
          : colors.gray100;

    const toggleExpanded = () => {
      setExpandedOrderId((current) => (current === item.id ? null : item.id));
    };

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderCardCollapsed}>
          <TouchableOpacity activeOpacity={0.85} onPress={toggleExpanded} style={styles.orderCardTapArea}>
            <View style={styles.orderDocIcon}>
              <Ionicons name="document-text-outline" size={22} color="#854A0E" />
            </View>
            <View style={styles.orderCardHeaderLeft}>
              <View style={styles.orderTitleRow}>
                <Text style={styles.orderIdCompact}>#Order {String(item.id).padStart(2, '0')}</Text>
                <View style={[styles.statusPill, { backgroundColor: statusTint }]}>
                  <Text style={[styles.statusPillText, { color: isPending ? '#854A0E' : statusColor }]}>
                    {formatOrderStatus(item.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.deliveryTimeText} numberOfLines={2}>
                {getDeliveryLabel(item)} • {getOrderAmount(item)}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => {
              if (supportCall) openContact(supportCall);
              else showErrorToast('Support phone not available.');
            }}
          >
            <Ionicons name="call" size={15} color={colors.primary} />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={toggleExpanded} hitSlop={8}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <OrderTimer order={item} position="header-right" />

        {expanded && (
          <View style={styles.orderExpanded}>
            <View style={styles.addressBlock}>
              <View style={styles.addressBlockHeader}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <Text style={styles.addressBlockTitle}>DELIVERY ADDRESS</Text>
              </View>
              <Text style={styles.addressBlockText}>{deliveryAddress}</Text>
            </View>

            <View style={styles.itemsBlock}>
              {item.items && item.items.length > 0 ? (
                item.items.map((orderItem, index) => {
                  const quantity = lineQty(item.id, index, orderItem.quantity);
                  if (!isPending) {
                    return (
                      <View key={index} style={styles.itemRowCompact}>
                        <View style={styles.itemLeftCol}>
                          <Text style={styles.itemNameCompact} numberOfLines={1}>{orderItem.itemName}</Text>
                          <Text style={styles.itemQtyCompact}>
                            {orderItem.quantity} × {formatCurrency(orderItem.rate || 0)}
                          </Text>
                        </View>
                        <Text style={styles.itemPriceCompact}>{formatCurrency(orderItem.subtotal)}</Text>
                      </View>
                    );
                  }
                  return (
                    <View key={index} style={styles.qtyEditRow}>
                      <Text style={styles.itemNameCompact} numberOfLines={1}>{orderItem.itemName}</Text>
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
                <Text style={styles.itemNameCompact}>No items</Text>
              )}
            </View>

            <View style={styles.collectRow}>
              <Text style={styles.collectLabel}>
                {item.finalBillAmount ? 'Final bill' : 'Total'}
              </Text>
              <Text style={styles.collectAmount}>{getOrderAmount(item)}</Text>
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
            {(unpaid || partial) && (
              <Text style={styles.paymentPendingText}>Payment is still due for this order.</Text>
            )}

            {!!orderNote && (
              <View style={styles.noteBanner}>
                <Ionicons name="document-text-outline" size={16} color="#854A0E" />
                <Text style={styles.noteBannerText}>Note: {orderNote}</Text>
              </View>
            )}

            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={() => downloadBill(item)}
                disabled={exporting}
              >
                <Ionicons name="download-outline" size={18} color={colors.primary} />
                <Text style={styles.iconActionText}>Bill</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={() => navigation.navigate('OrderDetail', { order: item })}
              >
                <Ionicons name="open-outline" size={18} color={colors.primary} />
                <Text style={styles.iconActionText}>Details</Text>
              </TouchableOpacity>
              {isRegularOrder(item) && (
                <TouchableOpacity style={styles.iconActionBtn} onPress={() => editRegularOrder(item)}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={styles.iconActionText}>Edit regular</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {!isCanceled && (
          <View style={styles.orderCardActions}>
            {isPending ? (
              <>
                <TouchableOpacity style={styles.cancelTextButton} onPress={() => cancelPendingOrder(item)}>
                  <Text style={styles.cancelTextButtonLabel}>Cancel order</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmPrimaryButton}
                  onPress={() => savePending(item)}
                  disabled={savingOrderId === item.id}
                >
                  {savingOrderId === item.id ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color={colors.white} />
                      <Text style={styles.confirmPrimaryButtonText}>Save quantity</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : isConfirmed ? (
              <>
                <View style={styles.confirmedChip}>
                  <Text style={styles.confirmedChipText}>Confirmed</Text>
                </View>
                {!isRegularOrder(item) && (
                  <TouchableOpacity style={styles.confirmPrimaryButton} onPress={() => copyOrderToCart(item)}>
                    <Ionicons name="refresh" size={18} color={colors.white} />
                    <Text style={styles.confirmPrimaryButtonText}>Order again</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              !isRegularOrder(item) ? (
                <TouchableOpacity style={styles.confirmPrimaryButton} onPress={() => copyOrderToCart(item)}>
                  <Ionicons name="refresh" size={18} color={colors.white} />
                  <Text style={styles.confirmPrimaryButtonText}>Order again</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.confirmPrimaryButton} onPress={() => editRegularOrder(item)}>
                  <Ionicons name="create-outline" size={18} color={colors.white} />
                  <Text style={styles.confirmPrimaryButtonText}>Edit regular</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      </View>
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
  orderCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  orderCardCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  orderCardTapArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderDocIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCardHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  orderIdCompact: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusPillText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  deliveryTimeText: {
    marginTop: 4,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.blue100,
  },
  callButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  orderExpanded: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
  },
  addressBlock: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  addressBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  addressBlockTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  addressBlockText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  itemsBlock: {
    marginBottom: spacing.sm,
  },
  itemRowCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  itemLeftCol: {
    flex: 1,
    minWidth: 0,
  },
  itemQtyCompact: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  itemNameCompact: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  itemPriceCompact: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  qtyEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
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
  collectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  collectLabel: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  collectAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  noteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningTint,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  noteBannerText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: '#854A0E',
    lineHeight: 20,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconActionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  orderCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelTextButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelTextButtonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
  },
  confirmPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
  },
  confirmPrimaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  confirmedChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.successTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  paymentStatusBadge: {
    marginBottom: spacing.sm,
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
    marginBottom: spacing.sm,
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

