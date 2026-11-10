import { Platform } from 'react-native';

const STORAGE_KEY = 'nd_cashfree_pending_cf_order';
const ND_ORDER_KEY = 'nd_cashfree_pending_nd_order';

/** Persist cf order id before checkout so return redirect can verify even if query is stripped. */
export const rememberCashfreeOrder = (cfOrderId: string) => {
  const id = (cfOrderId || '').trim();
  if (!id) return;
  try {
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, id);
    }
  } catch {
    // ignore
  }
};

/** Remember Natural Drops order id for Pay Now recovery after web return / app interrupt. */
export const rememberCheckoutNdOrder = (orderId: number) => {
  if (!orderId || !Number.isFinite(orderId)) return;
  try {
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(ND_ORDER_KEY, String(orderId));
    }
  } catch {
    // ignore
  }
};

export const takeRememberedCheckoutNdOrder = (): number | null => {
  try {
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(ND_ORDER_KEY);
      if (raw) sessionStorage.removeItem(ND_ORDER_KEY);
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    }
  } catch {
    // ignore
  }
  return null;
};

export const peekRememberedCheckoutNdOrder = (): number | null => {
  try {
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      const id = Number(sessionStorage.getItem(ND_ORDER_KEY));
      return Number.isFinite(id) && id > 0 ? id : null;
    }
  } catch {
    // ignore
  }
  return null;
};

export const takeRememberedCashfreeOrder = (): string | null => {
  try {
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      const id = sessionStorage.getItem(STORAGE_KEY);
      if (id) sessionStorage.removeItem(STORAGE_KEY);
      return id;
    }
  } catch {
    // ignore
  }
  return null;
};

/** Read cf_order / order_id from the browser URL after Cashfree return_url redirect. */
export const readCashfreeReturnOrderId = (): string | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search || '');
    const fromQuery = (params.get('cf_order') || params.get('order_id') || '').trim();
    if (fromQuery) return fromQuery;
  } catch {
    // ignore
  }
  return takeRememberedCashfreeOrder();
};

/** Drop Cashfree query params from the address bar without a navigation reload. */
export const clearCashfreeReturnQuery = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('cf_order') && !url.searchParams.has('order_id')) return;
    url.searchParams.delete('cf_order');
    url.searchParams.delete('order_id');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch {
    // ignore
  }
};

/**
 * Fast status poll after payment — first check immediate, then short gaps.
 * Typical PAID within 1–3s; stops early on terminal states.
 */
export const pollCashfreeFast = async <T extends {
  paymentApplied?: boolean;
  cfOrderStatus?: string | null;
  status?: string | null;
  amount?: number | string | null;
}>(
  fetchStatus: () => Promise<T>,
  options?: { maxAttempts?: number; gapMs?: number }
): Promise<T | undefined> => {
  const maxAttempts = options?.maxAttempts ?? 12;
  const gapMs = options?.gapMs ?? 450;
  let last: T | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, gapMs));
    }
    try {
      const status = await fetchStatus();
      last = status;
      if (status?.paymentApplied || String(status?.cfOrderStatus || '').toUpperCase() === 'PAID') {
        return status;
      }
      const local = String(status?.status || '').toUpperCase();
      if (
        local === 'FAILED'
        || local === 'EXPIRED'
        || local === 'USER_DROPPED'
        || local === 'CANCELLED'
      ) {
        return status;
      }
    } catch {
      // keep trying — webhook may still apply
    }
  }
  return last;
};
