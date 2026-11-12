import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Clipboard,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'qrcode';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useGetBuyerAccountSummaryQuery } from '../../store/api/buyerAccountApi';
import {
  CashfreeOrderStatusResponse,
  useAttachOrderPaymentReferenceMutation,
  useClaimOrderPaymentMutation,
  useCreateCashfreeOrderMutation,
  useGetMyOrderClaimsQuery,
  useLazyGetCashfreeOrderStatusQuery,
} from '../../store/api/paymentApi';
import { useGetBuyerOrdersQuery } from '../../store/api/orderApi';
import { useAuth } from '../../hooks';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { moneyValue, orderBillPending } from '../../types/shop.types';
import { Order } from '../../types';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { openCashfreeCheckout } from '../../utils/cashfreeCheckout';
import {
  clearCashfreeReturnQuery,
  pollCashfreeFast,
  readCashfreeReturnOrderId,
  rememberCashfreeOrder,
} from '../../utils/cashfreeReturn';
import {
  buildUpiPayUrl,
  buildUpiPayUrlVariant,
  extractUpiReference,
  formatUpiAmount,
  logUpiPayUriDebug,
  maskUpiId,
  isWebDesktopWithoutUpi,
  openUpiNoPrefill,
  openUpiPayment,
  openUpiWithGpayIntent,
  parseUpiPayParams,
  UpiVariantId,
} from '../../utils/upiPayment';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const UPI_VARIANTS: { id: UpiVariantId; label: string; hint: string }[] = [
  { id: 'V1', label: 'V1', hint: 'pa, pn, am, cu' },
  { id: 'V2', label: 'V2', hint: 'pa, pn, am, cu, tn' },
  { id: 'V3', label: 'V3', hint: 'pa, pn, cu (no amount)' },
  { id: 'V4', label: 'V4', hint: 'V2 + unique tr' },
];

const orderSplit = (order: Order) => {
  const total = Number(order.total) || 0;
  const billed = order.finalBillAmount == null ? 0 : Number(order.finalBillAmount);
  if (order.paymentStatus === 'PAID') {
    return { total, paid: billed > 0 ? billed : total, balance: 0 };
  }
  if (order.paymentStatus === 'PARTIALLY_PAID') {
    const paid = Math.min(total, Math.max(0, billed));
    return { total, paid, balance: orderBillPending(order) };
  }
  return { total, paid: 0, balance: total };
};

export const BuyerPaymentsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useGetBuyerAccountSummaryQuery();
  const { data: orders = [], isLoading: ordersLoading } = useGetBuyerOrdersQuery(user?.id || 0, { skip: !user?.id });
  const [claimPayment, { isLoading: saving }] = useClaimOrderPaymentMutation();
  const [attachReference, { isLoading: savingUtr }] = useAttachOrderPaymentReferenceMutation();
  const [createCashfreeOrder] = useCreateCashfreeOrderMutation();
  const [fetchCashfreeStatus] = useLazyGetCashfreeOrderStatusQuery();
  const { data: claims = [], refetch: refetchClaims } = useGetMyOrderClaimsQuery();
  const [amount, setAmount] = useState('');
  const [upiReference, setUpiReference] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [unpaidLimit, setUnpaidLimit] = useState(8);
  const [paidLimit, setPaidLimit] = useState(3);
  const [paySheet, setPaySheet] = useState(false);
  const [editAmt, setEditAmt] = useState(false);
  const [payStage, setPayStage] = useState<'pay' | 'sent'>('pay');
  const [sentClaimIds, setSentClaimIds] = useState<number[]>([]);
  const [sentNote, setSentNote] = useState('');
  const [sentAmt, setSentAmt] = useState(0);
  const [utrOpen, setUtrOpen] = useState(false);
  const [utrSaved, setUtrSaved] = useState(false);
  const [billTab, setBillTab] = useState<'unpaid' | 'paid'>('unpaid');
  const [generatedQr, setGeneratedQr] = useState('');
  const [openingCashfree, setOpeningCashfree] = useState(false);
  const [openingUpi, setOpeningUpi] = useState(false);
  const [openingManualGpay, setOpeningManualGpay] = useState(false);
  const [awaitingReturn, setAwaitingReturn] = useState(false);
  const [showUpiFallback, setShowUpiFallback] = useState(false);
  const [showUpiDiag, setShowUpiDiag] = useState(false);
  const [diagVariant, setDiagVariant] = useState<UpiVariantId | null>(null);
  const [diagUrl, setDiagUrl] = useState('');
  const [diagQr, setDiagQr] = useState('');
  const [openingDiag, setOpeningDiag] = useState(false);
  const refInput = useRef<TextInput>(null);
  const uploadedQr = data?.sellerQr && data.sellerQr.startsWith('data:image') ? data.sellerQr : '';
  const upiId = (data?.sellerUpi || '').trim();
  const payeeName = data?.sellerBusiness || data?.companyName || 'Shop';
  const pendingByOrder = new Map(
    claims.filter((claim) => claim.status === 'PENDING' && claim.orderId != null).map((claim) => [claim.orderId!, claim])
  );

  const unpaidBills = (orders as Order[])
    .filter((order) => order.status !== 'canceled')
    .slice()
    .sort((left, right) => right.id - left.id)
    .filter((order) => orderSplit(order).balance > 0);
  const paidBills = (orders as Order[])
    .filter((order) => order.status !== 'canceled')
    .filter((order) => orderSplit(order).balance <= 0)
    .sort((left, right) => right.id - left.id);
  const orderDue = unpaidBills.reduce((sum, order) => sum + orderSplit(order).balance, 0);
  const paidTotal = paidBills.reduce((sum, order) => sum + orderSplit(order).paid, 0);
  const due = unpaidBills.length > 0 || paidBills.length > 0 ? orderDue : moneyValue(data?.due);
  const selectableBills = unpaidBills.filter((order) => !pendingByOrder.has(order.id));
  const selectedOrders = selectableBills.filter((order) => selectedIds.includes(order.id));
  const selected = selectedOrders[0] || null;
  const selectedBalance = selectedOrders.reduce((sum, order) => sum + orderSplit(order).balance, 0);
  const awaitingTotal = unpaidBills.reduce((sum, order) => {
    const claim = pendingByOrder.get(order.id);
    return sum + (claim ? Number(claim.amount) || 0 : 0);
  }, 0);
  const payAmount = Number(amount);
  const amountFormatted = formatUpiAmount(payAmount) || amount.trim();
  const diagParsed = diagUrl ? parseUpiPayParams(diagUrl) : null;
  const allSelected = selectableBills.length > 0 && selectedOrders.length === selectableBills.length;
  const noteLabel = payStage === 'sent'
    ? sentNote
    : selectedOrders.map((order) => `#${order.id}`).join(', ');

  const allocateOldestFirst = () => {
    const oldest = [...selectedOrders].sort((left, right) => left.id - right.id);
    let remaining = Number(payAmount.toFixed(2));
    const parts: { order: Order; amount: number }[] = [];
    oldest.forEach((order) => {
      if (remaining <= 0.001) return;
      const balance = orderSplit(order).balance;
      const slice = Math.min(balance, remaining);
      if (slice > 0.001) {
        const amountPaid = Number(slice.toFixed(2));
        parts.push({ order, amount: amountPaid });
        remaining = Number((remaining - amountPaid).toFixed(2));
      }
    });
    return parts;
  };

  useEffect(() => {
    if (!upiId || !(payAmount > 0) || selectedOrders.length === 0) {
      if (uploadedQr) {
        setGeneratedQr('');
        return undefined;
      }
      setGeneratedQr('');
      return undefined;
    }
    let active = true;
    const payload = buildUpiPayUrl({
      upiId,
      payeeName,
      amount: payAmount,
      note: `Order ${selectedOrders.map((order) => order.id).join(',')}`,
    });
    QRCode.toDataURL(payload, {
      width: 280,
      margin: 1,
      color: { dark: '#0232AA', light: '#FFFFFF' },
    })
      .then((image) => {
        if (active) setGeneratedQr(image);
      })
      .catch(() => {
        if (active) setGeneratedQr('');
      });
    return () => {
      active = false;
    };
  }, [uploadedQr, upiId, payeeName, selectedIds, payAmount]);

  useEffect(() => {
    if (!awaitingReturn) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setAwaitingReturn(false);
      showSuccessToast('Payment app closed. Tap I have paid — the seller confirms it. UTR is optional.');
      setTimeout(() => refInput.current?.focus(), 300);
      tryPasteUtr();
    });
    return () => sub.remove();
  }, [awaitingReturn]);

  const tryPasteUtr = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        const found = extractUpiReference(text);
        if (found) setUpiReference(found);
      } catch {
        // clipboard permission may be denied
      }
    }
  };

  const toggleBill = (order: Order) => {
    if (pendingByOrder.has(order.id)) return;
    setBillTab('unpaid');
    setPayStage('pay');
    setSelectedIds((current) => (
      current.includes(order.id) ? current.filter((id) => id !== order.id) : [...current, order.id]
    ));
  };

  const toggleAllBills = () => {
    setPayStage('pay');
    setSelectedIds(allSelected ? [] : selectableBills.map((order) => order.id));
  };

  const openPaySheet = () => {
    if (selectedOrders.length === 0) {
      showErrorToast('Select the unpaid bills you are paying');
      return;
    }
    setAmount(selectedBalance.toFixed(2));
    setEditAmt(false);
    setPayStage('pay');
    setUpiReference('');
    setUtrOpen(false);
    setUtrSaved(false);
    setSentClaimIds([]);
    setPaySheet(true);
    setShowUpiFallback(false);
  };

  const copyText = async (value: string, label: string) => {
    const text = (value || '').trim();
    if (!text) {
      showErrorToast(`Nothing to copy for ${label}`);
      return;
    }
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        Clipboard.setString(text);
      }
      showSuccessToast(`${label} copied`);
    } catch {
      showErrorToast(`Could not copy ${label}`);
    }
  };

  const selectDiagVariant = async (variant: UpiVariantId) => {
    if (!upiId) {
      showErrorToast('Seller has not added a UPI ID yet');
      return;
    }
    if ((variant === 'V1' || variant === 'V2' || variant === 'V4') && !(payAmount > 0)) {
      showErrorToast('Enter a valid amount for this variant');
      return;
    }
    try {
      const url = buildUpiPayUrlVariant(variant, {
        upiId,
        payeeName,
        amount: payAmount > 0 ? payAmount : undefined,
        orderId: selected?.id,
      });
      setDiagVariant(variant);
      setDiagUrl(url);
      logUpiPayUriDebug(url, `diag.${variant}`);
      const image = await QRCode.toDataURL(url, {
        width: 240,
        margin: 1,
        color: { dark: '#0232AA', light: '#FFFFFF' },
      });
      setDiagQr(image);
    } catch (error: any) {
      setDiagVariant(null);
      setDiagUrl('');
      setDiagQr('');
      showErrorToast(error?.message || 'Could not build UPI URL');
    }
  };

  const openDiagGpay = async () => {
    if (!diagUrl) {
      showErrorToast('Select a variant first');
      return;
    }
    setOpeningDiag(true);
    try {
      await openUpiWithGpayIntent(diagUrl);
      showSuccessToast(`Opened ${diagVariant || 'variant'} in GPay (diagnostics only)`);
    } catch (error: any) {
      showErrorToast(error?.message || 'Could not open GPay');
    } finally {
      setOpeningDiag(false);
    }
  };

  const refreshAfterCashfreePaid = async () => {
    setAmount('');
    setUpiReference('');
    setSelectedIds([]);
    setPaySheet(false);
    setAwaitingReturn(false);
    await Promise.all([refetch(), refetchClaims()]);
  };

  const pollCashfreeUntilSettled = async (cfOrderId: string) =>
    pollCashfreeFast(() => fetchCashfreeStatus(cfOrderId).unwrap(), { maxAttempts: 14, gapMs: 400 });

  // After Cashfree return_url redirect, confirm bill payment immediately.
  useEffect(() => {
    const cfOrderId = readCashfreeReturnOrderId();
    if (!cfOrderId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        showSuccessToast('Confirming payment…');
        const status = await pollCashfreeUntilSettled(cfOrderId);
        if (cancelled) return;
        if (status?.paymentApplied || String(status?.cfOrderStatus || '').toUpperCase() === 'PAID') {
          showSuccessToast('Payment confirmed');
          await refreshAfterCashfreePaid();
        } else {
          await Promise.all([refetch(), refetchClaims()]);
        }
      } catch {
        // leave bills as-is; user can refresh
      } finally {
        clearCashfreeReturnQuery();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payWithCashfree = async () => {
    const parts = allocateOldestFirst();
    if (parts.length !== 1) {
      showErrorToast('Cashfree pays one bill at a time. Select a single bill, or use I have paid for several bills.');
      return;
    }
    if (!(payAmount > 0)) {
      showErrorToast('Enter a valid amount');
      return;
    }
    if (payAmount > selectedBalance + 0.001) {
      showErrorToast(`Amount cannot exceed ${formatCurrency(selectedBalance)} for the selected bills`);
      return;
    }

    const target = parts[0];
    const amountToPay = target.amount;
    setOpeningCashfree(true);
    try {
      const session = await createCashfreeOrder({
        orderId: target.order.id,
        amount: amountToPay.toFixed(2),
      }).unwrap();
      if (!session?.paymentSessionId || !session?.cfOrderId) {
        throw new Error('Server did not return a Cashfree payment session');
      }

      rememberCashfreeOrder(session.cfOrderId);
      const checkout = await openCashfreeCheckout({
        paymentSessionId: session.paymentSessionId,
        cfOrderId: session.cfOrderId,
        environment: session.environment,
      });

      if (checkout.status === 'UNKNOWN' && /redirect/i.test(checkout.message || '')) {
        return;
      }
      if (checkout.status === 'FAILED') {
        showErrorToast(checkout.message || 'Cashfree payment failed');
        return;
      }
      if (checkout.status === 'CANCELLED') {
        showErrorToast(checkout.message || 'Payment cancelled');
        return;
      }

      showSuccessToast('Confirming payment…');
      const status = await pollCashfreeUntilSettled(session.cfOrderId);
      if (status?.paymentApplied || String(status?.cfOrderStatus || '').toUpperCase() === 'PAID') {
        const paidAmt = Number(status?.amount ?? session.amount ?? amountToPay);
        const billBalance = orderSplit(target.order).balance;
        if (paidAmt + 0.001 >= billBalance) {
          showSuccessToast(`Order #${target.order.id} marked paid via Cashfree`);
        } else {
          showSuccessToast(
            `Paid ${formatCurrency(paidAmt)} for order #${target.order.id}. Remaining balance stays unpaid.`
          );
        }
        await refreshAfterCashfreePaid();
        return;
      }

      const local = String(status?.status || '').toUpperCase();
      if (local === 'FAILED' || local === 'EXPIRED' || local === 'USER_DROPPED') {
        showErrorToast('Payment was not completed. You can try Cashfree again or use UPI fallback.');
        return;
      }

      showErrorToast(
        'Payment is still pending. If money was deducted, wait a moment and refresh — the bill updates when Cashfree confirms PAID.'
      );
      await Promise.all([refetch(), refetchClaims()]);
    } catch (error: any) {
      showErrorToast(
        error?.data?.message
          || error?.message
          || 'Could not start Cashfree payment'
      );
    } finally {
      setOpeningCashfree(false);
    }
  };

  const openManualGpay = async () => {
    if (isWebDesktopWithoutUpi()) {
      if (selectedOrders.length === 1) {
        await payWithCashfree();
        return;
      }
      setShowUpiFallback(true);
      showErrorToast('On desktop, use Pay online (Cashfree) or scan the QR with your phone.');
      return;
    }
    if (!upiId) {
      showErrorToast('Seller has not added a UPI ID yet');
      return;
    }
    setOpeningManualGpay(true);
    try {
      await openUpiNoPrefill(upiId, payeeName);
      setAwaitingReturn(true);
      showSuccessToast('Enter amount in GPay, pay, then come back with the UTR');
    } catch (error: any) {
      showErrorToast(error?.message || 'Could not open GPay');
    } finally {
      setOpeningManualGpay(false);
    }
  };

  const openGpay = async () => {
    if (selectedOrders.length === 0) {
      showErrorToast('Select the unpaid bills you are paying');
      return;
    }
    if (!(payAmount > 0)) {
      showErrorToast('Enter a valid amount');
      return;
    }
    if (payAmount > selectedBalance + 0.001) {
      showErrorToast(`The selected bills total ${formatCurrency(selectedBalance)}. Enter that or less.`);
      return;
    }

    // Desktop web has no GPay/UPI app — open Cashfree checkout tab instead of upi://.
    if (isWebDesktopWithoutUpi()) {
      if (selectedOrders.length !== 1) {
        showErrorToast('Select one bill to pay online with Cashfree, or scan the QR with your phone.');
        setShowUpiFallback(true);
        return;
      }
      await payWithCashfree();
      return;
    }

    if (!upiId) {
      showErrorToast('Seller has not added a UPI ID yet');
      return;
    }
    setOpeningUpi(true);
    try {
      const upiUri = buildUpiPayUrl({
        upiId,
        payeeName,
        amount: payAmount,
        note: `Order ${selectedOrders.map((order) => order.id).join(',')}`,
      });
      logUpiPayUriDebug(upiUri, 'BuyerPaymentsScreen.openGpay');

      await openUpiPayment({
        upiId,
        payeeName,
        amount: payAmount,
        note: `Order ${selectedOrders.map((order) => order.id).join(',')}`,
      });
      setAwaitingReturn(true);
      showSuccessToast('Complete payment in GPay, then tap I have paid');
    } catch (error: any) {
      showErrorToast(error?.message || 'Could not open GPay. Scan the QR instead.');
    } finally {
      setOpeningUpi(false);
    }
  };

  const save = async () => {
    const parts = allocateOldestFirst();
    if (parts.length === 0) {
      showErrorToast('Select the unpaid bills you are paying');
      return;
    }
    if (!(payAmount > 0)) {
      showErrorToast('Enter a valid amount');
      return;
    }
    if (payAmount > selectedBalance + 0.001) {
      showErrorToast(`The selected bills total ${formatCurrency(selectedBalance)}. Enter that or less.`);
      return;
    }
    const reference = upiReference.trim();
    if (reference && reference.length < 6) {
      showErrorToast('UTR must be at least 6 characters, or leave it blank');
      return;
    }
    try {
      const created: number[] = [];
      for (const part of parts) {
        const claim = await claimPayment({
          amount: part.amount.toFixed(2),
          method: 'UPI',
          orderId: part.order.id,
          ...(reference ? { upiReference: reference } : {}),
        }).unwrap();
        created.push(claim.id);
      }
      const note = `Order ${parts.map((part) => `#${part.order.id}`).join(', ')}`;
      setSentClaimIds(created);
      setSentNote(note);
      setSentAmt(payAmount);
      setPayStage('sent');
      setSelectedIds([]);
      setUtrSaved(!!reference);
      showSuccessToast(`Seller notified for ${formatCurrency(payAmount)}. Bills stay awaiting until the seller confirms.`);
      refetch();
      refetchClaims();
    } catch (error: any) {
      const apiMessage =
        error?.data?.message
        || error?.error
        || error?.message
        || 'Could not submit payment';
      showErrorToast(apiMessage);
    }
  };

  const saveUtr = async () => {
    const reference = upiReference.trim();
    if (reference.length < 6) {
      showErrorToast('Enter the UPI transaction / UTR number');
      return;
    }
    if (sentClaimIds.length === 0) {
      showErrorToast('Tell the seller you paid before adding a UTR');
      return;
    }
    try {
      for (const id of sentClaimIds) {
        await attachReference({ id, upiReference: reference }).unwrap();
      }
      setUtrSaved(true);
      showSuccessToast('UTR saved for the seller');
      refetchClaims();
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not save UTR');
    }
  };

  if (isLoading || ordersLoading) {
    return <Loading fullScreen message="Loading payments..." />;
  }

  const amountOver = payAmount > selectedBalance + 0.001;
  const showPayBar = billTab === 'unpaid' && selectedOrders.length > 0 && !paySheet;
  const visibleBills = billTab === 'unpaid' ? unpaidBills.slice(0, unpaidLimit) : paidBills.slice(0, paidLimit);

  return (
    <View style={styles.screen}>
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentFlush, showPayBar && styles.contentWithBar]}>
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>Total outstanding</Text>
        <Text style={styles.heroTitle}>{formatCurrency(due)}</Text>
        {awaitingTotal > 0 ? (
          <Text style={styles.heroAwaiting}>{formatCurrency(awaitingTotal)} awaiting seller confirmation</Text>
        ) : null}
      </View>
      {!data?.customer && (
        <Text style={[styles.meta, { paddingHorizontal: spacing.md }]}>No shop account is linked yet. Ask the seller to add your mobile as a customer.</Text>
      )}
      <View style={styles.categories}>
        <TouchableOpacity
          style={[styles.category, billTab === 'unpaid' ? styles.categoryOn : styles.categoryOff]}
          onPress={() => setBillTab('unpaid')}
        >
          <Text style={[styles.categoryLabel, billTab === 'unpaid' && styles.categoryLabelOn]}>Unpaid</Text>
          <Text style={[styles.categoryValue, billTab === 'unpaid' && styles.categoryLabelOn]}>{formatCurrency(orderDue)}</Text>
          <Text style={[styles.categoryCount, billTab === 'unpaid' && styles.categoryLabelOn]}>
            {unpaidBills.length} bill{unpaidBills.length === 1 ? '' : 's'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.category, billTab === 'paid' ? styles.categoryOn : styles.categoryOff]}
          onPress={() => setBillTab('paid')}
        >
          <Text style={[styles.categoryLabel, billTab === 'paid' && styles.categoryLabelOn]}>Paid</Text>
          <Text style={[styles.categoryValue, billTab === 'paid' && styles.categoryLabelOn]}>{formatCurrency(paidTotal)}</Text>
          <Text style={[styles.categoryCount, billTab === 'paid' && styles.categoryLabelOn]}>
            {paidBills.length} bill{paidBills.length === 1 ? '' : 's'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.contentPad}>

        {paySheet ? (
          <View style={styles.sheet}>
            <Text style={styles.sheetKicker}>
              {payStage === 'sent' ? 'Seller notified' : `Paying ${selectedOrders.length === 1 ? '1 bill' : `${selectedOrders.length} bills`}`}
            </Text>
            {payStage === 'pay' ? (
              <>
                {editAmt ? (
                  <Input
                    label="Amount to pay now"
                    value={amount}
                    keyboardType="decimal-pad"
                    onChangeText={setAmount}
                  />
                ) : (
                  <Text style={styles.amountHero}>{payAmount > 0 ? formatCurrency(payAmount) : formatCurrency(0)}</Text>
                )}
                <TouchableOpacity onPress={() => setEditAmt((open) => !open)}>
                  <Text style={styles.link}>{editAmt ? 'Use full selected total' : 'Pay a different amount'}</Text>
                </TouchableOpacity>
                {amountOver ? (
                  <Text style={styles.balance}>
                    The selected bills total {formatCurrency(selectedBalance)}. Enter that or less.
                  </Text>
                ) : (
                  <Text style={styles.meta}>A smaller amount is applied to the oldest selected bills first.</Text>
                )}
                <Text style={styles.payLabel}>Pay to · {payeeName}</Text>
                <View style={styles.copyRow}>
                  <Text selectable style={[styles.upiId, styles.copyValue]}>
                    {upiId || 'Seller has not added a UPI ID yet'}
                  </Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={() => copyText(upiId, 'UPI ID')} disabled={!upiId}>
                    <Text style={styles.copyBtnText}>Copy</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.noteLabel}>Note added automatically</Text>
                <Text style={styles.noteValue}>{noteLabel || '—'}</Text>
                {selectedOrders.length === 1 ? (
                  <TouchableOpacity
                    style={[styles.paidBtn, (openingCashfree || !(payAmount > 0) || amountOver) && styles.btnOff]}
                    onPress={payWithCashfree}
                    disabled={openingCashfree || !(payAmount > 0) || amountOver}
                  >
                    <Text style={styles.paidBtnText}>
                      {openingCashfree
                        ? 'Opening Cashfree…'
                        : `Pay online ${payAmount > 0 ? formatCurrency(payAmount) : ''} (Cashfree)`}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.meta}>
                    Select one bill to pay online with Cashfree. For several bills together, use GPay / UPI below.
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.outlineBtn, (openingUpi || !(payAmount > 0) || amountOver) && styles.btnOff]}
                  onPress={openGpay}
                  disabled={openingUpi || !(payAmount > 0) || amountOver}
                >
                  <Text style={styles.outlineBtnText}>{openingUpi ? 'Opening GPay…' : 'Pay with GPay / UPI'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.outlineBtn, (saving || !(payAmount > 0) || amountOver) && styles.btnOff]}
                  onPress={save}
                  disabled={saving || !(payAmount > 0) || amountOver}
                >
                  <Text style={styles.outlineBtnText}>
                    {saving ? 'Telling seller…' : `I have paid ${payAmount > 0 ? formatCurrency(payAmount) : ''} (manual)`}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.meta}>
                  Online pay confirms automatically. Manual UPI needs the seller to confirm.
                </Text>
                <TouchableOpacity onPress={() => setShowUpiFallback((open) => !open)}>
                  <Text style={styles.link}>{showUpiFallback ? 'Hide QR code' : 'Prefer to scan a QR code?'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPaySheet(false)}>
                  <Text style={styles.linkMuted}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.meta}>
                  We sent {formatCurrency(sentAmt)} for {sentNote}. Your bills show as awaiting until the seller confirms.
                </Text>
                <TouchableOpacity style={styles.diagToggle} onPress={() => setUtrOpen((open) => !open)}>
                  <Text style={styles.diagToggleText}>
                    {utrOpen ? 'Hide' : 'Add'} transaction number (optional)
                  </Text>
                </TouchableOpacity>
                {utrOpen ? (
                  <>
                    <Input
                      ref={refInput}
                      label="UPI transaction / UTR number"
                      value={upiReference}
                      onChangeText={(value) => {
                        const cleaned = value.replace(/\s/g, '').toUpperCase();
                        const extracted = extractUpiReference(cleaned);
                        setUpiReference(extracted || cleaned);
                        setUtrSaved(false);
                      }}
                      placeholder="Optional, helps the seller confirm faster"
                      autoCapitalize="characters"
                    />
                    <Button
                      title={utrSaved ? 'Saved' : savingUtr ? 'Saving…' : 'Save UTR'}
                      onPress={saveUtr}
                      disabled={savingUtr || utrSaved || upiReference.trim().length < 6}
                    />
                  </>
                ) : null}
                <TouchableOpacity onPress={() => setPaySheet(false)}>
                  <Text style={styles.link}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        {showUpiFallback && paySheet && payStage === 'pay' ? (
          <>
        <Text style={styles.step}>Scan QR</Text>
        <Text style={styles.payLabel}>Seller UPI ID</Text>
        <View style={styles.copyRow}>
          <Text selectable style={[styles.upiId, styles.copyValue]}>
            {upiId || 'Seller has not added a UPI ID yet'}
          </Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => copyText(upiId, 'UPI ID')}
            disabled={!upiId}
            accessibilityRole="button"
          >
            <Text style={styles.copyBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.payLabel}>Amount</Text>
        <View style={styles.copyRow}>
          <Text selectable style={[styles.upiId, styles.copyValue]}>
            {amountFormatted || '—'}
          </Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => copyText(amountFormatted, 'Amount')}
            disabled={!amountFormatted}
            accessibilityRole="button"
          >
            <Text style={styles.copyBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>

        {generatedQr ? (
          <Image source={{ uri: generatedQr }} style={styles.qr} resizeMode="contain" />
        ) : !uploadedQr ? (
          <Text style={styles.meta}>Ask the seller to add a UPI ID or payment QR in Shop Profile.</Text>
        ) : null}

        {selected && upiId && payAmount > 0 ? (
          <Text style={styles.linkHint}>
            Prefill link: {formatCurrency(Number(formatUpiAmount(payAmount) || payAmount))} → {maskUpiId(upiId)}
            {' · '}Order{selected.id}
            {generatedQr ? ' · QR matches this link' : ''}
          </Text>
        ) : null}

        <Button
          title={openingUpi ? 'Opening GPay…' : 'Open GPay / UPI'}
          onPress={openGpay}
          disabled={openingUpi || selectedOrders.length === 0}
          style={styles.gpayButton}
        />
        <Text style={styles.meta}>
          Prefills amount when possible. If GPay shows risky / bank limit, use the manual fallback below.
        </Text>

        <Text style={styles.step}>Manual fallback (no amount prefill)</Text>
        <Text style={styles.meta}>
          Copy UPI ID + amount above, scan the seller QR, or open GPay empty and pay the same UPI ID.
        </Text>
        {uploadedQr ? (
          <Image source={{ uri: uploadedQr }} style={styles.qr} resizeMode="contain" />
        ) : null}
        <Button
          title={openingManualGpay ? 'Opening GPay…' : 'Open GPay (no prefill)'}
          onPress={openManualGpay}
          disabled={openingManualGpay || !upiId}
          style={styles.gpayButton}
        />

        <TouchableOpacity
          style={styles.diagToggle}
          onPress={() => setShowUpiDiag((open) => !open)}
          accessibilityRole="button"
        >
          <Text style={styles.diagToggleText}>
            {showUpiDiag ? 'Hide' : 'Show'} UPI diagnostics
          </Text>
        </TouchableOpacity>

        {showUpiDiag ? (
          <View style={styles.diagBox}>
            <Text style={styles.diagTitle}>URI variants (A/B test)</Text>
            <Text style={styles.diagMeta}>
              Platform: {Platform.OS}. Each button builds a URL, shows a QR, and can open GPay via
              intent://…package=com.google.android.apps.nbu.paisa.user with upi:// fallback.
              Does not submit a payment claim.
            </Text>

            <View style={styles.variantRow}>
              {UPI_VARIANTS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.variantBtn, diagVariant === item.id && styles.variantBtnOn]}
                  onPress={() => selectDiagVariant(item.id)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.variantBtnText, diagVariant === item.id && styles.variantBtnTextOn]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.variantHint, diagVariant === item.id && styles.variantBtnTextOn]}>
                    {item.hint}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {diagUrl ? (
              <View style={styles.diagVariant}>
                <Text style={styles.diagVariantTitle}>Selected: {diagVariant}</Text>
                <Text style={styles.diagMono} selectable>
                  {diagParsed
                    ? `${diagParsed.schemeHost}?${diagParsed.maskedQueryPreview}`
                    : diagUrl}
                </Text>
                <Text style={styles.diagLine}>Keys: [{diagParsed?.paramKeys.join(', ') || '—'}]</Text>
                <Text style={styles.diagHint} selectable>
                  Full URL: {diagUrl}
                </Text>
                {diagQr ? (
                  <Image source={{ uri: diagQr }} style={styles.diagQr} resizeMode="contain" />
                ) : null}
                <Button
                  title={openingDiag ? 'Opening GPay…' : `Open GPay (${diagVariant})`}
                  onPress={openDiagGpay}
                  disabled={openingDiag}
                  style={styles.gpayButton}
                />
              </View>
            ) : (
              <Text style={styles.diagLine}>Tap V1–V4 to generate URL + QR. V1/V2/V4 need an amount.</Text>
            )}
          </View>
        ) : null}
          </>
        ) : null}

      <View style={styles.listHead}>
        <Text style={styles.listTitle}>{billTab === 'unpaid' ? 'Select bills to pay' : 'Paid bills'}</Text>
        {billTab === 'unpaid' && selectableBills.length > 0 ? (
          <TouchableOpacity onPress={toggleAllBills}>
            <Text style={styles.link}>{allSelected ? 'Clear' : 'Select all'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {visibleBills.map((order) => {
        const split = orderSplit(order);
        const waiting = pendingByOrder.get(order.id);
        const active = selectedIds.includes(order.id);
        const chip = billTab === 'paid'
          ? 'Paid in full'
          : waiting
            ? `${formatCurrency(Number(waiting.amount) || 0)} awaiting`
            : split.paid > 0
              ? 'Partial'
              : 'Unpaid';
        return (
          <TouchableOpacity
            key={order.id}
            activeOpacity={0.7}
            onPress={() => {
              if (billTab === 'unpaid') toggleBill(order);
              else navigation.navigate('OrderDetail', { order });
            }}
          >
            <View style={[styles.billRow, active && styles.billRowOn]}>
              {billTab === 'unpaid' && !waiting ? (
                <View style={[styles.check, active && styles.checkOn]}>
                  {active ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
              ) : (
                <View style={styles.checkSpacer} />
              )}
              <View style={styles.billBody}>
                <Text style={styles.name}>Order #{order.id}</Text>
                <Text style={styles.meta}>Bill {formatCurrency(split.total)} · Paid {formatCurrency(split.paid)}</Text>
                {billTab === 'unpaid' ? <Text style={styles.balance}>Balance {formatCurrency(split.balance)}</Text> : null}
              </View>
              <Text style={[
                styles.chip,
                billTab === 'paid' ? styles.chipPaid : waiting ? styles.chipWait : styles.chipUnpaid,
              ]}>
                {chip}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {billTab === 'unpaid' && unpaidBills.length > unpaidLimit ? (
        <TouchableOpacity onPress={() => setUnpaidLimit((count) => count + 8)}>
          <Text style={styles.link}>Showing {unpaidLimit} of {unpaidBills.length} unpaid bills · Load more</Text>
        </TouchableOpacity>
      ) : null}
      {billTab === 'paid' && paidBills.length > paidLimit ? (
        <TouchableOpacity onPress={() => setPaidLimit((count) => count + 6)}>
          <Text style={styles.link}>Showing {paidLimit} of {paidBills.length} paid bills · Load more</Text>
        </TouchableOpacity>
      ) : null}
      </View>
    </ScrollView>
    {showPayBar ? (
      <View style={styles.payBar}>
        <View>
          <Text style={styles.payBarCount}>{selectedOrders.length === 1 ? '1 bill' : `${selectedOrders.length} bills`}</Text>
          <Text style={styles.payBarTotal}>{formatCurrency(selectedBalance)}</Text>
        </View>
        <TouchableOpacity style={styles.payNow} onPress={openPaySheet}>
          <Text style={styles.payNowText}>Pay now</Text>
        </TouchableOpacity>
      </View>
    ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  contentFlush: { paddingBottom: spacing.xl },
  contentPad: { paddingHorizontal: spacing.md },
  contentWithBar: { paddingBottom: 110 },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  heroKicker: { color: 'rgba(255,255,255,0.85)', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  heroTitle: { fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.white, marginTop: 4 },
  heroAwaiting: { color: '#FFF1D6', fontWeight: typography.fontWeight.semibold, marginTop: 6 },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sheetKicker: { color: colors.textSecondary, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.xs },
  amountHero: { fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  link: { color: colors.primary, fontWeight: typography.fontWeight.semibold, marginTop: spacing.sm, marginBottom: spacing.sm },
  linkMuted: { color: colors.textSecondary, fontWeight: typography.fontWeight.semibold, marginTop: spacing.sm, textAlign: 'center' },
  noteLabel: { color: colors.textSecondary, fontSize: typography.fontSize.xs, marginTop: spacing.sm },
  noteValue: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold, marginBottom: spacing.sm },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.white,
  },
  outlineBtnText: { color: colors.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base },
  paidBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  paidBtnText: { color: colors.white, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base },
  btnOff: { opacity: 0.45 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  listTitle: { fontWeight: typography.fontWeight.bold, color: colors.textPrimary, fontSize: typography.fontSize.base },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  billRowOn: { borderColor: colors.primary, borderWidth: 2 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary },
  checkMark: { color: colors.white, fontSize: 14, fontWeight: typography.fontWeight.bold },
  checkSpacer: { width: 22 },
  billBody: { flex: 1 },
  chip: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  chipUnpaid: { color: colors.error, backgroundColor: colors.errorTint },
  chipWait: { color: colors.warning, backgroundColor: colors.warningTint },
  chipPaid: { color: colors.success, backgroundColor: colors.successTint },
  payBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payBarCount: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
  payBarTotal: { color: colors.textPrimary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg },
  payNow: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  payNowText: { color: colors.white, fontWeight: typography.fontWeight.bold },
  card: { padding: spacing.md, marginBottom: spacing.md },
  stat: { fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
  meta: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.sm },
  step: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.base,
  },
  payLabel: { marginTop: spacing.sm, color: colors.textSecondary, fontWeight: typography.fontWeight.semibold },
  upiId: { color: colors.primary, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginTop: 4 },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  copyValue: { flex: 1, flexShrink: 1 },
  copyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  copyBtnText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
  linkHint: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  qr: { width: 180, height: 180, alignSelf: 'center', marginVertical: spacing.md },
  diagQr: { width: 160, height: 160, alignSelf: 'center', marginVertical: spacing.sm },
  gpayButton: { marginTop: spacing.sm, marginBottom: spacing.sm },
  diagToggle: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  diagToggleText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
    textDecorationLine: 'underline',
  },
  diagBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.gray100,
  },
  diagTitle: {
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  diagMeta: { color: colors.textSecondary, fontSize: typography.fontSize.xs, marginBottom: spacing.sm },
  diagMono: {
    marginTop: 4,
    color: colors.textPrimary,
    fontSize: typography.fontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : Platform.OS === 'android' ? 'monospace' : undefined,
  },
  diagLine: { marginTop: 2, color: colors.textPrimary, fontSize: typography.fontSize.xs },
  diagHint: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.fontSize.xs, lineHeight: 16 },
  variantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  variantBtn: {
    flexGrow: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    backgroundColor: colors.white,
  },
  variantBtnOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  variantBtnText: {
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
  },
  variantBtnTextOn: { color: colors.white },
  variantHint: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
  diagVariant: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  diagVariantTitle: {
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
  },
  selectedBill: { color: colors.primary, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm },
  suggest: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.white,
  },
  suggestActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  suggestTextOn: { color: colors.white },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: -spacing.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  category: {
    flex: 1,
    minWidth: 140,
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    justifyContent: 'center',
  },
  categoryOn: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  categoryOff: { backgroundColor: colors.white, borderColor: colors.border },
  categoryLabel: { color: colors.textSecondary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base },
  categoryValue: { color: colors.textPrimary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize['2xl'], marginTop: 4 },
  categoryCount: { color: colors.textSecondary, marginTop: 2 },
  categoryLabelOn: { color: colors.white },
  rowCard: { padding: spacing.md, marginBottom: spacing.sm },
  rowCardActive: { borderWidth: 2, borderColor: colors.primary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' },
  name: { flexShrink: 1, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  balance: { marginTop: 2, color: colors.warning, fontWeight: typography.fontWeight.bold },
});
