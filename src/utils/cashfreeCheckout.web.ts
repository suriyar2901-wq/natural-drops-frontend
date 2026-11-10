import { load } from '@cashfreepayments/cashfree-js';
import type { CashfreeCheckoutParams, CashfreeCheckoutResult } from './cashfreeCheckout.types';

const toMode = (environment?: string): 'sandbox' | 'production' =>
  (environment || 'SANDBOX').toUpperCase() === 'PRODUCTION' ? 'production' : 'sandbox';

const mapCheckoutResult = (
  result: any,
  cfOrderId: string
): CashfreeCheckoutResult => {
  const error = result?.error || result?.paymentDetails?.error;
  if (error) {
    return {
      status: 'FAILED',
      orderId: cfOrderId,
      message: typeof error === 'string' ? error : error?.message || 'Payment failed',
    };
  }

  const paymentStatus = String(
    result?.paymentDetails?.paymentStatus
      || result?.paymentStatus
      || result?.status
      || ''
  ).toUpperCase();

  if (paymentStatus.includes('SUCCESS') || paymentStatus === 'PAID' || result?.paymentCompleted) {
    return { status: 'COMPLETED', orderId: cfOrderId };
  }
  if (result?.redirect) {
    return { status: 'UNKNOWN', orderId: cfOrderId, message: 'Redirected for payment — verifying with server' };
  }
  if (paymentStatus.includes('CANCEL') || paymentStatus.includes('USER_DROPPED') || result === undefined) {
    return { status: 'UNKNOWN', orderId: cfOrderId, message: 'Checkout closed — verifying with server' };
  }
  return { status: 'UNKNOWN', orderId: cfOrderId };
};

/**
 * Web: Cashfree JS hosted checkout.
 * Prefer in-page `_modal` (reliable). Fall back to same-tab `_self` if the modal cannot open
 * (popup blockers / Chrome device toolbar). Domain must be whitelisted in Cashfree dashboard.
 */
export const openCashfreeCheckout = async (
  params: CashfreeCheckoutParams
): Promise<CashfreeCheckoutResult> => {
  const paymentSessionId = (params.paymentSessionId || '').trim();
  if (!paymentSessionId) {
    throw new Error('Missing Cashfree payment session');
  }

  const cashfree = await load({ mode: toMode(params.environment) });
  if (!cashfree) {
    throw new Error('Cashfree web SDK failed to load');
  }

  // Prefer in-page modal so the SPA stays mounted and can confirm payment immediately.
  // If modal cannot open, same-tab redirect uses Cashfree order_meta.return_url back into the app.
  let result: any;
  try {
    result = await cashfree.checkout({
      paymentSessionId,
      redirectTarget: '_modal',
    });
  } catch (modalError: any) {
    console.warn('[Cashfree] modal checkout failed, falling back to _self', modalError);
    result = await cashfree.checkout({
      paymentSessionId,
      redirectTarget: '_self',
    });
    return mapCheckoutResult(
      result?.redirect || result === undefined ? { redirect: true } : result,
      params.cfOrderId
    );
  }

  if (result?.error && /popup|blocked|unable to open|could not open/i.test(String(result.error?.message || result.error))) {
    result = await cashfree.checkout({
      paymentSessionId,
      redirectTarget: '_self',
    });
    return mapCheckoutResult(
      result?.redirect || result === undefined ? { redirect: true } : result,
      params.cfOrderId
    );
  }

  return mapCheckoutResult(result, params.cfOrderId);
};
