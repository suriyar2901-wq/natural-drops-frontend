import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme';
import { BillEditModal, Button, Card, Loading } from '../../components/common';
import { useGetMenuItemsQuery } from '../../store/api/menuApi';
import { useUpdateOrderBillMutation } from '../../store/api/orderApi';
import { MenuItem, Order } from '../../types';
import { canEditOrderBill, formatCurrency, formatDateTime } from '../../utils/formatters';
import { DeliverySlotBadge } from '../../components/common/DeliverySlotBadge';
import { useAuth } from '../../hooks';
import { storageService } from '../../services/storage.service';
import { showErrorAlert, showSuccessAlert } from '../../utils/alert';

const VideoTag: any = Platform.OS === 'web' ? 'video' : null;

export const OrderDetailScreen = () => {
  const route = useRoute<any>();
  const routeOrder: Order | undefined = route?.params?.order;
  const [order, setOrder] = useState<Order | undefined>(routeOrder);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [sellerName, setSellerName] = useState('seller');
  const { isAdmin } = useAuth();
  const { data: menuItems, isLoading } = useGetMenuItemsQuery();
  const [updateOrderBill, { isLoading: updatingBill }] = useUpdateOrderBillMutation();

  useEffect(() => {
    setOrder(routeOrder);
  }, [routeOrder]);

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
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Order Details</Text>
        <Text style={styles.muted}>No order provided.</Text>
      </View>
    );
  }

  if (isLoading) {
    return <Loading fullScreen message="Loading order details..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.headerCard}>
        <Text style={styles.title}>Order #{order.id}</Text>
        <Text style={styles.muted}>{formatDateTime(order.orderDate || (order as any).createdAt)}</Text>
        <Text style={styles.sectionLabel}>Customer</Text>
        <Text style={styles.text}>{order.buyerName}</Text>
        {!!order.buyerPhone && <Text style={styles.muted}>{order.buyerPhone}</Text>}
        <Text style={styles.sectionLabel}>Delivery Address</Text>
        <Text style={styles.text}>{order.deliveryAddress || order.buyerAddress || 'Not specified'}</Text>
        <Text style={styles.sectionLabel}>
          {order.finalBillAmount ? 'Final Bill Amount' : 'Total Amount'}
        </Text>
        <Text style={styles.total}>
          {formatCurrency(order.finalBillAmount || order.total || (order as any).totalAmount)}
        </Text>
        <DeliverySlotBadge order={order} />
        {order.finalBillAmount && order.finalBillAmount !== order.total && (
          <Text style={styles.originalAmount}>
            Original: {formatCurrency(order.total)}
          </Text>
        )}
        {order.paymentStatus === 'PARTIALLY_PAID' && order.finalBillAmount != null && order.total > order.finalBillAmount && (
          <Text style={styles.balanceAmount}>
            Balance: {formatCurrency(order.total - order.finalBillAmount)}
          </Text>
        )}
        
        {order.paymentStatus && (
          <View style={[
            styles.paymentStatusBadge,
            order.paymentStatus === 'PAID' && styles.paymentStatusPaid,
            order.paymentStatus === 'UNPAID' && styles.paymentStatusUnpaid,
            order.paymentStatus === 'PARTIALLY_PAID' && styles.paymentStatusPartial,
          ]}>
            <Text style={styles.paymentStatusText}>
              {order.paymentStatus === 'PAID' ? '🟢 PAID' : 
               order.paymentStatus === 'UNPAID' ? '🔴 UNPAID' : 
               '🟡 PARTIALLY PAID'}
            </Text>
          </View>
        )}
        
        {(order.paymentStatus === 'UNPAID' || order.paymentStatus === 'PARTIALLY_PAID') && (
          <View style={styles.paymentPendingContainer}>
            <Text style={styles.paymentPendingText}>
              ⚠️ Payment pending. Please contact seller or support.
            </Text>
          </View>
        )}

        {canEditBill && (
          <Button
            title="Edit Bill"
            onPress={() => setBillModalVisible(true)}
            style={styles.editBillButton}
          />
        )}
        {isAdmin() && order.paymentStatus === 'PAID' && (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedText}>This bill is fully paid and cannot be edited.</Text>
          </View>
        )}
        
        {order.status === 'delivered' && (
          <View style={styles.deliveryStatusContainer}>
            <Text style={styles.deliveryStatusText}>
              ✅ Order Delivered
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
      </Card>

      <Text style={styles.sectionTitle}>Items & Media</Text>

      {(order.items || []).map((it, idx) => {
        const menuItem = it.menuItemId ? menuMap.get(it.menuItemId) : undefined;
        const images = (menuItem?.images || []).map((img: any) => img.imageUrl || img.url).filter(Boolean);
        const videos = (menuItem as any)?.videos || [];

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

            <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Product Videos</Text>
            {videos.length > 0 ? (
              <View style={styles.videoList}>
                {videos.map((v: any, i: number) => {
                  const uri = v.videoUrl || v.url;
                  if (!uri) return null;
                  if (Platform.OS !== 'web' || !VideoTag) {
                    return (
                      <Text key={`${i}`} style={styles.muted} numberOfLines={1}>
                        🎥 {uri}
                      </Text>
                    );
                  }
                  return (
                    <VideoTag
                      key={`${uri}-${i}`}
                      src={uri}
                      controls
                      style={{ width: '100%', maxHeight: 240, borderRadius: 10, marginBottom: 10 }}
                    />
                  );
                })}
              </View>
            ) : (
              <Text style={styles.muted}>No videos</Text>
            )}
          </Card>
        );
      })}

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
  title: {
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
  videoList: {
    marginTop: spacing.sm,
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


