import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Dimensions, Linking, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { EmptyState, Loading, DateRangeModal, EditOrderModal, BillEditModal } from '../../components/common';
import { API_BASE_URL } from '../../utils/constants';
import { storageService } from '../../services/storage.service';
import { 
  useGetAllOrdersQuery, 
  useConfirmOrderMutation,
  useDeliverOrderMutation,
  useCancelOrderMutation,
  useUpdateOrderMutation,
  useUpdateOrderBillMutation
} from '../../store/api/orderApi';
import { useGetMenuItemsQuery } from '../../store/api/menuApi';
import {
  useGetUnreadAdminNotificationsQuery,
  useMarkAdminNotificationAsReadMutation
} from '../../store/api/notificationApi';
import { Order, OrderStatus } from '../../types';
import { canEditOrderBill, formatCurrency, formatDateTime, formatDeliverySlot, formatOrderStatus, formatYmdDisplay } from '../../utils/formatters';
import { ORDER_STATUS_COLORS } from '../../utils/constants';
import { showAlert, showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../utils/alert';
import { useAuth } from '../../hooks';
import { useGetShopBuyersQuery } from '../../store/api/shopApi';
import { openContact, contactLinks } from '../../utils/openContact';

export const OrderManagementScreen = () => {
  // Note: navigation is passed by React Navigation; used for Order Details.
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [listTab, setListTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETE'>('ACTIVE');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL' | 'REGULAR'>('ALL');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [exportingOrderId, setExportingOrderId] = useState<number | null>(null);
  const [sellerFilter, setSellerFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>(''); // yyyy-MM-dd
  const [toDate, setToDate] = useState<string>(''); // yyyy-MM-dd
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });
  const [sellerName, setSellerName] = useState<string>('Seller');
  const [exporting, setExporting] = useState(false);

  // Responsive breakpoint: Mobile < 768px, Tablet/Desktop >= 768px
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const isMobile = screenWidth < 768;
  
  useEffect(() => {
    const updateScreenWidth = ({ window }: { window: { width: number; height: number } }) => {
      setScreenWidth(window.width);
    };
    
    // Add event listener for dimension changes
    const subscription = Dimensions.addEventListener('change', updateScreenWidth);
    
    // Cleanup: Remove event listener on unmount
    return () => {
      // For React Native < 0.65, subscription is a number
      // For React Native >= 0.65, subscription has a remove() method
      if (subscription && typeof subscription === 'object' && 'remove' in subscription) {
        subscription.remove();
      } else if (subscription && typeof subscription === 'number') {
        // Legacy API - Dimensions.removeEventListener(subscription) if available
        // Most modern React Native versions use the object with remove()
      }
    };
  }, []);

  // If navigated from dashboard cards, allow setting an initial filter (ex: Pending)
  useEffect(() => {
    const initialStatus = route?.params?.initialStatus;
    if (!initialStatus) return;
    if (initialStatus === OrderStatus.DELIVERED) {
      setListTab('COMPLETE');
      setStatusFilter(OrderStatus.DELIVERED);
    } else if (initialStatus === OrderStatus.CANCELED) {
      setListTab('ALL');
      setStatusFilter(OrderStatus.CANCELED);
    } else if (initialStatus === OrderStatus.PENDING || initialStatus === OrderStatus.CONFIRMED) {
      setListTab('ACTIVE');
      setStatusFilter(initialStatus);
    }
  }, [route?.params?.initialStatus]);

  const toLocalYmd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const queryArgs = useMemo(() => {
    const status = statusFilter === OrderStatus.PENDING
      || statusFilter === OrderStatus.DELIVERED
      || statusFilter === OrderStatus.CANCELED
      ? statusFilter
      : undefined;
    return {
      status,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    };
  }, [statusFilter, fromDate, toDate]);

  const { isSeller, isStrictAdmin } = useAuth();
  const { data: myBuyers = [] } = useGetShopBuyersQuery(undefined, { skip: !isSeller() || isStrictAdmin() });
  const { data: orders, isLoading, refetch, error } = useGetAllOrdersQuery(queryArgs);
  const [confirmOrder, { isLoading: confirming }] = useConfirmOrderMutation();
  const [deliverOrder, { isLoading: delivering }] = useDeliverOrderMutation();
  const [cancelOrder, { isLoading: canceling }] = useCancelOrderMutation();
  const [updateOrder, { isLoading: updatingOrder }] = useUpdateOrderMutation();
  const { data: menuItems = [] } = useGetMenuItemsQuery();
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [billingOrder, setBillingOrder] = useState<Order | null>(null);
  const [updateOrderBill, { isLoading: updatingBill }] = useUpdateOrderBillMutation();
  
  // Notification management for badge clearing
  const { data: unreadNotifications = [], refetch: refetchNotifications } = useGetUnreadAdminNotificationsQuery();
  const [markAsRead] = useMarkAdminNotificationAsReadMutation();

  // Mark all notifications as read when screen comes into focus (clears badge)
  useFocusEffect(
    React.useCallback(() => {
      const markAllNotificationsAsRead = async () => {
        if (unreadNotifications && unreadNotifications.length > 0) {
          console.log('🔔 Marking all admin notifications as read...', unreadNotifications.length);
          try {
            // Mark each unread notification as read
            const markPromises = unreadNotifications.map((notification) =>
              markAsRead(notification.id).catch((err) => {
                console.error(`Failed to mark notification ${notification.id} as read:`, err);
                return null; // Continue with other notifications even if one fails
              })
            );
            await Promise.all(markPromises);
            console.log('✅ All notifications marked as read');
            // Refetch notifications to update the count
            refetchNotifications();
          } catch (error) {
            console.error('❌ Error marking notifications as read:', error);
          }
        }
      };
      
      markAllNotificationsAsRead();
    }, [unreadNotifications, markAsRead, refetchNotifications])
  );

  // Log orders for debugging
  useEffect(() => {
    if (error) {
      console.error('❌ Error fetching admin orders:', error);
    }
  }, [orders, error]);

  // Load seller name for PDF header
  useEffect(() => {
    const loadSellerName = async () => {
      try {
        const user = await storageService.getUserData();
        const name = (user as any)?.username || (user as any)?.fullName || (user as any)?.name;
        if (name) setSellerName(String(name));
      } catch (_e) {
        // ignore
      }
    };
    loadSellerName();
  }, []);

  // Normalize status for filtering to handle any case inconsistencies
  const normalizeStatus = (status: string | OrderStatus): string => {
    return String(status || '').toLowerCase();
  };

  // Filter orders based on selected status
  // Use useMemo to prevent unnecessary recalculations and ensure proper updates
  const sellerOptions = useMemo(() => {
    const names = new Set<string>();
    (orders || []).forEach((order) => {
      const name = order.sellerBusinessName?.trim();
      if (name) names.add(name);
    });
    return Array.from(names).sort((left, right) => left.localeCompare(right));
  }, [orders]);

  const scopedOrders = useMemo(() => {
    if (!orders) return [];
    let list = orders;
    if (isSeller() && !isStrictAdmin()) {
      const buyerIds = new Set((myBuyers || []).map((buyer) => Number(buyer.id)));
      list = orders.filter((order) => buyerIds.has(Number(order.buyerId)));
    }
    if (isStrictAdmin() && sellerFilter !== 'ALL') {
      list = list.filter((order) => (order.sellerBusinessName || '').trim() === sellerFilter);
    }
    return list;
  }, [orders, myBuyers, isSeller, isStrictAdmin, sellerFilter]);

  const isActiveStatus = (status: string) => {
    const s = normalizeStatus(status);
    return s === normalizeStatus(OrderStatus.PENDING)
      || s === normalizeStatus(OrderStatus.CONFIRMED)
      || s === normalizeStatus(OrderStatus.PROCESSING);
  };

  const orderTabCounts = useMemo(() => {
    const all = scopedOrders.length;
    const active = scopedOrders.filter((o) => isActiveStatus(o.status)).length;
    const complete = scopedOrders.filter((o) => normalizeStatus(o.status) === normalizeStatus(OrderStatus.DELIVERED)).length;
    return { all, active, complete };
  }, [scopedOrders]);

  const filteredOrders = useMemo(() => {
    let list = scopedOrders;
    list = list.filter((order) => {
      if (statusFilter === 'REGULAR') {
        return (order.billingNotes || '').toLowerCase().includes('regular');
      }
      const status = normalizeStatus(order.status);
      if (statusFilter === OrderStatus.CONFIRMED) {
        return status === normalizeStatus(OrderStatus.CONFIRMED)
          || status === normalizeStatus(OrderStatus.PROCESSING);
      }
      if (statusFilter !== 'ALL') {
        return status === normalizeStatus(statusFilter);
      }
      if (listTab === 'ACTIVE') {
        return isActiveStatus(order.status);
      }
      if (listTab === 'COMPLETE') {
        return status === normalizeStatus(OrderStatus.DELIVERED);
      }
      return true;
    });
    return list;
  }, [scopedOrders, listTab, statusFilter]);

  const hasDateRange = !!fromDate && !!toDate;

  const isExportEligible = (order: Order) => {
    const s = normalizeStatus(order.status);
    return s === normalizeStatus(OrderStatus.CONFIRMED)
      || s === normalizeStatus(OrderStatus.PROCESSING)
      || s === normalizeStatus(OrderStatus.DELIVERED);
  };

  const downloadPdf = async (path: string, filename: string) => {
    const token = await storageService.getAuthToken();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      } as any,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Download failed (${res.status})`);
    }

    const blob = await res.blob();

    if (Platform.OS !== 'web') {
      // Seller web requirement; avoid breaking mobile builds
      throw new Error('Download is supported on Web only.');
    }

    const url = (window as any).URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    (window as any).URL.revokeObjectURL(url);
  };

  const handleExportSingle = async (order: Order) => {
    try {
      setExporting(true);
      setExportingOrderId(order.id);
      const date = toLocalYmd(new Date());
      const filename = `order_${order.id}_${date}.pdf`;
      const path = `/orders/${order.id}/export/pdf?sellerName=${encodeURIComponent(sellerName)}`;
      await downloadPdf(path, filename);
      showSuccessAlert(`Downloaded ${filename}`);
    } catch (e: any) {
      console.error('❌ Export single order failed:', e);
      showErrorAlert(e?.message || 'Failed to export order');
    } finally {
      setExporting(false);
      setExportingOrderId(null);
    }
  };

  const statusFilterLabel =
    statusFilter === 'ALL'
      ? 'All status'
      : statusFilter === 'REGULAR'
        ? 'Regular order'
        : statusFilter === OrderStatus.CANCELED
          ? 'Cancelled'
          : formatOrderStatus(statusFilter);

  const applyStatusFilter = (id: OrderStatus | 'ALL' | 'REGULAR') => {
    setStatusFilter(id);
    setStatusMenuOpen(false);
    if (id === OrderStatus.DELIVERED) setListTab('COMPLETE');
    else if (id === OrderStatus.PENDING || id === OrderStatus.CONFIRMED || id === OrderStatus.PROCESSING) {
      setListTab('ACTIVE');
    } else if (id === OrderStatus.CANCELED || id === 'REGULAR') {
      setListTab('ALL');
    }
  };

  const handleExportFiltered = async () => {
    try {
      setExporting(true);
      const date = toLocalYmd(new Date());
      const filename = `orders_${date}.pdf`;
      const params = new URLSearchParams();
      if (statusFilter === 'REGULAR') params.set('kind', 'regular');
      else if (statusFilter !== 'ALL') params.set('status', String(statusFilter));
      else if (listTab === 'COMPLETE') params.set('status', OrderStatus.DELIVERED);
      else if (listTab === 'ACTIVE') params.set('status', OrderStatus.PENDING);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      params.set('sellerName', sellerName);
      const path = `/orders/export/pdf?${params.toString()}`;
      await downloadPdf(path, filename);
      showSuccessAlert(`Downloaded ${filename}`);
    } catch (e: any) {
      console.error('❌ Export filtered orders failed:', e);
      showErrorAlert(e?.message || 'Failed to export orders');
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const key = normalizeStatus(status) === normalizeStatus(OrderStatus.PROCESSING)
      ? OrderStatus.CONFIRMED
      : status;
    return ORDER_STATUS_COLORS[key as keyof typeof ORDER_STATUS_COLORS] || colors.gray500;
  };

  /** Soft status surfaces — UI/UX Pro: tint + accent border (not color-only) */
  const getOrderCardSurface = (status: string) => {
    const s = normalizeStatus(status);
    if (s === normalizeStatus(OrderStatus.PENDING)) {
      return { backgroundColor: '#FFF7ED', borderColor: '#FDBA74', accent: '#EA580C', iconBg: '#FFEDD5' };
    }
    if (s === normalizeStatus(OrderStatus.CONFIRMED) || s === normalizeStatus(OrderStatus.PROCESSING)) {
      return { backgroundColor: '#EFF6FF', borderColor: '#93C5FD', accent: colors.primary, iconBg: colors.blue100 };
    }
    if (s === normalizeStatus(OrderStatus.DELIVERED)) {
      return { backgroundColor: colors.successTint, borderColor: '#86EFAC', accent: colors.success, iconBg: '#DCFCE7' };
    }
    if (s === normalizeStatus(OrderStatus.CANCELED)) {
      return { backgroundColor: colors.errorTint, borderColor: '#FECACA', accent: colors.error, iconBg: '#FEE2E2' };
    }
    return { backgroundColor: colors.white, borderColor: colors.border, accent: colors.gray400, iconBg: colors.gray100 };
  };

  const handleConfirmOrder = async (orderId: number) => {
    setProcessingOrderId(orderId);
    try {
      console.log('🔄 Starting confirm order for:', orderId);
      const result = await confirmOrder({ 
        id: orderId, 
        data: { confirmedBy: 'seller' } 
      }).unwrap();
      
      console.log('✅ Confirm order success:', result);
      console.log('📊 Updated order status:', result.status);
      
      // Show success message
      showSuccessAlert('Order confirmed successfully. Notification sent to buyer.');
      
      // Refetch orders to get updated list with new status
      console.log('🔄 Refetching orders after confirm...');
      await refetch();
      console.log('✅ Orders refetched');
      
      // Automatically switch to "Confirmed" tab to show the confirmed order
      setListTab('ACTIVE');
      setStatusFilter(OrderStatus.CONFIRMED);
    } catch (error: any) {
      console.error('❌ Confirm order error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error?.data?.message || 
                          error?.message || 
                          error?.error?.data?.message ||
                          'Failed to confirm order';
      showErrorAlert(errorMessage);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    setProcessingOrderId(orderId);
    try {
      console.log('🔄 Starting cancel order for:', orderId);
      const result = await cancelOrder({ 
        id: orderId, 
        data: { canceledBy: 'seller', reason: 'Canceled by seller' } 
      }).unwrap();
      
      console.log('✅ Cancel order success:', result);
      console.log('📊 Updated order status:', result.status);
      
      // Show success message
      showSuccessAlert('Order canceled successfully. Notification sent to buyer.');
      
      // Refetch orders to get updated list with new status
      console.log('🔄 Refetching orders after cancel...');
      await refetch();
      console.log('✅ Orders refetched');
      
      // Automatically switch to "Canceled" tab to show the canceled order
      setStatusFilter(OrderStatus.CANCELED);
    } catch (error: any) {
      console.error('❌ Cancel order error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error?.data?.message || 
                          error?.message || 
                          error?.error?.data?.message ||
                          'Failed to cancel order';
      showErrorAlert(errorMessage);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleEditOrderClick = (order: Order) => {
    setEditingOrder(order);
    setEditModalVisible(true);
  };

  const handleSaveOrderChanges = async (data: any) => {
    if (!editingOrder) return;
    setProcessingOrderId(editingOrder.id);
    try {
      await updateOrder({ id: editingOrder.id, data }).unwrap();
      showSuccessAlert('Order updated successfully');
      setEditModalVisible(false);
      setEditingOrder(null);
      await refetch();
    } catch (e: any) {
      console.error('❌ updateOrder failed:', e);
      const msg = e?.data?.message || e?.message || 'Failed to update order';
      showErrorAlert(msg);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleSaveBill = async (finalBillAmount: number, billingNotes: string) => {
    if (!billingOrder) return;
    setProcessingOrderId(billingOrder.id);
    try {
      await updateOrderBill({
        id: billingOrder.id,
        data: {
          finalBillAmount,
          billingNotes,
          billedBy: sellerName,
        },
      }).unwrap();
      const buyerNotified = billingOrder.paymentStatus === 'PARTIALLY_PAID';
      showSuccessAlert(buyerNotified ? 'Bill updated. The buyer has been notified.' : 'Bill updated successfully');
      setBillModalVisible(false);
      setBillingOrder(null);
      await refetch();
    } catch (e: any) {
      console.error('❌ Update bill error:', e);
      const msg = e?.data?.message || e?.message || 'Failed to update bill';
      showErrorAlert(msg);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleDeliverOrder = async (orderId: number) => {
    setProcessingOrderId(orderId);
    try {
      const result = await deliverOrder({
        id: orderId,
        data: {
          deliveredBy: sellerName,
        },
      }).unwrap();
      
      console.log('✅ Deliver order success:', result);
      showSuccessAlert('Order marked as delivered successfully!');
      
      // Refetch orders to get updated list
      await refetch();
      
      // Automatically switch to "Delivered" tab
      setListTab('COMPLETE');
      setStatusFilter(OrderStatus.DELIVERED);
    } catch (error: any) {
      console.error('❌ Deliver order error:', error);
      const errorMessage = error?.data?.message || 
                          error?.message || 
                          error?.error?.data?.message ||
                          'Failed to mark order as delivered';
      showErrorAlert(errorMessage);
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Get responsive styles for order footer based on screen size
  const getOrderFooterStyle = (): ViewStyle => {
    const screenWidth = Dimensions.get('window').width;
    const isMobile = Platform.OS !== 'web' || screenWidth < 768;
    
    if (isMobile) {
      return {
        flexDirection: 'column',
        alignItems: 'stretch',
      };
    }
    return {};
  };

  // Get responsive styles for action buttons based on screen size
  const getActionButtonsStyle = (): ViewStyle => {
    const screenWidth = Dimensions.get('window').width;
    const isMobile = Platform.OS !== 'web' || screenWidth < 768;
    
    if (isMobile) {
      return {
        flexDirection: 'column',
        width: '100%',
        marginLeft: 0,
        marginTop: spacing.sm,
        alignItems: 'stretch',
      };
    }
    return {};
  };

  // Get responsive styles for individual action buttons
  const getActionButtonStyle = (): ViewStyle => {
    const screenWidth = Dimensions.get('window').width;
    const isMobile = Platform.OS !== 'web' || screenWidth < 768;
    
    if (isMobile) {
      return {
        width: '100%',
        minWidth: '100%',
        marginLeft: 0,
        marginBottom: spacing.xs,
      };
    }
    return {};
  };

  const handleOpenDirections = (order: Order) => {
    const address = order.deliveryAddress || order.buyerAddress;
    let url = '';
    if (order.latitude != null && order.longitude != null) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`;
    } else if (address) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    }
    if (!url) {
      showErrorAlert('No delivery location available for directions.');
      return;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    Linking.openURL(url).catch(() => showErrorAlert('Could not open maps.'));
  };

  const getDeliveryLabel = (order: Order) => {
    const slot = formatDeliverySlot(order);
    if (slot) return slot;
    return formatDateTime(order.orderDate);
  };

  const getCollectAmount = (order: Order) => formatCurrency(order.finalBillAmount || order.total);

  const renderOrder = ({ item }: { item: Order }) => {
    // Normalize status for comparison
    const normalizedStatus = normalizeStatus(item.status);
    const isPending = normalizedStatus === normalizeStatus(OrderStatus.PENDING);
    const isConfirmed = normalizedStatus === normalizeStatus(OrderStatus.CONFIRMED);
    const isProcessing = normalizedStatus === normalizeStatus(OrderStatus.PROCESSING);
    const isConfirmedOrProcessing = isConfirmed || isProcessing;
    const isEditable = isPending || isConfirmed;
    const expanded = expandedOrderId === item.id;
    const statusColor = getStatusColor(item.status);
    const callLink = contactLinks(item.buyerPhone).call;
    const orderNote = item.billingNotes?.trim();
    const deliveryAddress = item.deliveryAddress || item.buyerAddress || 'Not specified';

    const toggleExpanded = () => {
      setExpandedOrderId((current) => (current === item.id ? null : item.id));
    };

    const statusTint =
      isPending ? '#FFEDD5'
        : isConfirmedOrProcessing ? colors.blue100
          : normalizedStatus === normalizeStatus(OrderStatus.DELIVERED) ? '#DCFCE7'
            : normalizedStatus === normalizeStatus(OrderStatus.CANCELED) ? '#FEE2E2'
              : colors.gray100;
    const cardSurface = getOrderCardSurface(item.status);

    return (
      <View
        style={[
          styles.orderCard,
          {
            backgroundColor: cardSurface.backgroundColor,
            borderColor: cardSurface.borderColor,
            borderLeftWidth: 4,
            borderLeftColor: cardSurface.accent,
          },
        ]}
      >
        <View style={styles.orderCardCollapsed}>
          <TouchableOpacity activeOpacity={0.85} onPress={toggleExpanded} style={styles.orderCardTapArea}>
            <View style={[styles.orderDocIcon, { backgroundColor: cardSurface.iconBg }]}>
              <Ionicons name="document-text-outline" size={22} color={cardSurface.accent} />
            </View>
            <View style={styles.orderCardHeaderLeft}>
              <View style={styles.orderTitleRow}>
                <Text style={styles.orderIdCompact}>#Order {String(item.id).padStart(2, '0')}</Text>
                <View style={[styles.statusPill, { backgroundColor: statusTint }]}>
                  <Text style={[styles.statusPillText, { color: isPending ? '#9A3412' : statusColor }]}>
                    {formatOrderStatus(item.status)}
                  </Text>
                </View>
              </View>
              {isStrictAdmin() && !!item.sellerBusinessName && (
                <Text style={styles.sellerNameCompact} numberOfLines={1}>{item.sellerBusinessName}</Text>
              )}
              <Text style={styles.deliveryTimeText} numberOfLines={1}>
                {getDeliveryLabel(item)}
              </Text>
              <Text style={styles.orderAmountHighlight} numberOfLines={1}>
                {getCollectAmount(item)}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.orderRowActions}>
            {isExportEligible(item) && (
              <TouchableOpacity
                style={[styles.exportBillButton, isMobile && styles.exportBillButtonIconOnly]}
                onPress={() => handleExportSingle(item)}
                disabled={exporting}
                accessibilityLabel={`Export bill for order ${item.id}`}
              >
                {exportingOrderId === item.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : isMobile ? (
                  <Ionicons name="download-outline" size={18} color={colors.primary} />
                ) : (
                  <>
                    <View style={styles.exportBillIconWrap}>
                      <Ionicons name="download-outline" size={14} color={colors.primary} />
                    </View>
                    <Text style={styles.exportBillButtonText}>Export</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => {
                if (callLink) openContact(callLink);
                else showErrorAlert('Phone number not available.');
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
        </View>

        {expanded && (
          <View style={styles.orderExpanded}>
            <View style={styles.addressBlock}>
              <View style={styles.addressBlockHeader}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <Text style={styles.addressBlockTitle}>DELIVERY ADDRESS</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
              </View>
              <Text style={styles.buyerNameCompact}>{item.buyerName}</Text>
              <Text style={styles.addressBlockText}>{deliveryAddress}</Text>
              <TouchableOpacity style={styles.directionsButton} onPress={() => handleOpenDirections(item)}>
                <Ionicons name="navigate" size={16} color={colors.primary} />
                <Text style={styles.directionsButtonText}>Directions</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.itemsBlock}>
              {item.items && item.items.length > 0 ? (
                item.items.map((orderItem, index) => (
                  <View key={index} style={styles.itemRowCompact}>
                    <View style={styles.itemLeftCol}>
                      <Text style={styles.itemNameCompact} numberOfLines={1}>{orderItem.itemName}</Text>
                      <Text style={styles.itemQtyCompact}>
                        {orderItem.quantity} × {formatCurrency(orderItem.rate || 0)}
                      </Text>
                    </View>
                    <Text style={styles.itemPriceCompact}>{formatCurrency(orderItem.subtotal)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.itemText}>No items</Text>
              )}
            </View>

            <View style={styles.collectRow}>
              <Text style={styles.collectLabel}>Total to collect</Text>
              <Text style={styles.collectAmount}>{getCollectAmount(item)}</Text>
            </View>

            {!!orderNote && (
              <View style={styles.noteBanner}>
                <Ionicons name="document-text-outline" size={16} color="#854A0E" />
                <Text style={styles.noteBannerText}>Note: {orderNote}</Text>
              </View>
            )}

            <View style={styles.secondaryActionsRow}>
              {isEditable && (
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => handleEditOrderClick(item)}
                  disabled={processingOrderId === item.id && updatingOrder}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={styles.iconActionText}>Edit</Text>
                </TouchableOpacity>
              )}
              {isExportEligible(item) && (
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => handleExportSingle(item)}
                  disabled={exporting}
                >
                  <Ionicons name="download-outline" size={16} color={colors.primary} />
                  <Text style={styles.iconActionText}>Export</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={() => navigation.navigate('OrderDetail', { order: item })}
              >
                <Ionicons name="open-outline" size={18} color={colors.primary} />
                <Text style={styles.iconActionText}>Details</Text>
              </TouchableOpacity>
            </View>

            {!isPending && isConfirmedOrProcessing && (
              <View style={[styles.confirmedActionsWrap, getActionButtonsStyle()]}>
                {canEditOrderBill(item) && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.billButton, getActionButtonStyle()]}
                    onPress={() => {
                      setBillingOrder(item);
                      setBillModalVisible(true);
                    }}
                  >
                    <Text style={styles.billButtonText}>Add / Edit Bill</Text>
                  </TouchableOpacity>
                )}
                {item.finalBillAmount && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deliverButton, getActionButtonStyle()]}
                    onPress={() => {
                      showConfirmAlert(
                        'Confirm Delivery',
                        'Confirm delivery to customer?',
                        () => handleDeliverOrder(item.id),
                        () => {}
                      );
                    }}
                    disabled={processingOrderId === item.id && delivering}
                  >
                    {processingOrderId === item.id && delivering ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.deliverButtonText}>Delivery to Client</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!isPending && !isConfirmedOrProcessing && canEditOrderBill(item) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.billButton, { marginTop: spacing.sm }, getActionButtonStyle()]}
                onPress={() => {
                  setBillingOrder(item);
                  setBillModalVisible(true);
                }}
              >
                <Text style={styles.billButtonText}>Edit Bill</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {(isPending || isConfirmedOrProcessing) && (
          <View style={[styles.orderCardActions, styles.orderCardActionsOnTint]}>
            <TouchableOpacity
              style={styles.cancelTextButton}
              onPress={() => {
                if (processingOrderId === item.id) return;
                showConfirmAlert(
                  'Cancel Order',
                  'Are you sure you want to cancel this order?',
                  () => handleCancelOrder(item.id),
                  () => {}
                );
              }}
              disabled={processingOrderId === item.id && canceling}
            >
              {processingOrderId === item.id && canceling ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Text style={styles.cancelTextButtonLabel}>Cancel order</Text>
              )}
            </TouchableOpacity>

            {isPending ? (
              <TouchableOpacity
                style={styles.confirmPrimaryButton}
                onPress={() => {
                  if (processingOrderId === item.id) return;
                  showConfirmAlert(
                    'Confirm Order',
                    'Do you want to confirm this order?',
                    () => handleConfirmOrder(item.id),
                    () => {}
                  );
                }}
                disabled={processingOrderId === item.id && confirming}
              >
                {processingOrderId === item.id && confirming ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color={colors.white} />
                    <Text style={styles.confirmPrimaryButtonText}>Confirm order</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.confirmedChip}>
                <Text style={styles.confirmedChipText}>Confirmed</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading orders..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <View style={[styles.filterTopRow, isMobile && styles.filterTopRowMobile]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsRow}
          >
            {([
              { id: 'ALL' as const, label: 'All', count: orderTabCounts.all },
              { id: 'ACTIVE' as const, label: 'Active', count: orderTabCounts.active },
              { id: 'COMPLETE' as const, label: 'Complete', count: orderTabCounts.complete },
            ]).map((tab) => {
              const selected = listTab === tab.id && statusFilter === 'ALL';
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.listTab, selected && styles.listTabActive]}
                  onPress={() => {
                    setListTab(tab.id);
                    setStatusFilter('ALL');
                    setStatusMenuOpen(false);
                  }}
                >
                  <Text style={[styles.listTabText, selected && styles.listTabTextActive]}>
                    {tab.label}
                  </Text>
                  <View style={[styles.listTabCount, selected && styles.listTabCountActive]}>
                    <Text style={[styles.listTabCountText, selected && styles.listTabCountTextActive]}>
                      {tab.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.statusMenuWrap}>
            <TouchableOpacity
              style={[styles.statusMenuButton, statusFilter !== 'ALL' && styles.statusMenuButtonActive]}
              onPress={() => setStatusMenuOpen((open) => !open)}
            >
              <Text
                style={[styles.statusMenuText, statusFilter !== 'ALL' && styles.statusMenuTextActive]}
                numberOfLines={1}
              >
                {statusFilterLabel}
              </Text>
              <Text style={[styles.statusMenuCaret, statusFilter !== 'ALL' && styles.statusMenuTextActive]}>
                {statusMenuOpen ? '▴' : '▾'}
              </Text>
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
                    onPress={() => applyStatusFilter(option.id)}
                  >
                    <Text
                      style={[
                        styles.statusMenuItemText,
                        statusFilter === option.id && styles.statusMenuItemTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.exportOrdersButton,
              exporting && styles.exportOrdersButtonDisabled,
              isMobile && styles.exportOrdersButtonMobile,
            ]}
            onPress={handleExportFiltered}
            disabled={exporting}
            activeOpacity={0.85}
            accessibilityLabel="Export orders"
          >
            {isMobile ? (
              <Ionicons name="download-outline" size={16} color={colors.white} />
            ) : (
              <>
                <View style={styles.exportOrdersIconWrap}>
                  <Ionicons name="download-outline" size={13} color={colors.primary} />
                </View>
                <Text style={styles.exportOrdersButtonText}>
                  {exporting ? '…' : 'Export'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.dateRangeRow, isMobile && styles.dateRangeRowMobile]}>
          <TouchableOpacity
            style={[styles.dateRangeButton, isMobile && styles.dateRangeButtonMobile]}
            onPress={() => setDateModalVisible(true)}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={styles.dateRangeButtonText}>Select Date Range</Text>
          </TouchableOpacity>

          {hasDateRange && (
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>
                {formatYmdDisplay(fromDate)} – {formatYmdDisplay(toDate)}
              </Text>
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
        {isStrictAdmin() && sellerOptions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sellerFilterRow}
            contentContainerStyle={styles.filterScrollContent}
          >
            {['ALL', ...sellerOptions].map((name) => (
              <TouchableOpacity
                key={name}
                style={[styles.filterButton, sellerFilter === name && styles.filterButtonActive]}
                onPress={() => setSellerFilter(name)}
              >
                <Text style={[styles.filterButtonText, sellerFilter === name && styles.filterButtonTextActive]}>
                  {name === 'ALL' ? 'All sellers' : name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <FlatList
        data={filteredOrders || []}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              title="No orders found"
              message={isSeller() && !isStrictAdmin() ? 'Add an order when a customer calls.' : 'Orders will show here after buyers place them.'}
              actionLabel={isSeller() && !isStrictAdmin() ? 'Add order' : undefined}
              onAction={isSeller() && !isStrictAdmin()
                ? () => navigation.getParent()?.navigate('PhoneOrder') || navigation.navigate('PhoneOrder')
                : undefined}
            />
            {error && (
              <Text style={styles.errorText}>
                Error: {(error as any)?.data?.message || (error as any)?.message || 'Failed to load orders'}
              </Text>
            )}
          </View>
        }
      />

      <EditOrderModal
        visible={editModalVisible}
        order={editingOrder}
        products={menuItems as any}
        onClose={() => {
          setEditModalVisible(false);
          setEditingOrder(null);
        }}
        onSave={handleSaveOrderChanges}
      />

      <DateRangeModal
        visible={dateModalVisible}
        initialValue={selectedDateRange}
        onClose={() => setDateModalVisible(false)}
        onApply={(range) => {
          setSelectedDateRange(range);
          const start = range.startDate ? toLocalYmd(range.startDate) : '';
          const end = range.endDate ? toLocalYmd(range.endDate) : '';
          setFromDate(start);
          setToDate(end);
          setDateModalVisible(false);
        }}
      />

      <BillEditModal
        visible={billModalVisible}
        order={billingOrder}
        onClose={() => {
          setBillModalVisible(false);
          setBillingOrder(null);
        }}
        onSave={handleSaveBill}
        isLoading={updatingBill}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterContainer: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 20,
    overflow: 'visible',
  },
  categoryRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusMenuWrap: {
    position: 'relative',
    zIndex: 50,
    flexShrink: 0,
  },
  statusMenuButton: {
    height: 34,
    minWidth: 100,
    maxWidth: 130,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#F0F9FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  statusMenuButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusMenuText: {
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
    maxWidth: 96,
  },
  statusMenuTextActive: {
    color: colors.white,
  },
  statusMenuCaret: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
  statusMenu: {
    position: 'absolute',
    top: 36,
    right: 0,
    left: undefined,
    minWidth: 160,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    overflow: 'hidden',
    zIndex: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
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
  filterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    minHeight: 34,
  },
  filterTopRowMobile: {
    flexWrap: 'nowrap',
    minHeight: 34,
  },
  exportOrdersButton: {
    backgroundColor: colors.primary,
    height: 34,
    paddingLeft: 5,
    paddingRight: 10,
    borderRadius: borderRadius.full,
    marginLeft: 'auto',
    flexShrink: 0,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  exportOrdersIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '48%',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.xs,
    height: 34,
  },
  listTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  listTabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  listTabTextActive: {
    color: colors.white,
  },
  listTabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  listTabCountText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  listTabCountTextActive: {
    color: colors.white,
  },
  subFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  subFilterLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  subFilterClear: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  exportOrdersButtonMobile: {
    width: 34,
    height: 34,
    paddingLeft: 0,
    paddingRight: 0,
    marginLeft: 'auto',
  },
  exportOrdersButtonDisabled: {
    backgroundColor: colors.gray400,
    borderColor: colors.gray400,
  },
  exportOrdersButtonText: {
    fontSize: 11,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.2,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  dateRangeRowMobile: {
    marginTop: spacing.sm,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  dateRangeButtonMobile: {
    flex: 1,
    justifyContent: 'center',
  },
  dateRangeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 108, 247, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(74, 108, 247, 0.25)',
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
    lineHeight: typography.fontSize.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
    marginHorizontal: spacing.xs,
    backgroundColor: colors.gray100,
    minHeight: 40, // Touch-friendly height
  },
  filterButtonMobile: {
    // Ensure buttons are touch-friendly on mobile
    minHeight: 44, // iOS/Android minimum touch target
    paddingVertical: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
  },
  orderCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  orderCardActionsOnTint: {
    backgroundColor: 'rgba(255,255,255,0.55)',
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
  sellerNameCompact: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    marginTop: 2,
  },
  deliveryTimeText: {
    marginTop: 4,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  orderAmountHighlight: {
    marginTop: 2,
    fontSize: typography.fontSize.base,
    color: colors.error,
    fontWeight: typography.fontWeight.bold,
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
  buyerNameCompact: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  orderRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  exportBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  exportBillButtonIconOnly: {
    paddingLeft: 0,
    paddingRight: 0,
    paddingVertical: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.blue100,
    borderColor: colors.blue300,
  },
  exportBillIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBillButtonText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    letterSpacing: 0.2,
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
  directionsButton: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.blue100,
  },
  directionsButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
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
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  itemPriceCompact: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
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
  confirmedActionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  orderIdentity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 180,
  },
  orderIdentityText: {
    flex: 1,
  },
  billIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  qtyChip: {
    minWidth: 28,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qtyChipText: {
    color: colors.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  itemName: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  itemPrice: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  exportUnderStatusButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 2,
    },
  },
  exportUnderStatusButtonDisabled: {
    opacity: 0.6,
  },
  exportUnderStatusIcon: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexShrink: 1,
  },
  editIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconButtonDisabled: {
    opacity: 0.6,
  },
  editIconText: {
    fontSize: 16,
  },
  sellerName: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    marginTop: 2,
  },
  sellerFilterRow: {
    marginTop: spacing.sm,
  },
  orderId: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  customerName: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  customerPhone: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
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
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: spacing.sm,
  },
  addressLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
  addressText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    marginTop: spacing.xs,
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
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    flexWrap: 'wrap',
  },
  totalContainer: {
    flex: 1,
    minWidth: 120,
    marginBottom: spacing.xs,
  },
  totalBox: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  totalLabel: {
    fontSize: typography.fontSize.sm,
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
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: spacing.sm,
  },
  actionButton: {
    height: 44,
    minWidth: 140,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButton: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  confirmButton: {
    backgroundColor: colors.success,
  },
  confirmButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  billButton: {
    backgroundColor: '#FF9800',
  },
  billButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  deliverButton: {
    backgroundColor: '#4CAF50',
  },
  deliverButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.sm,
  },
  filterScrollView: {
    flex: 1, // Take available space
    flexShrink: 1, // Allow shrinking if needed
    minWidth: 0, // Important for flex to work properly
  },
  filterScrollViewMobile: {
    // On mobile, ensure scrollable area takes available space
    flex: 1,
    maxWidth: '100%', // Prevent overflow
  },
  filterScrollContent: {
    // Content container for horizontal scroll
    paddingRight: spacing.xs, // Add padding at the end for better UX
    alignItems: 'center', // Vertically center buttons
  },
});
