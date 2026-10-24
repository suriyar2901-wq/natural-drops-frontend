import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
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
import { useClaimOrderPaymentMutation, useGetMyOrderClaimsQuery } from '../../store/api/paymentApi';
import { useGetBuyerOrdersQuery } from '../../store/api/orderApi';
import { useAuth } from '../../hooks';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { moneyValue, orderBillPending } from '../../types/shop.types';
import { Order } from '../../types';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import {
  buildAndroidGpayIntentUrl,
  buildDiagnosticUpiVariants,
  buildSellerStaticUpiUrl,
  buildUpiPayUrl,
  extractUpiReference,
  formatUpiAmount,
  inspectUpiFieldIntegrity,
  listUpiOpenCandidates,
  logUpiPayUriDebug,
  maskUpiId,
  openUpiPayment,
  parseUpiPayParams,
} from '../../utils/upiPayment';

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
  const { data: claims = [], refetch: refetchClaims } = useGetMyOrderClaimsQuery();
  const [amount, setAmount] = useState('');
  const [upiReference, setUpiReference] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [billTab, setBillTab] = useState<'unpaid' | 'paid'>('unpaid');
  const [generatedQr, setGeneratedQr] = useState('');
  const [openingUpi, setOpeningUpi] = useState(false);
  const [awaitingReturn, setAwaitingReturn] = useState(false);
  const [showUpiDiag, setShowUpiDiag] = useState(false);
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
  const selected = unpaidBills.find((order) => order.id === selectedOrderId) || null;
  const selectedBalance = selected ? orderSplit(selected).balance : 0;
  const waitingSelected = selected ? pendingByOrder.get(selected.id) : undefined;
  const payAmount = Number(amount);

  const sellerStaticUri = upiId ? buildSellerStaticUpiUrl(upiId, payeeName) : '';
  const appPayUri =
    upiId && selected && payAmount > 0
      ? buildUpiPayUrl({
          upiId,
          payeeName,
          amount: payAmount,
          note: `Order ${selected.id}`,
        })
      : '';
  const sellerStaticParsed = sellerStaticUri ? parseUpiPayParams(sellerStaticUri) : null;
  const appPayParsed = appPayUri ? parseUpiPayParams(appPayUri) : null;
  const intentParsed =
    appPayUri && Platform.OS === 'android'
      ? parseUpiPayParams(buildAndroidGpayIntentUrl(appPayUri))
      : null;
  const openCandidates = listUpiOpenCandidates();
  const productionNote = selected ? `Order ${selected.id}` : '';
  const fieldChecks =
    upiId && appPayUri
      ? inspectUpiFieldIntegrity(upiId, payeeName, payAmount, productionNote, appPayUri)
      : null;
  const diagnosticVariants =
    upiId && payAmount > 0
      ? buildDiagnosticUpiVariants({
          upiId,
          payeeName,
          amount: payAmount,
          orderId: selected?.id ?? null,
        })
      : [];
  const dynamicQrMatchesPay =
    !!appPayUri &&
    !!selectedOrderId &&
    payAmount > 0 &&
    appPayUri ===
      buildUpiPayUrl({
        upiId,
        payeeName,
        amount: payAmount,
        note: `Order ${selectedOrderId}`,
      });

  useEffect(() => {
    if (!upiId || !(payAmount > 0) || !selectedOrderId) {
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
      note: `Order ${selectedOrderId}`,
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
  }, [uploadedQr, upiId, payeeName, selectedOrderId, payAmount]);

  useEffect(() => {
    if (!awaitingReturn) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setAwaitingReturn(false);
      showSuccessToast('Enter the UPI transaction / UTR number from GPay, then tap I paid this bill');
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

  const chooseBill = (order: Order) => {
    setSelectedOrderId(order.id);
    setAmount(orderSplit(order).balance.toFixed(2));
    setBillTab('unpaid');
    setUpiReference('');
  };

  const openGpay = async () => {
    if (!selected) {
      showErrorToast('Select the unpaid bill you are paying');
      return;
    }
    if (waitingSelected) {
      showErrorToast('This bill is already waiting for the seller to confirm');
      return;
    }
    if (!upiId) {
      showErrorToast('Seller has not added a UPI ID yet');
      return;
    }
    if (!(payAmount > 0)) {
      showErrorToast('Enter a valid amount');
      return;
    }
    if (payAmount > selectedBalance + 0.001) {
      showErrorToast(`Amount cannot exceed ${formatCurrency(selectedBalance)} for order #${selected.id}`);
      return;
    }
    setOpeningUpi(true);
    try {
      // Same URI shape as QR + GPay open — payment flow unchanged; debug log only.
      const upiUri = buildUpiPayUrl({
        upiId,
        payeeName,
        amount: payAmount,
        note: `Order ${selected.id}`,
      });
      logUpiPayUriDebug(upiUri, 'BuyerPaymentsScreen.openGpay');

      await openUpiPayment({
        upiId,
        payeeName,
        amount: payAmount,
        note: `Order ${selected.id}`,
      });
      setAwaitingReturn(true);
      showSuccessToast('Complete payment in GPay, then come back with the transaction number');
    } catch (error: any) {
      showErrorToast(error?.message || 'Could not open GPay. Scan the QR instead.');
    } finally {
      setOpeningUpi(false);
    }
  };

  const save = async () => {
    const parsed = Number(amount);
    if (!selected) {
      showErrorToast('Select the unpaid bill you are paying');
      return;
    }
    if (waitingSelected) {
      showErrorToast('This bill is already waiting for the seller to confirm');
      return;
    }
    if (!parsed || parsed <= 0) {
      showErrorToast('Enter a valid amount');
      return;
    }
    if (parsed > selectedBalance + 0.001) {
      showErrorToast(`Amount cannot exceed ${formatCurrency(selectedBalance)} for order #${selected.id}`);
      return;
    }
    const reference = upiReference.trim();
    if (reference.length < 6) {
      showErrorToast('Enter the UPI transaction / UTR number from GPay');
      return;
    }
    try {
      await claimPayment({
        amount: parsed.toFixed(2),
        method: 'UPI',
        orderId: selected.id,
        upiReference: reference,
      }).unwrap();
      showSuccessToast(`Payment sent to seller for order #${selected.id}. Waiting for confirmation.`);
      setAmount('');
      setUpiReference('');
      setSelectedOrderId(null);
      setAwaitingReturn(false);
      refetch();
      refetchClaims();
    } catch (error: any) {
      showErrorToast(error?.data?.message || 'Could not submit payment');
    }
  };

  if (isLoading || ordersLoading) {
    return <Loading fullScreen message="Loading payments..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Payments</Text>
      <Card style={styles.card}>
        <Text style={styles.stat}>{formatCurrency(due)}</Text>
        <Text style={styles.meta}>{payeeName} outstanding</Text>
        {!data?.customer && (
          <Text style={styles.meta}>No shop account is linked yet. Ask the seller to add your mobile as a customer.</Text>
        )}

        <Text style={styles.step}>1. Select unpaid bill</Text>
        {unpaidBills.length === 0 ? (
          <Text style={styles.meta}>No unpaid bills.</Text>
        ) : (
          unpaidBills.slice(0, 8).map((order) => {
            const split = orderSplit(order);
            const active = order.id === selectedOrderId;
            const waiting = pendingByOrder.has(order.id);
            return (
              <TouchableOpacity key={order.id} activeOpacity={0.8} onPress={() => chooseBill(order)}>
                <View style={[styles.suggest, active && styles.suggestActive]}>
                  <Text style={[styles.name, active && styles.suggestTextOn]}>
                    Order #{order.id}{waiting ? ' · Waiting' : ''}
                  </Text>
                  <Text style={[styles.meta, active && styles.suggestTextOn]}>
                    Balance {formatCurrency(split.balance)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {selected ? (
          <Text style={styles.selectedBill}>
            Paying order #{selected.id} · {formatCurrency(selectedBalance)}
            {waitingSelected ? ' · Waiting for seller' : ''}
          </Text>
        ) : null}

        <Input
          label="Pay amount"
          value={amount}
          keyboardType="decimal-pad"
          onChangeText={setAmount}
        />

        <Text style={styles.step}>2. Pay with UPI / GPay</Text>
        <Text style={styles.payLabel}>Seller UPI ID</Text>
        <Text selectable style={styles.upiId}>{upiId || 'Seller has not added a UPI ID yet'}</Text>

        {/* Prefer amount-matched dynamic QR (same upi://pay as Open GPay). Static shop QR is fallback only. */}
        {(generatedQr || uploadedQr) ? (
          <Image source={{ uri: generatedQr || uploadedQr }} style={styles.qr} resizeMode="contain" />
        ) : (
          <Text style={styles.meta}>Ask the seller to add a UPI ID or payment QR in Shop Profile.</Text>
        )}

        {selected && upiId && payAmount > 0 ? (
          <Text style={styles.linkHint}>
            Payment link: {formatCurrency(Number(formatUpiAmount(payAmount) || payAmount))} → {maskUpiId(upiId)}
            {' · '}Order {selected.id}
            {generatedQr ? ' · QR matches this link' : ''}
          </Text>
        ) : null}

        <Button
          title={openingUpi ? 'Opening GPay…' : 'Open GPay / UPI'}
          onPress={openGpay}
          disabled={openingUpi || !!waitingSelected || !selected}
          style={styles.gpayButton}
        />
        <Text style={styles.meta}>
          Opens the same upi://pay link as the QR above. Pay in GPay, then copy the UTR and tap I paid this bill.
          The bill stays unpaid until the seller confirms.
        </Text>

        <TouchableOpacity
          style={styles.diagToggle}
          onPress={() => setShowUpiDiag((open) => !open)}
          accessibilityRole="button"
        >
          <Text style={styles.diagToggleText}>
            {showUpiDiag ? 'Hide' : 'Show'} UPI diagnostics (no payment)
          </Text>
        </TouchableOpacity>

        {showUpiDiag ? (
          <View style={styles.diagBox}>
            <Text style={styles.diagTitle}>Compare payment sources</Text>
            <Text style={styles.diagMeta}>
              Platform: {Platform.OS}. Values are decoded and VPA is masked. This panel does not open GPay or change bill status.
            </Text>

            <Text style={styles.diagSection}>A) Seller shop QR (Shop Profile formula)</Text>
            <Text style={styles.diagMono}>
              {sellerStaticParsed
                ? `${sellerStaticParsed.schemeHost}?${sellerStaticParsed.maskedQueryPreview}`
                : 'No seller UPI'}
            </Text>
            {sellerStaticParsed ? (
              <Text style={styles.diagLine}>
                Keys: [{sellerStaticParsed.paramKeys.join(', ')}] · am={sellerStaticParsed.hasAm ? 'yes' : 'NO'} ·
                tr={sellerStaticParsed.hasTr ? 'yes' : 'NO'} · mc={sellerStaticParsed.hasMc ? 'yes' : 'NO'}
              </Text>
            ) : null}
            <Text style={styles.diagHint}>
              Working path users report: scan this style QR or type UPI ID. Amount is entered in GPay (no locked am).
            </Text>

            <Text style={styles.diagSection}>B) App Pay button / dynamic QR (same URI)</Text>
            <Text style={styles.diagMono}>
              {appPayParsed
                ? `${appPayParsed.schemeHost}?${appPayParsed.maskedQueryPreview}`
                : 'Select a bill and amount first'}
            </Text>
            {appPayParsed ? (
              <>
                <Text style={styles.diagLine}>pa (masked): {appPayParsed.paMasked}</Text>
                <Text style={styles.diagLine}>pn: {appPayParsed.pn || '(empty)'}</Text>
                <Text style={styles.diagLine}>am: {appPayParsed.am || '(missing)'}</Text>
                <Text style={styles.diagLine}>cu: {appPayParsed.cu || '(missing)'}</Text>
                <Text style={styles.diagLine}>tn: {appPayParsed.tn || '(missing)'}</Text>
                <Text style={styles.diagLine}>tr: {appPayParsed.hasTr ? appPayParsed.tr : '(not set)'}</Text>
                <Text style={styles.diagLine}>mc: {appPayParsed.hasMc ? appPayParsed.mc : '(not set)'}</Text>
                <Text style={styles.diagLine}>Keys: [{appPayParsed.paramKeys.join(', ')}]</Text>
              </>
            ) : null}

            <Text style={styles.diagSection}>C) Android intent fallback (if used)</Text>
            <Text style={styles.diagMono}>
              {intentParsed
                ? `${intentParsed.schemeHost}?${intentParsed.maskedQueryPreview}`
                : Platform.OS === 'android'
                  ? 'Select bill to preview'
                  : 'Not used on this platform'}
            </Text>
            {intentParsed ? (
              <Text style={styles.diagLine}>
                Query keys same as B: [{intentParsed.paramKeys.join(', ')}] — package forced to GPay
              </Text>
            ) : null}

            <Text style={styles.diagSection}>D) Open order (no tez://)</Text>
            {openCandidates.map((item) => (
              <Text key={item.method} style={styles.diagLine}>
                · {item.method}: {item.usedOn}
              </Text>
            ))}

            <Text style={styles.diagSection}>E) Diff vs working seller QR</Text>
            <Text style={styles.diagLine}>
              App link adds: {[
                appPayParsed?.hasAm ? 'am (locked amount)' : null,
                appPayParsed?.cu ? 'cu' : null,
                appPayParsed?.tn ? 'tn' : null,
              ]
                .filter(Boolean)
                .join(', ') || '(none — select bill)'}
            </Text>
            <Text style={styles.diagLine}>
              Dynamic QR === Pay URI: {dynamicQrMatchesPay ? 'YES' : 'NO / N/A'}
            </Text>
            <Text style={styles.diagLine}>
              tn vs tr: tn = note (&quot;Order N&quot;). tr = reference id (not in production URI).
            </Text>

            <Text style={styles.diagSection}>F) Field integrity (production URI)</Text>
            {fieldChecks ? (
              <>
                <Text style={styles.diagLine}>
                  VPA trimmed={String(fieldChecks.vpaTrimmed)} · looksValid={String(fieldChecks.vpaLooksValid)} ·
                  whitespace={String(fieldChecks.vpaHasWhitespace)}
                </Text>
                <Text style={styles.diagLine}>
                  Name trimmed={String(fieldChecks.nameTrimmed)} · empty={String(fieldChecks.nameEmpty)}
                </Text>
                <Text style={styles.diagLine}>
                  Amount ##.##={String(fieldChecks.amountFormatOk)} · whitespace={String(fieldChecks.amountHasWhitespace)}
                </Text>
                <Text style={styles.diagLine}>
                  Note edge spaces={String(fieldChecks.noteHasLeadingTrailingSpace)} · possibleDoubleEncoding=
                  {String(fieldChecks.possibleDoubleEncoding)}
                </Text>
              </>
            ) : (
              <Text style={styles.diagLine}>Select bill + amount to run checks.</Text>
            )}

            <Text style={styles.diagSection}>G) Diagnostic URI variants (not opened)</Text>
            <Text style={styles.diagHint}>
              Constructed only for comparison. Production Pay still uses variant 3. No mc invented. Manual scan of a
              printed/exported QR is a separate test — this panel does not launch GPay.
            </Text>
            {diagnosticVariants.length === 0 ? (
              <Text style={styles.diagLine}>Select bill + amount to build variants.</Text>
            ) : (
              diagnosticVariants.map((variant) => (
                <View key={variant.id} style={styles.diagVariant}>
                  <Text style={styles.diagVariantTitle}>{variant.title}</Text>
                  <Text style={styles.diagLine}>{variant.description}</Text>
                  <Text style={styles.diagMono}>{variant.maskedPreview}</Text>
                  <Text style={styles.diagLine}>Keys: [{variant.keys.join(', ')}]</Text>
                  <Text style={styles.diagHint}>{variant.note}</Text>
                </View>
              ))
            )}

            <Text style={styles.diagSection}>H) Safest next manual test</Text>
            <Text style={styles.diagHint}>
              1) Confirm F shows no whitespace / double-encoding issues.{'\n'}
              2) Outside the app, ask seller to show static QR — pay ₹1 (works path).{'\n'}
              3) In GPay, scan this screen&apos;s dynamic QR (variant 3) for ₹1 — if it fails like Pay, dynamic am path is confirmed.{'\n'}
              4) Ask seller/PSP whether the VPA is personal or merchant (QR code / business UPI). Do not add mc/tr to production until that is known.
            </Text>
          </View>
        ) : null}

        <Text style={styles.step}>3. Enter transaction number &amp; tell seller</Text>
        <Input
          ref={refInput}
          label="UPI transaction / UTR number"
          value={upiReference}
          onChangeText={(value) => {
            const cleaned = value.replace(/\s/g, '').toUpperCase();
            const extracted = extractUpiReference(cleaned);
            setUpiReference(extracted || cleaned);
          }}
          placeholder="Paste UTR from GPay"
          autoCapitalize="characters"
        />
        <Button
          title={saving ? 'Submitting…' : waitingSelected ? 'Waiting for seller' : 'I paid this bill'}
          onPress={save}
          disabled={saving || !!waitingSelected || !selected}
        />
        <Text style={styles.meta}>
          Seller gets a notification with your amount and UTR. The bill becomes Paid only after the seller confirms.
        </Text>
      </Card>

      <View style={styles.categories}>
        <TouchableOpacity
          style={[styles.category, billTab === 'unpaid' && styles.categoryUnpaid]}
          onPress={() => setBillTab('unpaid')}
        >
          <Text style={[styles.categoryLabel, billTab === 'unpaid' && styles.categoryLabelOn]}>Unpaid</Text>
          <Text style={[styles.categoryValue, billTab === 'unpaid' && styles.categoryLabelOn]}>{formatCurrency(orderDue)}</Text>
          <Text style={[styles.categoryCount, billTab === 'unpaid' && styles.categoryLabelOn]}>
            {unpaidBills.length} bill{unpaidBills.length === 1 ? '' : 's'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.category, billTab === 'paid' && styles.categoryPaid]}
          onPress={() => setBillTab('paid')}
        >
          <Text style={[styles.categoryLabel, billTab === 'paid' && styles.categoryLabelOn]}>Paid</Text>
          <Text style={[styles.categoryValue, billTab === 'paid' && styles.categoryLabelOn]}>{formatCurrency(paidTotal)}</Text>
          <Text style={[styles.categoryCount, billTab === 'paid' && styles.categoryLabelOn]}>
            {paidBills.length} bill{paidBills.length === 1 ? '' : 's'}
          </Text>
        </TouchableOpacity>
      </View>

      {(billTab === 'unpaid' ? unpaidBills : paidBills).map((order) => {
        const split = orderSplit(order);
        const active = order.id === selectedOrderId;
        return (
          <TouchableOpacity
            key={order.id}
            activeOpacity={0.7}
            onPress={() => {
              if (billTab === 'unpaid') chooseBill(order);
              else navigation.navigate('OrderDetail', { order });
            }}
          >
            <Card style={[styles.rowCard, active && styles.rowCardActive]}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>Order #{order.id}</Text>
                <Text style={styles.name}>
                  {billTab === 'paid'
                    ? 'Paid'
                    : pendingByOrder.has(order.id)
                      ? 'Waiting'
                      : split.paid > 0
                        ? 'Partial'
                        : 'Unpaid'}
                </Text>
              </View>
              <Text style={styles.meta}>Bill {formatCurrency(split.total)} · Paid {formatCurrency(split.paid)}</Text>
              {billTab === 'unpaid' && <Text style={styles.balance}>Balance {formatCurrency(split.balance)}</Text>}
            </Card>
          </TouchableOpacity>
        );
      })}

      {(data?.ledger || []).map((event) => (
        <Card key={event.id} style={styles.rowCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.name}>{event.kind}</Text>
            <Text style={styles.name}>{formatCurrency(moneyValue(event.amount))}</Text>
          </View>
          <Text style={styles.meta}>{event.method || '—'} • {formatDateTime(event.occurredAt)}</Text>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
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
  linkHint: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  qr: { width: 180, height: 180, alignSelf: 'center', marginVertical: spacing.md },
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
  diagSection: {
    marginTop: spacing.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    fontSize: typography.fontSize.sm,
  },
  diagMono: {
    marginTop: 4,
    color: colors.textPrimary,
    fontSize: typography.fontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : Platform.OS === 'android' ? 'monospace' : undefined,
  },
  diagLine: { marginTop: 2, color: colors.textPrimary, fontSize: typography.fontSize.xs },
  diagHint: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.fontSize.xs, lineHeight: 16 },
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
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  category: {
    flex: 1,
    minWidth: 140,
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
    justifyContent: 'center',
  },
  categoryUnpaid: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryPaid: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryLabel: { color: colors.textSecondary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg },
  categoryValue: { color: colors.textPrimary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize['2xl'], marginTop: 4 },
  categoryCount: { color: colors.textSecondary, marginTop: 2 },
  categoryLabelOn: { color: colors.white },
  rowCard: { padding: spacing.md, marginBottom: spacing.sm },
  rowCardActive: { borderWidth: 2, borderColor: colors.primary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' },
  name: { flexShrink: 1, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  balance: { marginTop: 2, color: colors.warning, fontWeight: typography.fontWeight.bold },
});
