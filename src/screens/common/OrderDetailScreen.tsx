import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme';
import { BillEditModal, Card, EditOrderModal, Loading } from '../../components/common';
import { useGetMenuItemsQuery } from '../../store/api/menuApi';
import {
  useCancelOrderMutation,
  useConfirmOrderMutation,
  useDeliverOrderMutation,
  useGetOrderByIdQuery,
  useUpdateOrderBillMutation,
  useUpdateOrderMutation,
} from '../../store/api/orderApi';
import { MenuItem, Order, OrderStatus } from '../../types';
import { canEditOrderBill, formatCurrency, formatDateTime, formatOrderStatus } from '../../utils/formatters';
import { orderBillPending } from '../../types/shop.types';
import { DeliverySlotBadge } from '../../components/common/DeliverySlotBadge';
import { useAuth } from '../../hooks';
import { storageService } from '../../services/storage.service';
import { API_BASE_URL } from '../../utils/constants';
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';

const statusColor = (status: string): string => {
  const value = String(status || '').toLowerCase();
  if (value === OrderStatus.CONFIRMED || value === OrderStatus.PROCESSING) return '#2196F3';
  if (value === OrderStatus.DELIVERED) return '#4CAF50';
  if (value === OrderStatus.CANCELED) return '#F44336';
  return '#757575';
};

export const OrderDetailScreen = () => {
  const route = useRoute<any>();
  const routeOrder: Order | undefined = route?.params?.order;
  const routeOrderId = Number(route?.params?.orderId || routeOrder?.id || 0);
  const { data: fetchedOrder, isLoading: loadingOrder, isError: orderError } = useGetOrderByIdQuery(routeOrderId, {
    skip: !routeOrderId,
  });
  const [order, setOrder] = useState<Order | undefined>(routeOrder);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [sellerName, setSellerName] = useState('seller');
  const { isAdmin, isBuyer } = useAuth();
  const [downloadingBill, setDownloadingBill] = useState(false);
  const { data: menuItems, isLoading } = useGetMenuItemsQuery();
  const [updateOrderBill, { isLoading: updatingBill }] = useUpdateOrderBillMutation();
  const [confirmOrder, { isLoading: confirming }] = useConfirmOrderMutation();
  const [cancelOrder, { isLoading: canceling }] = useCancelOrderMutation();
  const [deliverOrder, { isLoading: delivering }] = useDeliverOrderMutation();
  const [updateOrder, { isLoading: updatingOrder }] = useUpdateOrderMutation();

  useEffect(() => {
    if (fetchedOrder?.id) setOrder(fetchedOrder);
    else if (routeOrder) setOrder(routeOrder);
  }, [routeOrder, fetchedOrder]);

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

  const canEditBill = !!order && isAdmin() && canEditOrderBill(order);
  const status = String(order?.status || '').toLowerCase();
  const isPending = status === OrderStatus.PENDING;
  const isConfirmed = status === OrderStatus.CONFIRMED || status === OrderStatus.PROCESSING;
  const acting = confirming || canceling || delivering || updatingOrder;
  const canEditOrder = isAdmin() && (isPending || isConfirmed);

  const downloadBill = async () => {
    if (!order || !isBuyer()) return;
    try {
      setDownloadingBill(true);
      const token = await storageService.getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/orders/${order.id}/export/pdf?sellerName=${encodeURIComponent(sellerName)}`,
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
      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `order-${order.id}-bill.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      showSuccessAlert('Bill downloaded');
    } catch (error: any) {
      showErrorAlert(error?.message || 'Could not download this bill');
    } finally {
      setDownloadingBill(false);
    }
  };

  const handleSaveOrder = async (data: any) => {
    if (!order) return;
    try {
      const updated = await updateOrder({ id: order.id, data }).unwrap();
      if (updated && updated.id) setOrder(updated);
      setEditModalVisible(false);
      showSuccessAlert('Order updated successfully');
    } catch (e: any) {
      showErrorAlert(e?.data?.message || e?.message || 'Failed to update order');
    }
  };

  const applyUpdatedOrder = (updated: Order | undefined, fallbackStatus: OrderStatus) => {
    if (updated && updated.id) {
      setOrder(updated);
      return;
    }
    setOrder((current) => (current ? { ...current, status: fallbackStatus } : current));
  };

  const handleConfirm = () => {
    if (!order || acting) return;
    showConfirmAlert('Confirm Order', 'Do you want to confirm this order?', async () => {
      try {
        const updated = await confirmOrder({ id: order.id, data: { confirmedBy: sellerName } }).unwrap();
        applyUpdatedOrder(updated, OrderStatus.CONFIRMED);
        showSuccessAlert('Order confirmed successfully.');
      } catch (e: any) {
        showErrorAlert(e?.data?.message || e?.message || 'Failed to confirm order');
      }
    });
  };

  const handleCancel = () => {
    if (!order || acting) return;
    showConfirmAlert('Cancel Order', 'Are you sure you want to cancel this order?', async () => {
      try {
        const updated = await cancelOrder({ id: order.id, data: { canceledBy: sellerName, reason: 'Canceled from order details' } }).unwrap();
        applyUpdatedOrder(updated, OrderStatus.CANCELED);
        showSuccessAlert('Order canceled.');
      } catch (e: any) {
        showErrorAlert(e?.data?.message || e?.message || 'Failed to cancel order');
      }
    });
  };

  const handleDeliver = () => {
    if (!order || acting) return;
    showConfirmAlert('Confirm Delivery', 'Confirm delivery to customer?', async () => {
      try {
        const updated = await deliverOrder({ id: order.id, data: { deliveredBy: sellerName } }).unwrap();
        applyUpdatedOrder(updated, OrderStatus.DELIVERED);
        showSuccessAlert('Order marked as delivered successfully!');
      } catch (e: any) {
        showErrorAlert(e?.data?.message || e?.message || 'Failed to mark order as delivered');
      }
    });
  };

  const handleSaveBill = async (finalBillAmount: number, billingNotes: string) => {
    if (!order) return;
    const buyerNotified = order.paymentStatus === 'PARTIALLY_PAID';
    try {
      const updatedOrder = await updateOrderBill({
        id: order.id,
        data: {
          finalBillAmount,
          billingNotes,
          billedBy: sellerName,
        },
      }).unwrap();
      setOrder(updatedOrder);
      setBillModalVisible(false);
      showSuccessAlert(buyerNotified ? 'Bill updated. The buyer has been notified.' : 'Bill updated successfully');
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || 'Failed to update bill';
      showErrorAlert(msg);
    }
  };

  const menuMap = useMemo(() => {
    const map = new Map<number, MenuItem>();
    (menuItems || []).forEach((m) => map.set(m.id, m));
    return map;
  }, [menuItems]);

  if (!order) {
    if (loadingOrder) {
      return <Loading fullScreen message="Loading order bill..." />;
    }
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Order Details</Text>
        <Text style={styles.muted}>{orderError ? 'Could not open this order bill.' : 'No order provided.'}</Text>
      </View>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Loading order details..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.headerCard}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Order #{order.id}</Text>
          <View style={styles.titleActions}>
            {canEditOrder && (
              <TouchableOpacity
                style={[styles.editIconButton, updatingOrder && styles.editIconButtonDisabled]}
                onPress={() => setEditModalVisible(true)}
                disabled={updatingOrder}
              >
                <Text style={styles.editIconText}>Edit</Text>
              </TouchableOpacity>
            )}
            <View style={[styles.statusBadge, { backgroundColor: statusColor(order.status) }]}>
              <Text style={styles.statusText}>{formatOrderStatus(order.status)}</Text>
            </View>
            {isBuyer() && (
              <TouchableOpacity
                style={[styles.editIconButton, downloadingBill && styles.editIconButtonDisabled]}
                onPress={downloadBill}
                disabled={downloadingBill}
              >
                <Ionicons name="download-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.muted}>{formatDateTime(order.orderDate || (order as any).createdAt)}</Text>
        <Text style={styles.sectionLabel}>Customer</Text>
        <Text style={styles.text}>{order.buyerName}</Text>
        {!!order.buyerPhone && <Text style={styles.muted}>{order.buyerPhone}</Text>}
        <Text style={styles.sectionLabel}>Delivery Address</Text>
        <Text style={styles.text}>{order.deliveryAddress || order.buyerAddress || 'Not specified'}</Text>
        <Text style={styles.sectionLabel}>Bill total</Text>
        <Text style={styles.total}>{formatCurrency(order.total || (order as any).totalAmount || 0)}</Text>
        <Text style={styles.originalAmount}>
          Paid {formatCurrency(Math.max(0, (Number(order.total) || 0) - orderBillPending(order)))}
          {' · '}
          Balance {formatCurrency(orderBillPending(order))}
        </Text>
        <DeliverySlotBadge order={order} />
        
        {order.paymentStatus && (
          <View style={[
            styles.paymentStatusBadge,
            order.paymentStatus === 'PAID' && styles.paymentStatusPaid,
            order.paymentStatus === 'UNPAID' && styles.paymentStatusUnpaid,
            order.paymentStatus === 'PARTIALLY_PAID' && styles.paymentStatusPartial,
          ]}>
            <Text style={styles.paymentStatusText}>
              {order.paymentStatus === 'PAID' ? 'PAID' : 
               order.paymentStatus === 'UNPAID' ? 'UNPAID' : 
               'PARTIALLY PAID'}
            </Text>
          </View>
        )}
        
        {(order.paymentStatus === 'UNPAID' || order.paymentStatus === 'PARTIALLY_PAID') && (
          <View style={styles.paymentPendingContainer}>
            <Text style={styles.paymentPendingText}>
              Payment pending. Please contact seller or support.
            </Text>
          </View>
        )}

        {isAdmin() && order.paymentStatus === 'PAID' && (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedText}>This bill is fully paid and cannot be edited.</Text>
          </View>
        )}
        
        {order.status === 'delivered' && (
          <View style={styles.deliveryStatusContainer}>
            <Text style={styles.deliveryStatusText}>
              Order delivered
            </Text>
            {order.deliveredBy && (
              <Text style={styles.deliveredByText}>
                Delivered by: {order.deliveredBy}
              </Text>
            )}
            {order.statusUpdatedAt && (
              <Text style={styles.deliveredByText}>
                Delivered at: {formatDateTime(order.statusUpdatedAt)}
              </Text>
            )}
          </View>
        )}
        {isAdmin() && (isPending || isConfirmed || canEditBill) && (
          <View style={styles.buttonRow}>
            {canEditBill && (
              <TouchableOpacity style={[styles.actionButton, styles.billButton]} onPress={() => setBillModalVisible(true)} disabled={acting}>
                <Text style={styles.actionText}>{isConfirmed ? 'Add / Edit Bill' : 'Edit Bill'}</Text>
              </TouchableOpacity>
            )}
            {isConfirmed && !!order.finalBillAmount && (
              <TouchableOpacity style={[styles.actionButton, styles.deliverButton]} onPress={handleDeliver} disabled={acting}>
                {delivering ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.actionText}>Delivery to Client</Text>}
              </TouchableOpacity>
            )}
            {(isPending || isConfirmed) && (
              <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleCancel} disabled={acting}>
                {canceling ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.actionText}>✕ Cancel Order</Text>}
              </TouchableOpacity>
            )}
            {isPending && (
              <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={handleConfirm} disabled={acting}>
                {confirming ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.actionText}>✓ Confirm Order</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>

      <Text style={styles.sectionTitle}>Items & Media</Text>

      {(order.items || []).map((it, idx) => {
        const menuItem = it.menuItemId ? menuMap.get(it.menuItemId) : undefined;
        const images = (menuItem?.images || []).map((img: any) => img.imageUrl || img.url).filter(Boolean);

        return (
          <Card key={`${it.menuItemId || idx}-${idx}`} style={styles.itemCard}>
            <Text style={styles.itemName}>
              {it.quantity}x {it.itemName}
            </Text>
            <Text style={styles.muted}>{formatCurrency(it.subtotal)}</Text>

            <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Product Photos</Text>
            {images.length > 0 ? (
              <View style={styles.mediaGrid}>
                {images.map((uri: string, i: number) => (
                  <View key={`${uri}-${i}`} style={styles.mediaThumbWrap}>
                    <Image source={{ uri }} style={styles.mediaThumb} resizeMode="cover" />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>No photos</Text>
            )}
          </Card>
        );
      })}

      <EditOrderModal
        visible={editModalVisible}
        order={order}
        products={(menuItems || []) as MenuItem[]}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveOrder}
      />

      <BillEditModal
        visible={billModalVisible}
        order={order}
        onClose={() => setBillModalVisible(false)}
        onSave={handleSaveBill}
        isLoading={updatingBill}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerCard: {
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  editIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    minHeight: 28,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  buttonRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    height: 44,
    minWidth: 150,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  confirmButton: {
    backgroundColor: colors.success,
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  billButton: {
    backgroundColor: '#FF9800',
  },
  deliverButton: {
    backgroundColor: '#4CAF50',
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  text: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  muted: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  total: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  itemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  mediaThumbWrap: {
    width: 86,
    height: 86,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray100,
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  originalAmount: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textDecorationLine: 'line-through',
  },
  balanceAmount: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.md,
    color: colors.warning,
    fontWeight: typography.fontWeight.bold,
  },
  paymentStatusBadge: {
    marginTop: spacing.md,
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
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  paymentPendingContainer: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  paymentPendingText: {
    fontSize: typography.fontSize.sm,
    color: '#856404',
    fontWeight: typography.fontWeight.medium,
  },
  editBillButton: {
    marginTop: spacing.md,
  },
  lockedBanner: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  lockedText: {
    fontSize: typography.fontSize.sm,
    color: '#2E7D32',
    fontWeight: typography.fontWeight.medium,
  },
  deliveryStatusContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  deliveryStatusText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: '#2E7D32',
  },
  deliveredByText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});


