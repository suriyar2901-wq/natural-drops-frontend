import React, { useLayoutEffect, useState } from 'react';
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AutocompleteInput, Button, Card, Input, Loading } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { useCreateShopBuyerMutation, useCreateTodayRegularOrdersMutation, useGetRegularBuyersQuery, useGetRegularOrderPromptQuery, useGetShopBuyersQuery, useGetShopCompanyQuery, useGetShopInboxQuery, useMarkShopInboxReadMutation, useSaveRegularBuyerMutation } from '../../store/api/shopApi';
import { useGetMenuItemsQuery } from '../../store/api/menuApi';
import { formatClockAmPm, formatDateTime } from '../../utils/formatters';
import { locationApiService, PincodeSuggestion } from '../../services/locationApi.service';

type InviteResult = {
  username: string;
  inviteLink: string;
  shareMessage: string;
  whatsappUrl: string;
  smsUrl: string;
  emailSent: boolean;
  sellerEmailSent: boolean;
};

export const ShopBuyersScreen = ({ navigation }: any) => {
  const { data: company } = useGetShopCompanyQuery();
  const { data: buyers = [], isLoading } = useGetShopBuyersQuery();
  const { data: inbox = [] } = useGetShopInboxQuery();
  const [markInboxRead] = useMarkShopInboxReadMutation();
  const [createBuyer, { isLoading: creating }] = useCreateShopBuyerMutation();
  const { data: plans = [] } = useGetRegularBuyersQuery();
  const { data: prompt } = useGetRegularOrderPromptQuery();
  const [savePlan, { isLoading: savingPlan }] = useSaveRegularBuyerMutation();
  const [createToday, { isLoading: creatingOrders }] = useCreateTodayRegularOrdersMutation();
  const [category, setCategory] = useState<'all' | 'regular'>('all');
  const [setupBuyer, setSetupBuyer] = useState<any>(null);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [promptHour, setPromptHour] = useState('7');
  const [promptMinute, setPromptMinute] = useState('00');
  const [promptSuffix, setPromptSuffix] = useState<'AM' | 'PM'>('AM');
  const [deliveryHour, setDeliveryHour] = useState('9');
  const [deliveryMinute, setDeliveryMinute] = useState('00');
  const [deliverySuffix, setDeliverySuffix] = useState<'AM' | 'PM'>('AM');
  const [regularNotes, setRegularNotes] = useState('');
  const { data: products = [] } = useGetMenuItemsQuery(undefined, { skip: !setupBuyer });
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    phone: '',
    email: '',
    houseDoorNo: '',
    streetArea: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
  });
  const [formError, setFormError] = useState('');
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pincodeSuggestions, setPincodeSuggestions] = useState<PincodeSuggestion[]>([]);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');

  useLayoutEffect(() => {
    navigation?.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerCreateButton}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.headerCreatePlus}>+</Text>
          <Text style={styles.headerCreateText}>Create buyer</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const unreadInbox = inbox.filter((item) => !item.isRead);
  const regularIds = new Set(plans.filter((plan) => plan.active).map((plan) => plan.buyerId));
  const visibleBuyers = category === 'regular' ? buyers.filter((buyer) => regularIds.has(buyer.id)) : buyers;

  const openSetup = (buyer: any) => {
    const plan = plans.find((item) => item.buyerId === buyer.id);
    const next: Record<number, string> = {};
    plan?.items.forEach((item) => {
      next[item.menuItemId] = String(item.quantity);
    });
    setQuantities(next);
    const clock = clockFromPrompt(plan?.promptTime);
    setPromptHour(clock.hour);
    setPromptMinute(clock.minute);
    setPromptSuffix(clock.suffix);
    const delivery = clockFromPrompt(plan?.deliveryTime || '09:00');
    setDeliveryHour(delivery.hour);
    setDeliveryMinute(delivery.minute);
    setDeliverySuffix(delivery.suffix);
    setRegularNotes(plan?.notes || '');
    setSetupBuyer(buyer);
  };

  const saveRegular = async (items: Array<{ menuItemId: number; quantity: number }>) => {
    if (!setupBuyer) return;
    const promptTime = toPromptTime(promptHour, promptMinute, promptSuffix);
    const deliveryTime = toPromptTime(deliveryHour, deliveryMinute, deliverySuffix);
    if (items.length > 0 && (!promptTime || !deliveryTime)) {
      Alert.alert('Time', 'Set the message time and the delivery time.');
      return;
    }
    try {
      await savePlan({ buyerId: setupBuyer.id, items, promptTime, deliveryTime, notes: regularNotes.trim() }).unwrap();
      setSetupBuyer(null);
      Alert.alert(items.length ? 'Regular buyer saved' : 'Regular order stopped', items.length
        ? `The create-order message will come at ${formatClockAmPm(promptTime)}.`
        : 'This buyer is no longer a regular buyer.');
    } catch (error: any) {
      Alert.alert('Could not save', error?.data?.message || error?.message || 'Try again');
    }
  };

  const createRegularOrders = async () => {
    try {
      const result = await createToday().unwrap();
      const skipped = result.skipped?.length ? `\nSkipped: ${result.skipped.join(', ')}` : '';
      Alert.alert('Regular orders', `${result.created} order${result.created === 1 ? '' : 's'} created. Seller and buyer notifications are sent.${skipped}`);
    } catch (error: any) {
      Alert.alert('Could not create orders', error?.data?.message || error?.message || 'Try again');
    }
  };
  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyPincodeLocation = (suggestion: PincodeSuggestion) => {
    setForm((prev) => ({
      ...prev,
      pincode: suggestion.pincode,
      city: suggestion.city,
      district: suggestion.district,
      state: suggestion.state,
    }));
    setPincodeError('');
    setPincodeSuggestions([]);
  };

  const handlePincodeChange = async (text: string) => {
    const cleanPincode = text.replace(/[^0-9]/g, '').slice(0, 6);
    setForm((prev) => ({ ...prev, pincode: cleanPincode, city: '', district: '', state: '' }));
    setPincodeError('');
    setPincodeSuggestions([]);
    if (cleanPincode.length !== 6) {
      return;
    }
    setPincodeLoading(true);
    try {
      const suggestions = await locationApiService.getPincodeSuggestions(cleanPincode);
      setPincodeSuggestions(suggestions);
      if (suggestions.length === 1) {
        applyPincodeLocation(suggestions[0]);
      } else if (suggestions.length === 0) {
        setPincodeError('Invalid pincode. Please enter a valid 6-digit pincode.');
      }
    } catch (_error) {
      setPincodeError('Failed to fetch location. Please enter city, district and state.');
    } finally {
      setPincodeLoading(false);
    }
  };

  const openShare = async (url?: string) => {
    if (!url) {
      return;
    }
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        return;
      }
      await Linking.openURL(url);
    } catch (_error) {
      // Keep the invite popup visible if the device cannot open the app.
    }
  };

  const handleCreate = async () => {
    setFormError('');
    const missing: string[] = [];
    if (form.fullName.trim().length < 2) missing.push('Buyer name');
    if (form.username.trim().length < 3) missing.push('Username');
    if (!/^\d{10}$/.test(form.phone.trim())) missing.push('Mobile');
    if (!/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.email.trim())) missing.push('Email');
    if (!form.houseDoorNo.trim()) missing.push('House / door no');
    if (form.streetArea.trim().length < 2) missing.push('Street / area');
    if (!/^\d{6}$/.test(form.pincode.trim())) missing.push('Pincode');
    if (form.city.trim().length < 2) missing.push('City');
    if (form.district.trim().length < 2) missing.push('District');
    if (form.state.trim().length < 2) missing.push('State');
    if (missing.length > 0) {
      setFormError(`Fill every field before creating the buyer: ${missing.join(', ')}.`);
      return;
    }
    try {
      const result = await createBuyer({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        houseDoorNo: form.houseDoorNo.trim(),
        streetArea: form.streetArea.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      }).unwrap();
      setShowCreate(false);
      setInvite(result);
      setForm({
        fullName: '',
        username: '',
        phone: '',
        email: '',
        houseDoorNo: '',
        streetArea: '',
        city: '',
        district: '',
        state: '',
        pincode: '',
      });
      await openShare(result.whatsappUrl);
      await openShare(result.smsUrl);
    } catch (error: any) {
      setFormError(error?.data?.message || error?.message || 'Could not create buyer');
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading buyers..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Buyers</Text>
      <Card style={styles.card}>
        <Text style={styles.label}>Company</Text>
        <Text style={styles.value}>{company?.companyName || '—'}</Text>
        <Text style={styles.label}>Company code</Text>
        <Text style={styles.code}>{company?.companyCode || '—'}</Text>
        <Text style={styles.meta}>Share this code. Buyers who register with it belong only to you.</Text>
      </Card>

      {(prompt?.buyerCount || 0) > 0 && (
        <Card style={styles.promptCard}>
          <Text style={styles.value}>Create today's regular orders?</Text>
          <Text style={styles.meta}>
            {prompt?.buyerNames?.join(', ')}. Tap Yes to create the orders. Seller and buyer both get a notification.
          </Text>
          <Button title={creatingOrders ? 'Creating...' : 'Yes, create orders'} onPress={createRegularOrders} disabled={creatingOrders} />
        </Card>
      )}

      <View style={styles.row}>
        <TouchableOpacity style={[styles.chip, category === 'all' && styles.chipActive]} onPress={() => setCategory('all')}>
          <Text style={[styles.chipText, category === 'all' && styles.chipTextActive]}>All buyers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, category === 'regular' && styles.chipActive]} onPress={() => setCategory('regular')}>
          <Text style={[styles.chipText, category === 'regular' && styles.chipTextActive]}>Regular buyers ({regularIds.size})</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>{category === 'regular' ? 'Regular buyers' : 'Buyers'} ({visibleBuyers.length})</Text>
      {visibleBuyers.length === 0 ? (
        <Card style={styles.card}><Text style={styles.meta}>{category === 'regular' ? 'No regular buyers yet. Open a buyer and set the daily products.' : 'No buyers have joined with your company code yet.'}</Text></Card>
      ) : visibleBuyers.map((buyer) => {
        const plan = plans.find((item) => item.buyerId === buyer.id && item.active);
        return (
        <Card key={buyer.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.value}>{buyer.fullName || buyer.username}</Text>
            {!!plan && <Text style={styles.regularBadge}>Regular</Text>}
          </View>
          <Text style={styles.meta}>{buyer.username} • {buyer.phone || buyer.phoneNumber || 'No mobile'}</Text>
          {!!buyer.email && <Text style={styles.meta}>{buyer.email}</Text>}
          <Text style={styles.meta}>
            {[buyer.houseDoorNo, buyer.streetArea, buyer.city, buyer.pincode].filter(Boolean).join(', ') || 'No address'}
          </Text>
          {!!plan && (
            <Text style={styles.meta}>
              Daily: {plan.items.map((item) => `${item.quantity} x ${item.itemName}`).join(', ')}
              {plan.promptTime ? ` • Ask at ${formatClockAmPm(plan.promptTime)}` : ''}
              {plan.deliveryTime ? ` • Delivery ${formatClockAmPm(plan.deliveryTime)}` : ''}
              {plan.notes ? ` • Note: ${plan.notes}` : ''}
              {plan.orderedToday ? ' • Created today' : ''}
            </Text>
          )}
          <Button title={plan ? 'Edit regular order' : 'Set regular order'} variant="outline" onPress={() => openSetup(buyer)} />
        </Card>
        );
      })}

      {unreadInbox.length > 0 && (
        <>
          <Text style={styles.section}>Join messages</Text>
          {unreadInbox.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => markInboxRead(item.id)}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.value}>{item.title}</Text>
                  <Text style={styles.new}>NEW</Text>
                </View>
                <Text style={styles.meta}>{item.message}</Text>
                <Text style={styles.meta}>{formatDateTime(item.createdAt)}</Text>
                <Text style={styles.new}>Tap to mark as read</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.popupOverlay}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.popupTitle}>Create buyer</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formContent}>
              <Text style={styles.meta}>Company details are filled from your shop. The buyer is mapped to {company?.companyCode || 'your company'}.</Text>
              <Input label="Company name" value={company?.companyName || ''} editable={false} />
              <Input label="Company code" value={company?.companyCode || ''} editable={false} />
              <Input label="Buyer name *" value={form.fullName} onChangeText={(text) => setField('fullName', text)} placeholder="Full name" />
              <Input label="Username *" value={form.username} onChangeText={(text) => setField('username', text)} placeholder="At least 3 letters" autoCapitalize="none" />
              <Input label="Mobile *" value={form.phone} onChangeText={(text) => setField('phone', text.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />
              <Input label="Email *" value={form.email} onChangeText={(text) => setField('email', text)} placeholder="Buyer email" autoCapitalize="none" keyboardType="email-address" />
              <Input label="House / door no *" value={form.houseDoorNo} onChangeText={(text) => setField('houseDoorNo', text)} />
              <Input label="Street / area *" value={form.streetArea} onChangeText={(text) => setField('streetArea', text)} />
              <AutocompleteInput
                label="Pincode *"
                value={form.pincode}
                onChangeText={handlePincodeChange}
                onSelect={(option) => applyPincodeLocation({
                  pincode: option.pincode || option.name,
                  name: option.name,
                  displayName: option.displayName || option.name,
                  city: option.city || '',
                  district: option.district || '',
                  state: option.state || '',
                })}
                placeholder="Enter 6-digit pincode"
                suggestions={pincodeSuggestions}
                isLoading={pincodeLoading}
                error={pincodeError}
                maxLength={6}
                keyboardType="number-pad"
                autoCapitalize="none"
              />
              <Input label="City *" value={form.city} onChangeText={(text) => setField('city', text)} placeholder="Auto from pincode" />
              <Input label="District *" value={form.district} onChangeText={(text) => setField('district', text)} placeholder="Auto from pincode" />
              <Input label="State *" value={form.state} onChangeText={(text) => setField('state', text)} placeholder="Auto from pincode" />
              {!!formError && <Text style={styles.error}>{formError}</Text>}
              <Button title={creating ? 'Creating...' : 'Create buyer'} onPress={handleCreate} disabled={creating} fullWidth />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!setupBuyer} transparent animationType="fade" onRequestClose={() => setSetupBuyer(null)}>
        <View style={styles.popupOverlay}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.popupTitle}>Regular order</Text>
              <TouchableOpacity onPress={() => setSetupBuyer(null)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formContent}>
              <Text style={styles.meta}>
                {setupBuyer?.fullName || setupBuyer?.username}: set the products, quantity, and the time for the daily message.
              </Text>
              <Text style={styles.label}>Message time</Text>
              <View style={styles.productRow}>
                <TextInput
                  value={promptHour}
                  onChangeText={(text) => setPromptHour(text.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="Hour"
                  keyboardType="number-pad"
                  style={styles.qtyInput}
                />
                <Text style={styles.value}>:</Text>
                <TextInput
                  value={promptMinute}
                  onChangeText={(text) => setPromptMinute(text.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="Min"
                  keyboardType="number-pad"
                  style={styles.qtyInput}
                />
                {(['AM', 'PM'] as const).map((suffix) => (
                  <TouchableOpacity
                    key={suffix}
                    style={[styles.chip, promptSuffix === suffix && styles.chipActive]}
                    onPress={() => setPromptSuffix(suffix)}
                  >
                    <Text style={[styles.chipText, promptSuffix === suffix && styles.chipTextActive]}>{suffix}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Delivery time</Text>
              <View style={styles.productRow}>
                <TextInput
                  value={deliveryHour}
                  onChangeText={(text) => setDeliveryHour(text.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="Hour"
                  keyboardType="number-pad"
                  style={styles.qtyInput}
                />
                <Text style={styles.value}>:</Text>
                <TextInput
                  value={deliveryMinute}
                  onChangeText={(text) => setDeliveryMinute(text.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="Min"
                  keyboardType="number-pad"
                  style={styles.qtyInput}
                />
                {(['AM', 'PM'] as const).map((suffix) => (
                  <TouchableOpacity
                    key={suffix}
                    style={[styles.chip, deliverySuffix === suffix && styles.chipActive]}
                    onPress={() => setDeliverySuffix(suffix)}
                  >
                    <Text style={[styles.chipText, deliverySuffix === suffix && styles.chipTextActive]}>{suffix}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                value={regularNotes}
                onChangeText={setRegularNotes}
                placeholder="Note for this regular order"
                multiline
                style={styles.notesInput}
              />
              {products.map((product) => (
                <View key={product.id} style={styles.productRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.value}>{product.name}</Text>
                    <Text style={styles.meta}>₹{Number(product.rate || 0).toFixed(2)}</Text>
                  </View>
                  <TextInput
                    value={quantities[product.id] || ''}
                    onChangeText={(text) => setQuantities((prev) => ({ ...prev, [product.id]: text.replace(/[^0-9]/g, '').slice(0, 3) }))}
                    placeholder="Qty"
                    keyboardType="number-pad"
                    style={styles.qtyInput}
                  />
                </View>
              ))}
              <Button
                title={savingPlan ? 'Saving...' : 'Save regular order'}
                onPress={() => saveRegular(Object.entries(quantities)
                  .map(([id, qty]) => ({ menuItemId: Number(id), quantity: Number(qty) }))
                  .filter((item) => item.quantity > 0))}
                disabled={savingPlan}
                fullWidth
              />
              {regularIds.has(setupBuyer?.id) && (
                <Button title="Stop regular order" variant="outline" onPress={() => saveRegular([])} disabled={savingPlan} fullWidth />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!invite} transparent animationType="fade" onRequestClose={() => setInvite(null)}>
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>Buyer created</Text>
            <Text style={styles.popupMessage}>
              Username: {invite?.username}{'\n'}
              The buyer must open the app link and create a new password before login.
            </Text>
            <Text style={styles.meta}>{invite?.inviteLink}</Text>
            <Text style={styles.meta}>
              {invite?.emailSent ? 'Email sent to the buyer. ' : 'Buyer email was not sent. '}
              {invite?.sellerEmailSent ? 'A copy was emailed to you.' : ''}
            </Text>
            <TouchableOpacity style={styles.shareButton} onPress={() => openShare(invite?.whatsappUrl)}>
              <Text style={styles.shareButtonText}>Send WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={() => openShare(invite?.smsUrl)}>
              <Text style={styles.shareButtonText}>Send SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.popupButton} onPress={() => setInvite(null)}>
              <Text style={styles.popupButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const clockFromPrompt = (value?: string | null) => {
  const match = String(value || '07:00').match(/(\d{1,2}):(\d{2})/);
  const hour24 = match ? Number(match[1]) : 7;
  const minute = match ? match[2] : '00';
  return {
    hour: String(hour24 % 12 || 12),
    minute,
    suffix: (hour24 >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
  };
};

const toPromptTime = (hourText: string, minuteText: string, suffix: 'AM' | 'PM') => {
  const hour12 = Number(hourText);
  const minute = Number(minuteText);
  if (!hour12 || hour12 < 1 || hour12 > 12 || Number.isNaN(minute) || minute < 0 || minute > 59) return '';
  let hour24 = hour12 % 12;
  if (suffix === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  card: { padding: spacing.md, marginBottom: spacing.sm },
  label: { color: colors.textSecondary, marginTop: spacing.xs },
  value: { fontWeight: typography.fontWeight.semibold, color: colors.textPrimary },
  code: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary, marginVertical: spacing.xs },
  meta: { color: colors.textSecondary, marginTop: 4 },
  error: { color: colors.error, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textPrimary },
  chipTextActive: { color: colors.white, fontWeight: typography.fontWeight.semibold },
  regularBadge: { color: colors.primary, fontWeight: typography.fontWeight.bold },
  promptCard: { padding: spacing.md, marginBottom: spacing.md, backgroundColor: '#E8F1FC' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  qtyInput: { width: 64, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, textAlign: 'center', backgroundColor: colors.white },
  notesInput: { minHeight: 64, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, backgroundColor: colors.white, textAlignVertical: 'top', marginBottom: spacing.sm },
  new: { color: colors.warning, fontWeight: typography.fontWeight.bold },
  headerCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginRight: spacing.md,
  },
  headerCreatePlus: {
    color: colors.white,
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    marginRight: 4,
  },
  headerCreateText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    padding: spacing.md,
    overflow: 'visible',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  formContent: {
    paddingBottom: spacing.md,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.bold,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  popupCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    width: '100%',
    maxWidth: 420,
    padding: spacing.lg,
  },
  popupTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  popupMessage: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  shareButton: {
    backgroundColor: colors.gray100,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  shareButtonText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  popupButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  popupButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
});
