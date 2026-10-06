import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Loading, StatusPill } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetShopCanEventsQuery, useGetShopCustomerQuery, useGetShopLedgerQuery } from '../../store/api/shopApi';
import { useGetAllOrdersQuery, useGetOrderByIdQuery } from '../../store/api/orderApi';
import { formatCurrency, formatDateTime, formatOrderStatus } from '../../utils/formatters';
import { CanEvent, LedgerEvent, moneyValue, orderBillPending } from '../../types/shop.types';
import { Order } from '../../types';

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
  const linkedOrder = (orderId: number) => (
    fetchedOrder?.id === orderId
      ? fetchedOrder
      : customerOrders.find((order) => order.id === orderId)
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsHorizontalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{customer.name}</Text>
        <StatusPill label={customer.customerCode} />
      </View>
      <Text style={styles.meta}>{customer.mobile}</Text>
      <Text style={styles.meta}>
        {[customer.house, customer.area, customer.city, customer.pin].filter(Boolean).join(', ') || 'No address'}
      </Text>

      <View style={styles.chips}>
        <Card style={styles.stat}><Text style={styles.statValue}>{formatCurrency(outstanding)}</Text><Text style={styles.statLabel}>Outstanding</Text></Card>
        <Card style={styles.stat}><Text style={styles.statValue}>{Math.max(canEvents.filter((event) => event.changeAmount > 0).reduce((sum, event) => sum + event.changeAmount, 0), (customer.emptyCans || 0) + canEvents.filter((event) => event.changeAmount < 0).reduce((sum, event) => sum + Math.abs(event.changeAmount), 0))}</Text><Text style={styles.statLabel}>Cans given</Text></Card>
        <Card style={styles.stat}><Text style={styles.statValue}>{canEvents.filter((event) => event.changeAmount < 0).reduce((sum, event) => sum + Math.abs(event.changeAmount), 0)}</Text><Text style={styles.statLabel}>Returned</Text></Card>
        <Card style={styles.stat}><Text style={styles.statValue}>{customer.emptyCans || 0}</Text><Text style={styles.statLabel}>To return</Text></Card>
      </View>

      <View style={styles.actions}>
        <Button title="Record Payment" onPress={() => navigation.navigate('RecordShopPayment', { customerId })} />
        <Button title="Record can return" variant="outline" onPress={() => navigation.navigate('ShopEmptyCans', { customerId })} />
      </View>
      <View style={styles.actions}>
        <Button title="Add Order" variant="outline" onPress={() => navigation.navigate('PhoneOrder', { customerId })} />
        <Button title="Edit" variant="outline" onPress={() => navigation.navigate('AddShopCustomer', { customerId })} />
      </View>

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

      <Text style={styles.section}>Ledger</Text>
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

      <Text style={styles.section}>Can history</Text>
      {canEvents.length === 0 ? (
        <Card style={styles.empty}><Text style={styles.emptyText}>No can movements yet.</Text></Card>
      ) : canEvents.map((event) => {
        const open = selected?.kind === 'can' && selected.id === event.id;
        const orderId = orderIdFromText(event.copy);
        const issued = event.changeAmount > 0;
        const cans = Math.abs(event.changeAmount);
        return (
          <TouchableOpacity key={event.id} activeOpacity={0.7} style={styles.hit} onPress={() => toggle('can', event.id)}>
            <Card style={[styles.row, open && styles.selectedRow]}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{issued ? 'Issued' : 'Returned'}</Text>
                <Text style={issued ? styles.canOut : styles.canIn}>{issued ? '+' : '-'}{cans} can{cans === 1 ? '' : 's'}</Text>
              </View>
              <Text style={styles.meta}>{orderId ? `Order #${orderId}` : 'No linked order'} · {formatDateTime(event.occurredAt)}</Text>
              {open && <CanDetails event={event} order={orderId ? linkedOrder(orderId) : undefined} loading={!!orderId && loadingBill} onOpenBill={(order) => navigation.navigate('OrderDetail', { order })} />}
            </Card>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
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
    {detailLine('Movement', event.copy)}
    {detailLine('Cans', `${event.changeAmount > 0 ? '+' : ''}${event.changeAmount}`)}
    {detailLine('Date', formatDateTime(event.occurredAt))}
    {orderIdFromText(event.copy) ? <OrderBillDetails order={order} loading={loading} onOpenBill={onOpenBill} /> : null}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, minWidth: 0, maxWidth: '100%', backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl, maxWidth: '100%' },
  hit: { alignSelf: 'stretch', maxWidth: '100%', minWidth: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 2, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md, maxWidth: '100%' },
  stat: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minWidth: 140, maxWidth: '100%', padding: spacing.md },
  statValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  statLabel: { color: colors.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
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
  canOut: { fontWeight: typography.fontWeight.bold, color: colors.primary, fontSize: typography.fontSize.lg },
  canIn: { fontWeight: typography.fontWeight.bold, color: colors.success, fontSize: typography.fontSize.lg },
  partialRow: { borderLeftWidth: 4, borderLeftColor: colors.info },
  partialValue: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.info },
  partialLabel: { color: colors.info, fontWeight: typography.fontWeight.semibold, marginTop: 2 },
  empty: { padding: spacing.md },
  emptyText: { color: colors.textSecondary, textAlign: 'center' },
});
