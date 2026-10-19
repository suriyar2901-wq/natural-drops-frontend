import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Loading } from '../../components/common';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { useGetShopCanEventsQuery, useGetShopCustomerQuery, useGetShopLedgerQuery } from '../../store/api/shopApi';
import { useGetAllOrdersQuery, useGetOrderByIdQuery } from '../../store/api/orderApi';
import { formatCurrency, formatDateTime, formatOrderStatus } from '../../utils/formatters';
import { CAN_ENTRY_LABEL, CanEvent, LedgerEvent, canEventQuantity, canEventType, moneyValue, orderBillPending } from '../../types/shop.types';
import { Order } from '../../types';
import { contactLinks, openContact } from '../../utils/openContact';

const orderIdFromText = (value?: string | null) => {
  const match = String(value || '').match(/(?:ORD-|#)\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
};

const sameCustomer = (order: Order, mobile?: string | null, buyerUserId?: number | null) => {
  const orderPhone = String(order.buyerPhone || '').replace(/\D/g, '').slice(-10);
  const customerPhone = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (orderPhone && customerPhone && orderPhone === customerPhone) return true;
  return !!buyerUserId && order.buyerId === buyerUserId;
};

const partialBill = (order: Order) => {
  const total = Number(order.total) || 0;
  const paid = Math.min(total, Math.max(0, Number(order.finalBillAmount) || 0));
  return { total, paid, pending: orderBillPending(order) };
};

export const ShopCustomerDetailScreen = ({ navigation, route }: any) => {
  const customerId = route?.params?.customerId as number;
  const { data: customer, isLoading } = useGetShopCustomerQuery(customerId, { skip: !customerId });
  const { data: ledger = [] } = useGetShopLedgerQuery(customerId, { skip: !customerId });
  const { data: canEvents = [] } = useGetShopCanEventsQuery(customerId, { skip: !customerId });
  const { data: orders = [] } = useGetAllOrdersQuery();
  const [selected, setSelected] = useState<{ kind: 'ledger' | 'can'; id: number } | null>(null);
  const [activityTab, setActivityTab] = useState<'activity' | 'bills' | 'cans'>('activity');
  const selectedOrderId = selected?.kind === 'ledger'
    ? orderIdFromText(ledger.find((event) => event.id === selected.id)?.reference)
    : selected?.kind === 'can'
      ? orderIdFromText(canEvents.find((event) => event.id === selected.id)?.copy)
      : 0;
  const { data: fetchedOrder, isFetching: loadingBill } = useGetOrderByIdQuery(selectedOrderId, { skip: !selectedOrderId });

  if (isLoading || !customer) {
    return <Loading fullScreen message="Loading customer..." />;
  }

  const toggle = (kind: 'ledger' | 'can', id: number) => {
    setSelected((current) => (current?.kind === kind && current.id === id ? null : { kind, id }));
  };

  const customerOrders = (orders as Order[])
    .filter((order) => order.status !== 'canceled')
    .filter((order) => sameCustomer(order, customer.mobile, customer.buyerUserId));
  const outstanding = customerOrders.length > 0
    ? customerOrders.reduce((sum, order) => sum + orderBillPending(order), 0)
    : moneyValue(customer.money);
  const partialOrders = customerOrders
    .filter((order) => order.paymentStatus === 'PARTIALLY_PAID')
    .sort((left, right) => String(right.orderDate || '').localeCompare(String(left.orderDate || '')));
  const pendingTotal = partialOrders.reduce((sum, order) => sum + partialBill(order).pending, 0);
  const cansOf = (type: string) => canEvents
    .filter((event) => canEventType(event) === type)
    .reduce((sum, event) => sum + canEventQuantity(event), 0);
  const cansReturned = cansOf('RETURNED');
  const damagedEvents = canEvents.filter((event) => canEventType(event) === 'DAMAGED');
  const missingEvents = canEvents.filter((event) => canEventType(event) === 'MISSING');
  const cansDamaged = damagedEvents.reduce((sum, event) => sum + canEventQuantity(event), 0);
  const cansMissing = missingEvents.reduce((sum, event) => sum + canEventQuantity(event), 0);
  const cansGiven = Math.max(
    cansOf('ISSUED'),
    (customer.emptyCans || 0) + cansReturned + cansOf('DAMAGED') + cansOf('MISSING'),
  );
  const linkedOrder = (orderId: number) => (
    fetchedOrder?.id === orderId
      ? fetchedOrder
      : customerOrders.find((order) => order.id === orderId)
  );

  const address = [customer.house, customer.area, customer.city, customer.pin].filter(Boolean).join(', ') || 'No address';
  const links = contactLinks(customer.mobile, null, `Hello ${customer.name}, this is your Natural Drops seller.`);
  const initial = (customer.name || 'C').trim().charAt(0).toUpperCase();
  const toReturn = customer.emptyCans || 0;
  const lastPayment = ledger.find((event) => String(event.kind || '').toUpperCase().includes('PAYMENT') || String(event.kind || '').toUpperCase() === 'CREDIT');

  return (
    <View style={styles.shell}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsHorizontalScrollIndicator={false}>
      <Card style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          <View style={styles.profileInfo}>
            <Text style={styles.title}>{customer.name}</Text>
            <Text style={styles.meta}>+91 {customer.mobile || '—'}</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.addressText}>{address}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('AddShopCustomer', { customerId })}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.outstandingBox}>
          <View>
            <Text style={styles.outstandingLabel}>OUTSTANDING</Text>
            <Text style={styles.outstandingValue}>{formatCurrency(outstanding)}</Text>
          </View>
          <Text style={styles.lastPay}>
            {lastPayment?.occurredAt ? `Last payment ${formatDateTime(lastPayment.occurredAt)}` : customer.customerCode}
          </Text>
        </View>
      </Card>

      <View style={styles.quickRow}>
        {[
          { key: 'call', label: 'Call', icon: 'call-outline' as const, color: colors.primary, url: links.call },
          { key: 'wa', label: 'WhatsApp', icon: 'logo-whatsapp' as const, color: '#16A34A', url: links.whatsapp },
          { key: 'sms', label: 'SMS', icon: 'chatbubble-outline' as const, color: '#EA580C', url: links.sms },
          {
            key: 'map',
            label: 'Directions',
            icon: 'navigate-outline' as const,
            color: '#7C3AED',
            url: address !== 'No address'
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
              : '',
          },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.quickTile}
            disabled={!item.url}
            onPress={() => item.url && openContact(item.url)}
          >
            <Ionicons name={item.icon} size={22} color={item.url ? item.color : colors.gray400} />
            <Text style={styles.quickLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.section}>Can tracker</Text>
        <TouchableOpacity
          style={styles.canEntryBtn}
          onPress={() => navigation.navigate('ShopEmptyCans', { customerId })}
        >
          <Text style={styles.canEntryBtnText}>+ Can entry</Text>
        </TouchableOpacity>
      </View>
      <Card style={styles.trackerCard}>
        <View style={styles.trackerTop}>
          <View style={styles.ring}>
            <Text style={styles.ringValue}>{toReturn}</Text>
            <Text style={styles.ringLabel}>to return</Text>
          </View>
          <View style={styles.trackerGrid}>
            <View style={styles.trackerCell}><Text style={styles.trackerNum}>{cansGiven}</Text><Text style={styles.trackerMeta}>Given</Text></View>
            <View style={styles.trackerCell}><Text style={styles.trackerNum}>{cansReturned}</Text><Text style={styles.trackerMeta}>Returned</Text></View>
            <View style={styles.trackerCell}><Text style={[styles.trackerNum, styles.damagedText]}>{cansDamaged}</Text><Text style={styles.trackerMeta}>Damaged</Text></View>
            <View style={styles.trackerCell}><Text style={[styles.trackerNum, styles.missingText]}>{cansMissing}</Text><Text style={styles.trackerMeta}>Missing</Text></View>
          </View>
        </View>
        <View style={styles.depositRow}>
          <Text style={styles.meta}>Can deposit</Text>
          <Text style={styles.name}>{formatCurrency(moneyValue(customer.canDeposit))}</Text>
        </View>
        {toReturn > 0 && (
          <View style={styles.warnBanner}>
            <Ionicons name="warning-outline" size={16} color="#C2410C" />
            <Text style={styles.warnText}>
              {toReturn} cans are still with {customer.name}. Ask for returns on the next delivery.
            </Text>
          </View>
        )}
      </Card>

      <View style={styles.activityTabs}>
        {([
          { id: 'activity' as const, label: 'Activity' },
          { id: 'bills' as const, label: `Bills (${partialOrders.length || customerOrders.length})` },
          { id: 'cans' as const, label: `Cans (${canEvents.length})` },
        ]).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.activityTab, activityTab === item.id && styles.activityTabOn]}
            onPress={() => setActivityTab(item.id)}
          >
            <Text style={[styles.activityTabText, activityTab === item.id && styles.activityTabTextOn]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {(activityTab === 'activity' || activityTab === 'bills') && (
        <>
      {activityTab === 'bills' && (
        <>
      <Text style={styles.section}>Partial paid bills</Text>
      <Text style={styles.meta}>
        {partialOrders.length === 0
          ? 'No order bill is marked partial paid.'
          : `${partialOrders.length} order${partialOrders.length === 1 ? '' : 's'} · ${formatCurrency(pendingTotal)} still pending`}
      </Text>
      {partialOrders.length === 0 ? (
        <Card style={styles.empty}><Text style={styles.emptyText}>Partial paid bills will show here.</Text></Card>
      ) : partialOrders.map((order) => {
        const bill = partialBill(order);
        return (
          <TouchableOpacity
            key={order.id}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('OrderDetail', { order })}
          >
            <Card style={[styles.row, styles.partialRow]}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>Order #{order.id}</Text>
                <Text style={styles.partialValue}>{formatCurrency(bill.pending)}</Text>
              </View>
              <Text style={styles.partialLabel}>Partial paid · pending amount</Text>
              <Text style={styles.meta}>Order total {formatCurrency(bill.total)} · Paid on bill {formatCurrency(bill.paid)}</Text>
              <Text style={styles.meta}>{order.orderDate ? formatDateTime(order.orderDate) : ''} · Open bill</Text>
            </Card>
          </TouchableOpacity>
        );
      })}
        </>
      )}

      <Text style={styles.section}>{activityTab === 'activity' ? 'Activity' : 'Ledger'}</Text>
      {ledger.length === 0 ? (
        <Card style={styles.empty}><Text style={styles.emptyText}>No ledger entries yet.</Text></Card>
      ) : ledger.map((event) => {
        const open = selected?.kind === 'ledger' && selected.id === event.id;
        const orderId = orderIdFromText(event.reference);
        return (
          <TouchableOpacity key={event.id} activeOpacity={0.7} style={styles.hit} onPress={() => toggle('ledger', event.id)}>
            <Card style={[styles.row, open && styles.selectedRow]}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{event.kind}</Text>
                <Text style={styles.due}>{formatCurrency(moneyValue(event.amount))}</Text>
              </View>
              <Text style={styles.meta}>{event.method || '—'} • {event.reference || 'No ref'}</Text>
              <Text style={styles.meta}>{formatDateTime(event.occurredAt)}</Text>
              {open && <LedgerDetails event={event} order={orderId ? linkedOrder(orderId) : undefined} loading={!!orderId && loadingBill} onOpenBill={(order) => navigation.navigate('OrderDetail', { order })} />}
            </Card>
          </TouchableOpacity>
        );
      })}
        </>
      )}

      {activityTab === 'cans' && (
        <>
      <Text style={styles.section}>Damaged cans</Text>
      <Text style={styles.meta}>{cansDamaged} can{cansDamaged === 1 ? '' : 's'} marked damaged. These are not back in seller stock.</Text>
      {damagedEvents.length === 0 ? (
        <Card style={styles.empty}><Text style={styles.emptyText}>No damaged cans for this customer.</Text></Card>
      ) : damagedEvents.map((event) => (
        <Card key={event.id} style={[styles.row, styles.damagedRow]}>
          <View style={styles.cardTop}>
            <Text style={styles.name}>Damaged can</Text>
            <Text style={styles.damagedValue}>{canEventQuantity(event)} can{canEventQuantity(event) === 1 ? '' : 's'}</Text>
          </View>
          <Text style={styles.meta}>{formatDateTime(event.occurredAt)}</Text>
          {!!event.copy && <Text style={styles.meta}>{event.copy}</Text>}
          {!!event.note && <Text style={styles.meta}>Note: {event.note}</Text>}
          {moneyValue(event.amount) !== 0 && <Text style={styles.meta}>Deposit change {formatCurrency(moneyValue(event.amount))}</Text>}
        </Card>
      ))}

      <Text style={styles.section}>Missing cans</Text>
      <Text style={styles.meta}>{cansMissing} can{cansMissing === 1 ? '' : 's'} marked missing. These are not back in seller stock.</Text>
      {missingEvents.length === 0 ? (
        <Card style={styles.empty}><Text style={styles.emptyText}>No missing cans for this customer.</Text></Card>
      ) : missingEvents.map((event) => (
        <Card key={event.id} style={[styles.row, styles.missingRow]}>
          <View style={styles.cardTop}>
            <Text style={styles.name}>Missing can</Text>
            <Text style={styles.missingValue}>{canEventQuantity(event)} can{canEventQuantity(event) === 1 ? '' : 's'}</Text>
          </View>
          <Text style={styles.meta}>{formatDateTime(event.occurredAt)}</Text>
          {!!event.copy && <Text style={styles.meta}>{event.copy}</Text>}
          {!!event.note && <Text style={styles.meta}>Note: {event.note}</Text>}
          {moneyValue(event.amount) !== 0 && <Text style={styles.meta}>Deposit change {formatCurrency(moneyValue(event.amount))}</Text>}
        </Card>
      ))}

      <Text style={styles.section}>Can history</Text>
      {canEvents.length === 0 ? (
        <Card style={styles.empty}><Text style={styles.emptyText}>No can movements yet.</Text></Card>
      ) : canEvents.map((event) => {
        const open = selected?.kind === 'can' && selected.id === event.id;
        const orderId = orderIdFromText(event.copy);
        const type = canEventType(event);
        const cans = canEventQuantity(event);
        const outward = event.changeAmount > 0;
        const movement = type === 'DEPOSIT'
          ? formatCurrency(moneyValue(event.amount))
          : `${outward ? '+' : event.changeAmount < 0 ? '-' : ''}${cans} can${cans === 1 ? '' : 's'}`;
        return (
          <TouchableOpacity key={event.id} activeOpacity={0.7} style={styles.hit} onPress={() => toggle('can', event.id)}>
            <Card style={[styles.row, open && styles.selectedRow]}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{CAN_ENTRY_LABEL[type] || 'Can'}</Text>
                <Text style={outward ? styles.canOut : styles.canIn}>{movement}</Text>
              </View>
              <Text style={styles.meta}>{orderId ? `Order #${orderId}` : 'No linked order'} · {formatDateTime(event.occurredAt)}</Text>
              {open && <CanDetails event={event} order={orderId ? linkedOrder(orderId) : undefined} loading={!!orderId && loadingBill} onOpenBill={(order) => navigation.navigate('OrderDetail', { order })} />}
            </Card>
          </TouchableOpacity>
        );
      })}
        </>
      )}
    </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addOrderBtn}
          onPress={() => navigation.navigate('PhoneOrder', { customerId })}
        >
          <Text style={styles.addOrderBtnText}>Add order</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.recordPayBtn}
          onPress={() => navigation.navigate('RecordShopPayment', { customerId })}
        >
          <Ionicons name="card-outline" size={18} color={colors.white} />
          <Text style={styles.recordPayBtnText}>Record payment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const detailLine = (label: string, value?: string | number | null) => (
  <View style={styles.detailLine} key={label}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value == null || value === '' ? '—' : String(value)}</Text>
  </View>
);

const OrderBillDetails = ({ order, loading, onOpenBill }: { order?: Order; loading: boolean; onOpenBill: (order: Order) => void }) => {
  if (!order) {
    return <Text style={styles.meta}>{loading ? 'Loading bill...' : 'Linked bill is not available.'}</Text>;
  }
  const total = Number(order.total) || 0;
  const pending = orderBillPending(order);
  const paid = Math.max(0, total - pending);
  return (
    <View style={styles.details}>
      <Text style={styles.detailTitle}>Order #{order.id} bill</Text>
      {detailLine('Status', formatOrderStatus(order.status))}
      {detailLine('Payment', order.paymentStatus === 'PAID' ? 'Paid' : order.paymentStatus === 'PARTIALLY_PAID' ? 'Partial' : 'Unpaid')}
      {detailLine('Customer', order.buyerName)}
      {detailLine('Phone', order.buyerPhone)}
      {detailLine('Address', order.deliveryAddress || order.buyerAddress)}
      {detailLine('Order date', order.orderDate ? formatDateTime(order.orderDate) : null)}
      {detailLine('Bill total', formatCurrency(total))}
      {detailLine('Paid', formatCurrency(paid))}
      {detailLine('Balance', formatCurrency(pending))}
      {(order.items || []).length === 0 ? (
        <Text style={styles.meta}>No line items on this bill.</Text>
      ) : (order.items || []).map((item, index) => (
        <Text key={`${item.id || index}`} style={styles.itemLine}>
          {item.quantity} x {item.itemName} · {formatCurrency(item.subtotal)}
        </Text>
      ))}
      <TouchableOpacity onPress={() => onOpenBill(order)}>
        <Text style={styles.openBill}>Open full bill</Text>
      </TouchableOpacity>
    </View>
  );
};

const LedgerDetails = ({ event, order, loading, onOpenBill }: { event: LedgerEvent; order?: Order; loading: boolean; onOpenBill: (order: Order) => void }) => (
  <View style={styles.details}>
    {detailLine('Type', event.kind)}
    {detailLine('Amount', formatCurrency(moneyValue(event.amount)))}
    {detailLine('Method', event.method)}
    {detailLine('Reference', event.reference)}
    {detailLine('Recorded by', event.createdBy)}
    {detailLine('Date', formatDateTime(event.occurredAt))}
    {orderIdFromText(event.reference) ? <OrderBillDetails order={order} loading={loading} onOpenBill={onOpenBill} /> : null}
  </View>
);

const CanDetails = ({ event, order, loading, onOpenBill }: { event: CanEvent; order?: Order; loading: boolean; onOpenBill: (order: Order) => void }) => (
  <View style={styles.details}>
    {detailLine('Type', CAN_ENTRY_LABEL[canEventType(event)] || event.eventType)}
    {detailLine('Movement', event.copy)}
    {detailLine('Cans', `${event.changeAmount > 0 ? '+' : ''}${event.changeAmount}`)}
    {detailLine('Deposit change', formatCurrency(moneyValue(event.amount)))}
    {detailLine('Note', event.note)}
    {detailLine('Date', formatDateTime(event.occurredAt))}
    {orderIdFromText(event.copy) ? <OrderBillDetails order={order} loading={loading} onOpenBill={onOpenBill} /> : null}
  </View>
);

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, minHeight: 0, minWidth: 0, maxWidth: '100%', backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100, maxWidth: '100%' },
  hit: { alignSelf: 'stretch', maxWidth: '100%', minWidth: 0 },
  profileCard: { padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  profileTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.xl },
  profileInfo: { flex: 1 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
  addressText: { flex: 1, color: colors.textSecondary, fontSize: typography.fontSize.sm },
  outstandingBox: {
    marginTop: spacing.md,
    backgroundColor: colors.errorTint,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  outstandingLabel: { color: colors.error, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold },
  outstandingValue: { marginTop: 2, color: colors.error, fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold },
  lastPay: { color: colors.textSecondary, fontSize: typography.fontSize.xs, maxWidth: 120, textAlign: 'right' },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  quickTile: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 6,
    ...shadows.sm,
  },
  quickLabel: { fontSize: typography.fontSize.xs, color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  canEntryBtn: {
    backgroundColor: colors.blue100,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  canEntryBtnText: { color: colors.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.sm },
  trackerCard: { padding: spacing.md, marginBottom: spacing.md },
  trackerTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  ring: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.primary },
  ringLabel: { fontSize: typography.fontSize.xs, color: colors.textSecondary },
  trackerGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  trackerCell: { width: '50%', marginBottom: spacing.sm },
  trackerNum: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  trackerMeta: { color: colors.textSecondary, fontSize: typography.fontSize.xs },
  depositRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  warnBanner: {
    marginTop: spacing.sm,
    backgroundColor: '#FFF1E0',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  warnText: { flex: 1, color: '#9A3412', fontSize: typography.fontSize.sm },
  activityTabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  activityTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
  },
  activityTabOn: { backgroundColor: colors.blue100 },
  activityTabText: { color: colors.textSecondary, fontWeight: typography.fontWeight.semibold },
  activityTabTextOn: { color: colors.primary },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addOrderBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOrderBtnText: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  recordPayBtn: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  recordPayBtnText: { color: colors.white, fontWeight: typography.fontWeight.bold },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 2, flexShrink: 1 },
  section: { marginTop: spacing.md, marginBottom: spacing.sm, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  row: { marginBottom: spacing.sm, padding: spacing.md, alignSelf: 'stretch', maxWidth: '100%', minWidth: 0 },
  selectedRow: { borderWidth: 1, borderColor: colors.primary },
  details: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, alignSelf: 'stretch', maxWidth: '100%' },
  detailTitle: { marginTop: spacing.sm, marginBottom: spacing.xs, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, marginTop: 4, maxWidth: '100%' },
  detailLabel: { color: colors.textSecondary, flexShrink: 0 },
  detailValue: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold, flex: 1, flexShrink: 1, textAlign: 'right' },
  itemLine: { marginTop: 4, color: colors.textPrimary },
  openBill: { marginTop: spacing.sm, color: colors.primary, fontWeight: typography.fontWeight.semibold },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { flexShrink: 1, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  due: { fontWeight: typography.fontWeight.semibold, color: colors.primary },
  damagedText: { color: colors.warning },
  missingText: { color: colors.error },
  damagedValue: { fontWeight: typography.fontWeight.bold, color: colors.warning, fontSize: typography.fontSize.lg },
  missingValue: { fontWeight: typography.fontWeight.bold, color: colors.error, fontSize: typography.fontSize.lg },
  damagedRow: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  missingRow: { borderLeftWidth: 4, borderLeftColor: colors.error },
  canOut: { fontWeight: typography.fontWeight.bold, color: colors.primary, fontSize: typography.fontSize.lg },
  canIn: { fontWeight: typography.fontWeight.bold, color: colors.success, fontSize: typography.fontSize.lg },
  partialRow: { borderLeftWidth: 4, borderLeftColor: colors.info },
  partialValue: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.info },
  partialLabel: { color: colors.info, fontWeight: typography.fontWeight.semibold, marginTop: 2 },
  empty: { padding: spacing.md },
  emptyText: { color: colors.textSecondary, textAlign: 'center' },
});
