import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme';
import { Card, EmptyState, Loading, DateRangeModal, EditOrderModal, BillEditModal } from '../../components/common';
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
import { canEditOrderBill, formatCurrency, formatDateTime, formatOrderStatus } from '../../utils/formatters';
import { DeliverySlotBadge } from '../../components/common/DeliverySlotBadge';
import { ORDER_STATUS_COLORS } from '../../utils/constants';
import { showAlert, showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../utils/alert';
import { useAuth } from '../../hooks';
import { useGetShopBuyersQuery } from '../../store/api/shopApi';

export const OrderManagementScreen = () => {
  // Note: navigation is passed by React Navigation; used for Order Details.
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [category, setCategory] = useState<'active' | 'complete'>('active');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
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
      setCategory('complete');
      setStatusFilter(OrderStatus.DELIVERED);
    } else if (initialStatus === OrderStatus.CANCELED) {
      setStatusFilter(OrderStatus.CANCELED);
    } else if (initialStatus === OrderStatus.PENDING || initialStatus === OrderStatus.CONFIRMED) {
      setCategory('active');
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

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let list = orders;
    if (isSeller() && !isStrictAdmin()) {
      const buyerIds = new Set((myBuyers || []).map((buyer) => Number(buyer.id)));
      list = orders.filter((order) => buyerIds.has(Number(order.buyerId)));
    }
    if (isStrictAdmin() && sellerFilter !== 'ALL') {
      list = list.filter((order) => (order.sellerBusinessName || '').trim() === sellerFilter);
    }
    list = list.filter((order) => {
      const status = normalizeStatus(order.status);
      if (statusFilter === OrderStatus.CONFIRMED) {
        return status === normalizeStatus(OrderStatus.CONFIRMED)
          || status === normalizeStatus(OrderStatus.PROCESSING);
      }
      if (statusFilter !== 'ALL') {
        return status === normalizeStatus(statusFilter);
      }
      if (category === 'active') {
        return status === normalizeStatus(OrderStatus.PENDING)
          || status === normalizeStatus(OrderStatus.CONFIRMED)
          || status === normalizeStatus(OrderStatus.PROCESSING);
      }
      return status === normalizeStatus(OrderStatus.DELIVERED);
    });
    return list;
  }, [orders, category, statusFilter, myBuyers, isSeller, isStrictAdmin, sellerFilter]);

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
    }
  };

  const handleExportFiltered = async () => {
    try {
      setExporting(true);
      const date = toLocalYmd(new Date());
      const filename = `orders_${date}.pdf`;
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', String(statusFilter));
      else if (category === 'complete') params.set('status', OrderStatus.DELIVERED);
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
      setCategory('active');
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
      setCategory('complete');
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
  const getOrderFooterStyle = () => {
    const screenWidth = Dimensions.get('window').width;
    const isMobile = Platform.OS !== 'web' || screenWidth < 768;
    
    if (isMobile) {
      return {
        flexDirection: 'column' as const,
        alignItems: 'stretch',
      };
    }
    return {};
  };

  // Get responsive styles for action buttons based on screen size
  const getActionButtonsStyle = () => {
    const screenWidth = Dimensions.get('window').width;
    const isMobile = Platform.OS !== 'web' || screenWidth < 768;
    
    if (isMobile) {
      return {
        flexDirection: 'column' as const,
        width: '100%',
        marginLeft: 0,
        marginTop: spacing.sm,
        alignItems: 'stretch',
      };
    }
    return {};
  };

  // Get responsive styles for individual action buttons
  const getActionButtonStyle = () => {
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

  const renderOrder = ({ item }: { item: Order }) => {
    // Normalize status for comparison
    const normalizedStatus = normalizeStatus(item.status);
    const isPending = normalizedStatus === normalizeStatus(OrderStatus.PENDING);
    const isConfirmed = normalizedStatus === normalizeStatus(OrderStatus.CONFIRMED);
    const isProcessing = normalizedStatus === normalizeStatus(OrderStatus.PROCESSING);
    const isConfirmedOrProcessing = isConfirmed || isProcessing;
    const isEditable = isPending || isConfirmed;
    
    console.log(`🔍 Order #${item.id} status check:`, {
      rawStatus: item.status,
      normalizedStatus,
      isPending,
      isConfirmed,
      isProcessing,
      isConfirmedOrProcessing,
      OrderStatusPENDING: OrderStatus.PENDING,
      statusEquals: normalizedStatus === normalizeStatus(OrderStatus.PENDING)
    });

    return (
      <Card style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{item.id}</Text>
            {isStrictAdmin() && !!item.sellerBusinessName && (
              <Text style={styles.sellerName}>Seller: {item.sellerBusinessName}</Text>
            )}
            <Text style={styles.customerName}>{item.buyerName}</Text>
            <Text style={styles.customerPhone}>{item.buyerPhone}</Text>
          </View>
          <View style={styles.headerRight}>
            {isEditable && (
              <TouchableOpacity
                style={[styles.editIconButton, (processingOrderId === item.id && updatingOrder) && styles.editIconButtonDisabled]}
                onPress={() => handleEditOrderClick(item)}
                disabled={processingOrderId === item.id && updatingOrder}
              >
                <Text style={styles.editIconText}>✏️</Text>
              </TouchableOpacity>
            )}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{formatOrderStatus(item.status)}</Text>
            </View>
            {/* Export icon under status badge (Confirmed + Delivered) */}
            {isExportEligible(item) && (
              <TouchableOpacity
                style={[styles.exportUnderStatusButton, exporting && styles.exportUnderStatusButtonDisabled]}
                onPress={() => handleExportSingle(item)}
                disabled={exporting}
              >
                <Text style={styles.exportUnderStatusIcon}>⤓</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.orderDate}>{formatDateTime(item.orderDate)}</Text>

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

        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>Delivery Address:</Text>
          <Text style={styles.addressText}>
            {item.deliveryAddress || item.buyerAddress || 'Not specified'}
          </Text>
          {item.latitude && item.longitude && (
            <Text style={styles.coordinatesText}>
              📍 {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
            </Text>
          )}
        </View>

        <View style={[styles.orderFooter, getOrderFooterStyle()]}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>
              {item.finalBillAmount ? 'Final Bill Amount' : 'Total Amount'}
            </Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(item.finalBillAmount || item.total)}
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
          </View>
          <View style={[styles.actionButtonsContainer, getActionButtonsStyle()]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.detailsButton, getActionButtonStyle()]}
              onPress={() => navigation.navigate('OrderDetail', { order: item })}
            >
              <Text style={styles.detailsButtonText}>View Details</Text>
            </TouchableOpacity>
            {isPending && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton, getActionButtonStyle()]}
                  onPress={() => {
                    // Prevent multiple clicks
                    if (processingOrderId === item.id) {
                      console.log('⚠️ Order already being processed, ignoring click');
                      return;
                    }
                    
                    console.log('🔘 Cancel button pressed for order:', item.id);
                    showConfirmAlert(
                      'Cancel Order',
                      'Are you sure you want to cancel this order?',
                      () => {
                        console.log('✅ Cancel confirmed, calling handleCancelOrder');
                        handleCancelOrder(item.id);
                      },
                      () => {
                        console.log('❌ Cancel cancelled by user');
                      }
                    );
                  }}
                  disabled={processingOrderId === item.id && canceling}
                >
                  {processingOrderId === item.id && canceling ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.cancelButtonText}>✕ Cancel Order</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton, getActionButtonStyle()]}
                  onPress={() => {
                    // Prevent multiple clicks
                    if (processingOrderId === item.id) {
                      console.log('⚠️ Order already being processed, ignoring click');
                      return;
                    }
                    
                    console.log('🔘 Confirm button pressed for order:', item.id);
                    showConfirmAlert(
                      'Confirm Order',
                      'Do you want to confirm this order?',
                      () => {
                        console.log('✅ Confirm confirmed, calling handleConfirmOrder');
                        handleConfirmOrder(item.id);
                      },
                      () => {
                        console.log('❌ Confirm cancelled by user');
                      }
                    );
                  }}
                  disabled={processingOrderId === item.id && confirming}
                >
                  {processingOrderId === item.id && confirming ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.confirmButtonText}>✓ Confirm Order</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
            {isConfirmedOrProcessing && (
              <>
                {canEditOrderBill(item) && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.billButton, getActionButtonStyle()]}
                    onPress={() => {
                      setBillingOrder(item);
                      setBillModalVisible(true);
                    }}
                  >
                    <Text style={styles.billButtonText}>💰 Add / Edit Bill</Text>
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
                      <Text style={styles.deliverButtonText}>🚚 Delivery to Client</Text>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton, getActionButtonStyle()]}
                  onPress={() => {
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
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.cancelButtonText}>✕ Cancel Order</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
            {!isConfirmedOrProcessing && canEditOrderBill(item) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.billButton, getActionButtonStyle()]}
                onPress={() => {
                  setBillingOrder(item);
                  setBillModalVisible(true);
                }}
              >
                <Text style={styles.billButtonText}>💰 Edit Bill</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading orders..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <View style={[styles.filterTopRow, isMobile && styles.filterTopRowMobile]}>
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
                  <Text style={[styles.filterButtonText, selected && styles.filterButtonTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <View style={styles.statusMenuWrap}>
              <TouchableOpacity
                style={styles.statusMenuButton}
                onPress={() => setStatusMenuOpen((open) => !open)}
              >
                <Text style={styles.statusMenuText}>
                  {statusFilter === 'ALL'
                    ? 'All status'
                    : statusFilter === OrderStatus.CANCELED
                      ? 'Cancelled'
                      : formatOrderStatus(statusFilter)}
                </Text>
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
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.exportOrdersButton, 
              exporting && styles.exportOrdersButtonDisabled,
              isMobile && styles.exportOrdersButtonMobile,
            ]}
            onPress={handleExportFiltered}
            disabled={exporting}
          >
            <Text style={styles.exportOrdersButtonText}>
              {exporting ? 'Exporting…' : isMobile ? 'Export' : 'Export Orders'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dateRangeRow}>
          <TouchableOpacity style={styles.dateRangeButton} onPress={() => setDateModalVisible(true)}>
            <Text style={styles.dateRangeButtonText}>📅 Select Date Range</Text>
          </TouchableOpacity>

          {hasDateRange && (
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>📅 {fromDate} → {toDate}</Text>
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
    zIndex: 30,
  },
  statusMenuButton: {
    minHeight: 36,
    minWidth: 140,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
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
    position: 'absolute',
    top: 40,
    left: 0,
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
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  filterTopRowMobile: {
    // On mobile, ensure proper spacing and prevent overflow
    flexWrap: 'nowrap',
    minHeight: 44, // Touch-friendly height
  },
  exportOrdersButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
    marginLeft: spacing.sm,
    flexShrink: 0, // Prevent button from shrinking
    minWidth: 100, // Minimum width for desktop
  },
  exportOrdersButtonMobile: {
    // Smaller button on mobile to save space
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.xs,
    minWidth: 70,
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
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  dateRangeButton: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
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
    position: 'relative',
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
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: spacing.sm,
  },
  addressLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  addressText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
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
