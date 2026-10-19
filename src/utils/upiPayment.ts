import { Linking, Platform } from 'react-native';

export type UpiPayParams = {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
};

/** Standard UPI intent used by GPay / PhonePe / Paytm / BHIM */
export const buildUpiPayUrl = ({ upiId, payeeName, amount, note }: UpiPayParams): string => {
  const am = amount > 0 ? amount.toFixed(2) : '';
  const parts = [
    `pa=${encodeURIComponent(upiId.trim())}`,
    `pn=${encodeURIComponent(payeeName.trim() || 'Shop')}`,
    am ? `am=${encodeURIComponent(am)}` : '',
    'cu=INR',
    `tn=${encodeURIComponent(note.trim() || 'Bill payment')}`,
  ].filter(Boolean);
  return `upi://pay?${parts.join('&')}`;
};

const gpayIntentUrl = (upiUrl: string) => {
  const query = upiUrl.replace(/^upi:\/\/pay\?/, '');
  return `tez://upi/pay?${query}`;
};

const androidGpayPackageIntent = (upiUrl: string) => {
  const path = upiUrl.replace(/^upi:\/\//, '');
  return `intent://${path}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
};

/**
 * Opens GPay when possible, otherwise the system UPI chooser.
 * Note: UPI apps do not return the UTR to third-party apps after pay —
 * the buyer must enter / paste the transaction number from GPay history.
 */
export const openUpiPayment = async (params: UpiPayParams): Promise<boolean> => {
  const upiId = (params.upiId || '').trim();
  if (!upiId) {
    throw new Error('Seller UPI ID is not set');
  }
  if (!(params.amount > 0)) {
    throw new Error('Enter a valid amount before opening GPay');
  }

  const upiUrl = buildUpiPayUrl(params);
  const candidates =
    Platform.OS === 'android'
      ? [gpayIntentUrl(upiUrl), androidGpayPackageIntent(upiUrl), upiUrl]
      : Platform.OS === 'web'
        ? [upiUrl, gpayIntentUrl(upiUrl)]
        : [upiUrl, gpayIntentUrl(upiUrl)];

  for (const url of candidates) {
    try {
      const can = await Linking.canOpenURL(url).catch(() => Platform.OS === 'web');
      if (!can && Platform.OS !== 'web') {
        continue;
      }
      await Linking.openURL(url);
      return true;
    } catch {
      // try next candidate
    }
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = upiUrl;
    return true;
  }

  throw new Error('Could not open GPay / UPI. Scan the QR instead, or install a UPI app.');
};

/** Pull a likely UPI UTR / transaction id from clipboard text */
export const extractUpiReference = (raw: string): string => {
  const text = (raw || '').trim();
  if (!text) return '';
  const utr = text.match(/\b(?:UTR|Txn|TXN|Ref)[:\s#-]*([A-Z0-9]{8,22})\b/i);
  if (utr?.[1]) return utr[1].toUpperCase();
  const bare = text.match(/\b([A-Z0-9]{10,22})\b/);
  if (bare?.[1] && /[0-9]/.test(bare[1]) && /[A-Z]/i.test(bare[1])) {
    return bare[1].toUpperCase();
  }
  if (/^[A-Z0-9]{8,22}$/i.test(text)) return text.toUpperCase();
  return '';
};
