import { Linking, Platform } from 'react-native';

export type UpiPayParams = {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
};

export type UpiVariantId = 'V1' | 'V2' | 'V3' | 'V4';

export type UpiVariantOpts = {
  upiId: string;
  payeeName: string;
  /** Required for V1, V2, V4 */
  amount?: number;
  /** Used for V2/V4 note; spaces stripped (e.g. Order50) */
  orderId?: number | string | null;
  /** Optional unique ref for V4; generated if omitted */
  transactionRef?: string;
};

/** Mask VPA for logs / on-screen hints — never log PIN or banking secrets. */
export const maskUpiId = (upiId: string): string => {
  const raw = (upiId || '').trim();
  const at = raw.indexOf('@');
  if (at <= 0) {
    if (raw.length <= 4) return '***';
    return `${raw.slice(0, 2)}***${raw.slice(-2)}`;
  }
  const local = raw.slice(0, at);
  const host = raw.slice(at + 1);
  const localMask =
    local.length <= 2 ? '**' : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${localMask}@${host}`;
};

/** Strict INR amount for UPI `am` — always two decimal places. */
export const formatUpiAmount = (amount: number): string => {
  const n = Number(amount);
  if (!(n > 0) || !Number.isFinite(n)) return '';
  return n.toFixed(2);
};

/** Strip spaces / punctuation gaps from tn (e.g. "Order 50" → "Order50"). */
export const sanitizeUpiNote = (note: string): string =>
  (note || '').replace(/\s+/g, '').trim() || 'Billpayment';

const enc = (value: string) => encodeURIComponent(value);

/**
 * Production / default UPI collect link.
 * Every value is encodeURIComponent'd; amount uses toFixed(2); tn has no spaces.
 */
export const buildUpiPayUrl = ({ upiId, payeeName, amount, note }: UpiPayParams): string => {
  const pa = (upiId || '').trim();
  const pn = (payeeName || 'Shop').trim() || 'Shop';
  const am = formatUpiAmount(amount);
  const tn = sanitizeUpiNote(note || 'Billpayment');
  const parts = [
    `pa=${enc(pa)}`,
    `pn=${enc(pn)}`,
    am ? `am=${enc(am)}` : '',
    `cu=${enc('INR')}`,
    `tn=${enc(tn)}`,
  ].filter(Boolean);
  return `upi://pay?${parts.join('&')}`;
};

/**
 * Diagnostic / A-B test URI builders.
 * V1: pa, pn, am, cu
 * V2: pa, pn, am, cu, tn (no spaces)
 * V3: pa, pn, cu (no amount — closest to working manual/static path)
 * V4: V2 + unique tr
 */
export const buildUpiPayUrlVariant = (
  variant: UpiVariantId,
  opts: UpiVariantOpts
): string => {
  const pa = (opts.upiId || '').trim();
  const pn = (opts.payeeName || 'Shop').trim() || 'Shop';
  if (!pa) {
    throw new Error('Seller UPI ID is not set');
  }

  const am = opts.amount != null ? formatUpiAmount(opts.amount) : '';
  const tn = sanitizeUpiNote(
    opts.orderId != null && String(opts.orderId).length > 0
      ? `Order${opts.orderId}`
      : 'Order'
  );
  const tr = (opts.transactionRef || `ND${Date.now()}`).replace(/\s+/g, '');

  if ((variant === 'V1' || variant === 'V2' || variant === 'V4') && !am) {
    throw new Error('Enter a valid amount for this variant');
  }

  const parts: string[] = [`pa=${enc(pa)}`, `pn=${enc(pn)}`];

  if (variant === 'V1') {
    parts.push(`am=${enc(am)}`, `cu=${enc('INR')}`);
  } else if (variant === 'V2') {
    parts.push(`am=${enc(am)}`, `cu=${enc('INR')}`, `tn=${enc(tn)}`);
  } else if (variant === 'V3') {
    parts.push(`cu=${enc('INR')}`);
  } else if (variant === 'V4') {
    parts.push(`am=${enc(am)}`, `cu=${enc('INR')}`, `tn=${enc(tn)}`, `tr=${enc(tr)}`);
  }

  return `upi://pay?${parts.join('&')}`;
};

/** Android GPay package intent from a upi://pay URL (query only — no nested upi://). */
export const buildAndroidGpayIntentUrl = (upiUrl: string): string => {
  const query = upiUrl.replace(/^upi:\/\/pay\?/, '');
  return `intent://pay?${query}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
};

/** Open GPay via intent:// first, then plain upi:// fallback. */
export const openUpiWithGpayIntent = async (upiUrl: string): Promise<boolean> => {
  const plain = (upiUrl || '').trim();
  if (!plain.startsWith('upi://pay?')) {
    throw new Error('Invalid UPI URL');
  }
  const intentUrl = buildAndroidGpayIntentUrl(plain);
  const candidates =
    Platform.OS === 'android' ? [intentUrl, plain] : [plain, intentUrl];

  for (const url of candidates) {
    try {
      const can = await Linking.canOpenURL(url).catch(() => Platform.OS === 'web');
      if (!can && Platform.OS !== 'web') continue;
      await Linking.openURL(url);
      return true;
    } catch {
      // try next
    }
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    window.location.href = plain;
    return true;
  }

  throw new Error('Could not open GPay / UPI');
};

/**
 * Open GPay with no amount/note prefill (manual entry in GPay).
 * Same shape as a working static seller QR: pa + pn + cu only.
 */
export const openUpiNoPrefill = async (upiId: string, payeeName: string): Promise<boolean> => {
  const url = buildUpiPayUrlVariant('V3', { upiId, payeeName });
  return openUpiWithGpayIntent(url);
};

export const logUpiPayUriDebug = (upiUrl: string, source: string) => {
  try {
    let search = '';
    if (upiUrl.includes('upi://pay?')) {
      search = upiUrl.split('upi://pay?')[1] || '';
    } else if (upiUrl.includes('intent://pay?')) {
      search = upiUrl.split('intent://pay?')[1]?.split('#')[0] || '';
    } else if (upiUrl.includes('?')) {
      search = upiUrl.slice(upiUrl.indexOf('?') + 1).split('#')[0];
    }
    const map = new URLSearchParams(search);
    const decode = (value: string | null) => {
      if (value == null) return '';
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };
    console.log(`[UPI debug:${source}]`, {
      paMasked: maskUpiId(decode(map.get('pa'))),
      pn: decode(map.get('pn')),
      am: map.get('am') || '',
      cu: map.get('cu') || '',
      tn: decode(map.get('tn')),
      tr: map.get('tr') ? '(set)' : '(not set)',
    });
  } catch (error) {
    console.log(`[UPI debug:${source}] parse failed`, error);
  }
};

export type ParsedUpiParams = {
  schemeHost: string;
  paMasked: string;
  pn: string;
  am: string;
  cu: string;
  tn: string;
  tr: string;
  paramKeys: string[];
  maskedQueryPreview: string;
};

export const parseUpiPayParams = (rawUrl: string): ParsedUpiParams | null => {
  const url = (rawUrl || '').trim();
  if (!url) return null;
  let schemeHost = 'unknown';
  let search = '';
  if (url.startsWith('upi://pay?')) {
    schemeHost = 'upi://pay';
    search = url.slice('upi://pay?'.length);
  } else if (url.startsWith('intent://pay?')) {
    schemeHost = 'intent://pay';
    search = url.slice('intent://pay?'.length).split('#')[0];
  } else if (url.includes('?')) {
    schemeHost = url.slice(0, url.indexOf('?'));
    search = url.slice(url.indexOf('?') + 1).split('#')[0];
  } else {
    return null;
  }
  const map = new URLSearchParams(search);
  const decode = (value: string | null) => {
    if (value == null) return '';
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  const pa = decode(map.get('pa'));
  const pn = decode(map.get('pn'));
  const am = map.get('am') || '';
  const cu = map.get('cu') || '';
  const tn = decode(map.get('tn'));
  const tr = decode(map.get('tr'));
  return {
    schemeHost,
    paMasked: maskUpiId(pa),
    pn,
    am,
    cu,
    tn,
    tr,
    paramKeys: Array.from(map.keys()),
    maskedQueryPreview: [
      `pa=${maskUpiId(pa)}`,
      pn ? `pn=${pn}` : '',
      am ? `am=${am}` : '',
      cu ? `cu=${cu}` : '',
      tn ? `tn=${tn}` : '',
      tr ? `tr=(set)` : '',
    ]
      .filter(Boolean)
      .join('&'),
  };
};

export const buildSellerStaticUpiUrl = (upiId: string, payeeName: string): string =>
  buildUpiPayUrlVariant('V3', { upiId, payeeName });

/**
 * Production open: same URL as buildUpiPayUrl (with amount).
 * Prefers GPay intent on Android, then plain upi://.
 */
export const openUpiPayment = async (params: UpiPayParams): Promise<boolean> => {
  const upiId = (params.upiId || '').trim();
  if (!upiId) throw new Error('Seller UPI ID is not set');
  if (!(params.amount > 0)) throw new Error('Enter a valid amount before opening GPay');

  const upiUrl = buildUpiPayUrl(params);
  logUpiPayUriDebug(upiUrl, 'openUpiPayment');
  return openUpiWithGpayIntent(upiUrl);
};

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
