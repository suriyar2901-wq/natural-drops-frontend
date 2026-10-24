import { Linking, Platform } from 'react-native';

export type UpiPayParams = {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
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

/**
 * Safe debug dump of a upi://pay URI (pa/pn/am/cu/tn/tr).
 * Does not log UPI PIN, OTP, or account credentials (those are never in this URI).
 */
export const logUpiPayUriDebug = (upiUrl: string, source: string) => {
  try {
    let search = '';
    if (upiUrl.includes('upi://pay?')) {
      search = upiUrl.split('upi://pay?')[1] || '';
    } else if (upiUrl.includes('tez://upi/pay?')) {
      search = upiUrl.split('tez://upi/pay?')[1] || '';
    } else if (upiUrl.includes('?')) {
      search = upiUrl.slice(upiUrl.indexOf('?') + 1);
    }
    search = search.split('#')[0];
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
    const trRaw = map.get('tr');
    const tr = trRaw != null ? decode(trRaw) : null;

    console.log(`[UPI debug:${source}] scheme=upi://pay`, {
      paMasked: maskUpiId(pa),
      pn,
      am,
      cu,
      tn,
      tr: tr != null && tr.length > 0 ? tr : '(not set)',
      hasTr: !!(tr && tr.length > 0),
      uriPreview: `upi://pay?pa=${maskUpiId(pa)}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}${tr ? '&tr=(set)' : ''}`,
    });
  } catch (error) {
    console.log(`[UPI debug:${source}] failed to parse URI for logging`, error);
  }
};

/** Strict INR amount for UPI `am` — always two decimal places. */
export const formatUpiAmount = (amount: number): string => {
  const n = Number(amount);
  if (!(n > 0) || !Number.isFinite(n)) return '';
  return n.toFixed(2);
};

export type ParsedUpiParams = {
  schemeHost: string;
  paMasked: string;
  pn: string;
  am: string;
  cu: string;
  tn: string;
  tr: string;
  mc: string;
  hasAm: boolean;
  hasTr: boolean;
  hasMc: boolean;
  paramKeys: string[];
  /** Masked query preview — never includes full VPA */
  maskedQueryPreview: string;
};

const decodeParam = (value: string | null): string => {
  if (value == null) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Parse a UPI / tez / intent pay URI into masked, decoded fields for on-screen diagnostics. */
export const parseUpiPayParams = (rawUrl: string): ParsedUpiParams | null => {
  const url = (rawUrl || '').trim();
  if (!url) return null;

  let schemeHost = 'unknown';
  let search = '';
  if (url.startsWith('upi://pay?')) {
    schemeHost = 'upi://pay';
    search = url.slice('upi://pay?'.length);
  } else if (url.startsWith('tez://upi/pay?')) {
    schemeHost = 'tez://upi/pay';
    search = url.slice('tez://upi/pay?'.length);
  } else if (url.startsWith('intent://pay?')) {
    schemeHost = 'intent://pay (scheme=upi)';
    search = url.slice('intent://pay?'.length).split('#')[0];
  } else if (url.includes('?')) {
    schemeHost = url.slice(0, url.indexOf('?'));
    search = url.slice(url.indexOf('?') + 1).split('#')[0];
  } else {
    return null;
  }

  const map = new URLSearchParams(search.split('#')[0]);
  const pa = decodeParam(map.get('pa'));
  const pn = decodeParam(map.get('pn'));
  const am = map.get('am') || '';
  const cu = map.get('cu') || '';
  const tn = decodeParam(map.get('tn'));
  const tr = decodeParam(map.get('tr'));
  const mc = decodeParam(map.get('mc'));
  const paramKeys = Array.from(map.keys());

  return {
    schemeHost,
    paMasked: maskUpiId(pa),
    pn,
    am,
    cu,
    tn,
    tr,
    mc,
    hasAm: !!am,
    hasTr: !!tr,
    hasMc: !!mc,
    paramKeys,
    maskedQueryPreview: [
      `pa=${maskUpiId(pa)}`,
      pn ? `pn=${pn}` : '',
      am ? `am=${am}` : '',
      cu ? `cu=${cu}` : '',
      tn ? `tn=${tn}` : '',
      tr ? `tr=(set,len=${tr.length})` : '',
      mc ? `mc=${mc}` : '',
    ]
      .filter(Boolean)
      .join('&'),
  };
};

/**
 * Shop Profile seller QR payload (static collect — no amount).
 * Matches ShopProfileScreen: upi://pay?pa&pn only.
 */
export const buildSellerStaticUpiUrl = (upiId: string, payeeName: string): string => {
  const id = (upiId || '').trim();
  if (!id) return '';
  return `upi://pay?pa=${encodeURIComponent(id)}&pn=${encodeURIComponent((payeeName || 'Shop').trim() || 'Shop')}`;
};

export type UpiOpenCandidate = {
  method: 'upi://pay' | 'intent://gpay-package' | 'tez://upi/pay' | 'web-location';
  label: string;
  usedOn: string;
};

/** Describes which open methods the app will try (does not open anything). */
export const listUpiOpenCandidates = (): UpiOpenCandidate[] => {
  if (Platform.OS === 'android') {
    return [
      {
        method: 'upi://pay',
        label: 'Standard upi://pay (same string as dynamic QR)',
        usedOn: 'Android — tried first',
      },
      {
        method: 'intent://gpay-package',
        label: 'intent://pay?…#Intent;scheme=upi;package=GPay',
        usedOn: 'Android — fallback if upi:// cannot open',
      },
    ];
  }
  if (Platform.OS === 'web') {
    return [
      {
        method: 'upi://pay',
        label: 'Standard upi://pay via Linking / location',
        usedOn: 'Web — primary',
      },
      {
        method: 'web-location',
        label: 'window.location.href = upi://pay (last resort)',
        usedOn: 'Web — if Linking fails',
      },
    ];
  }
  return [
    {
      method: 'upi://pay',
      label: 'Standard upi://pay',
      usedOn: Platform.OS,
    },
  ];
};

/** Build Android GPay package intent from a upi://pay URL (for diagnostics only). */
export const buildAndroidGpayIntentUrl = (upiUrl: string): string => {
  const query = upiUrl.replace(/^upi:\/\/pay\?/, '');
  return `intent://pay?${query}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
};

export type UpiFieldChecks = {
  vpaTrimmed: boolean;
  vpaLooksValid: boolean;
  vpaHasWhitespace: boolean;
  nameTrimmed: boolean;
  nameEmpty: boolean;
  amountFormatOk: boolean;
  amountHasWhitespace: boolean;
  noteHasLeadingTrailingSpace: boolean;
  /** True if raw URI still contains %25 (possible double-encoding of %). */
  possibleDoubleEncoding: boolean;
};

/** Integrity checks on seller fields + a built URI (diagnostic only). */
export const inspectUpiFieldIntegrity = (
  upiId: string,
  payeeName: string,
  amount: number,
  note: string,
  builtUri: string
): UpiFieldChecks => {
  const rawId = upiId || '';
  const trimmedId = rawId.trim();
  const am = formatUpiAmount(amount);
  return {
    vpaTrimmed: rawId === trimmedId,
    vpaLooksValid: /^[^\s@]+@[^\s@]+$/.test(trimmedId),
    vpaHasWhitespace: /\s/.test(rawId),
    nameTrimmed: (payeeName || '') === (payeeName || '').trim(),
    nameEmpty: !(payeeName || '').trim(),
    amountFormatOk: /^\d+\.\d{2}$/.test(am),
    amountHasWhitespace: /\s/.test(am),
    noteHasLeadingTrailingSpace: note !== note.trim(),
    possibleDoubleEncoding: /%25[0-9A-Fa-f]{2}/.test(builtUri),
  };
};

export type DiagnosticUpiVariant = {
  id: 'baseline' | 'amount_only' | 'amount_plus_note' | 'amount_plus_test_tr';
  title: string;
  description: string;
  /** Masked decoded preview — never full VPA */
  maskedPreview: string;
  keys: string[];
  /** Notes on tn vs tr — for on-screen education */
  note: string;
};

/**
 * Diagnostic-only URI variants. Does not open GPay and is not used by production Pay.
 * Does not invent mc / merchant url. Optional test `tr` is clearly labeled non-production.
 */
export const buildDiagnosticUpiVariants = (input: {
  upiId: string;
  payeeName: string;
  amount: number;
  orderId?: number | null;
}): DiagnosticUpiVariant[] => {
  const pa = (input.upiId || '').trim();
  const pn = (input.payeeName || 'Shop').trim() || 'Shop';
  const am = formatUpiAmount(input.amount);
  if (!pa || !am) return [];

  const enc = (value: string) => encodeURIComponent(value);
  const note = input.orderId != null ? `Order ${input.orderId}` : 'Bill payment';
  // Test-only reference — not wired into production Pay / claim flow.
  const testTr = `NDTEST${Date.now()}`;

  const make = (
    id: DiagnosticUpiVariant['id'],
    title: string,
    description: string,
    parts: string[],
    noteText: string
  ): DiagnosticUpiVariant => {
    const uri = `upi://pay?${parts.join('&')}`;
    const parsed = parseUpiPayParams(uri);
    return {
      id,
      title,
      description,
      maskedPreview: parsed
        ? `${parsed.schemeHost}?${parsed.maskedQueryPreview}`
        : '(parse failed)',
      keys: parsed?.paramKeys || [],
      note: noteText,
    };
  };

  return [
    make(
      'baseline',
      '1) Baseline (static-like)',
      'Same shape as seller shop QR: pa + pn only. No am / cu / tn / tr.',
      [`pa=${enc(pa)}`, `pn=${enc(pn)}`],
      'Matches working static QR model. Amount would be typed in GPay.'
    ),
    make(
      'amount_only',
      '2) Amount only',
      'pa + pn + am + cu. No tn, no tr.',
      [`pa=${enc(pa)}`, `pn=${enc(pn)}`, `am=${enc(am)}`, 'cu=INR'],
      'Isolates locked amount. If this fails in a manual scan test, am/dynamic path is implicated.'
    ),
    make(
      'amount_plus_note',
      '3) Amount + note (production shape)',
      'Current production Pay / dynamic QR: pa, pn, am, cu, tn. No tr.',
      [
        `pa=${enc(pa)}`,
        `pn=${enc(pn)}`,
        `am=${enc(am)}`,
        'cu=INR',
        `tn=${enc(note)}`,
      ],
      'tn = human-readable transaction note (NOT the UPI transaction reference). Production uses this shape today.'
    ),
    make(
      'amount_plus_test_tr',
      '4) Amount + unique test tr (diagnostic only)',
      'pa, pn, am, cu, tn, plus a one-off test tr. Not used for live Pay.',
      [
        `pa=${enc(pa)}`,
        `pn=${enc(pn)}`,
        `am=${enc(am)}`,
        'cu=INR',
        `tn=${enc(note)}`,
        `tr=${enc(testTr)}`,
      ],
      'tr = transaction reference id (order/bill id style). NPCI marks tr conditional/mandatory for merchant & dynamic merchant flows. Google India in-app sample includes tr with merchant VPA + mc. Do not assume tr alone fixes P2P personal VPA.'
    ),
  ];
};

/**
 * Standard NPCI UPI collect link (same string encoded into dynamic QR).
 * P2P to a personal/seller VPA: pa, pn, am, cu, tn only — do not invent `mc`
 * (merchant code) or that forces a P2M path GPay rejects for non-merchant VPAs.
 */
export const buildUpiPayUrl = ({ upiId, payeeName, amount, note }: UpiPayParams): string => {
  const am = formatUpiAmount(amount);
  const parts = [
    `pa=${encodeURIComponent(upiId.trim())}`,
    `pn=${encodeURIComponent((payeeName || 'Shop').trim() || 'Shop')}`,
    am ? `am=${encodeURIComponent(am)}` : '',
    'cu=INR',
    `tn=${encodeURIComponent((note || 'Bill payment').trim() || 'Bill payment')}`,
  ].filter(Boolean);
  return `upi://pay?${parts.join('&')}`;
};

/**
 * Optional GPay-only Android intent. Query must be the upi:// query string only —
 * never embed a second `upi://pay?` inside intent:// (that mangles `am` and often
 * surfaces a false "limit exceeded" error in GPay).
 */
const androidGpayPackageIntent = (upiUrl: string) => buildAndroidGpayIntentUrl(upiUrl);

/**
 * Opens a UPI app with the same payload as the dynamic QR.
 *
 * Android: prefer plain `upi://pay?...` first (OS chooser / default handler).
 * Forcing legacy `tez://upi/pay` first is a common cause of GPay showing
 * "You've exceeded the bank limit" on small P2P amounts while the identical
 * QR / manual VPA payment still works.
 *
 * UPI apps do not return UTR to third-party apps — buyer must paste UTR;
 * seller confirmation remains required (never auto-mark paid here).
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
  logUpiPayUriDebug(upiUrl, 'openUpiPayment');

  // Order matters: standards upi:// first (parity with QR). Package intent last.
  // Do not lead with tez:// — that path frequently false-fails P2P with "limit exceeded".
  const candidates =
    Platform.OS === 'android'
      ? [upiUrl, androidGpayPackageIntent(upiUrl)]
      : [upiUrl];

  for (const url of candidates) {
    try {
      const can = await Linking.canOpenURL(url).catch(() => Platform.OS === 'web');
      if (!can && Platform.OS !== 'web') {
        continue;
      }
      logUpiPayUriDebug(url.startsWith('upi://') ? url : upiUrl, `openUpiPayment.attempt:${url.slice(0, 12)}`);
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
