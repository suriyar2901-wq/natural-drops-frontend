import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme';
import { Card, Loading, OrderTimer } from '../../components/common';
import { useAuth } from '../../hooks';
import { useGetBuyerOrdersQuery } from '../../store/api/orderApi';
import { 
  useGetUnreadBuyerNotificationsQuery, 
  useGetUnreadBuyerNotificationCountQuery,
  useMarkBuyerNotificationAsReadMutation 
} from '../../store/api/notificationApi';
import { Order, OrderStatus } from '../../types';
import { formatCurrency, formatDateTime, formatOrderStatus } from '../../utils/formatters';
import { ORDER_STATUS_COLORS } from '../../utils/constants';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationPreview } from '../../components/common/NotificationPreview';
import { DeliverySlotBadge } from '../../components/common/DeliverySlotBadge';

export const OrdersScreen = ({ navigation }: any) => {
  const { user } = useAuth();
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

  const renderOrder = ({ item }: { item: Order }) => {
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('OrderDetail', { order: item })}
      >
        <Card style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>Order #{item.id}</Text>
            <View style={styles.headerRight}>
              {/* Timer at top-right (above status) */}
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
            {item.latitude && item.longitude && (
              <Text style={styles.coordinatesText}>
                Coordinates: {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
              </Text>
            )}
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
      </Card>
    </TouchableOpacity>
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

      <FlatList
        data={orders || []}
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
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubtext}>Start shopping to place your first order!</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  orderCard: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 110,
  },
  orderId: {
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

