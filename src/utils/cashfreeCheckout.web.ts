import { load } from '@cashfreepayments/cashfree-js';
import type { CashfreeCheckoutParams, CashfreeCheckoutResult } from './cashfreeCheckout.types';

const toMode = (environment?: string): 'sandbox' | 'production' =>
  (environment || 'SANDBOX').toUpperCase() === 'PRODUCTION' ? 'production' : 'sandbox';

/**
 * Web: Cashfree JS hosted checkout (modal). Domain must be whitelisted in Cashfree dashboard.
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

  const result: any = await cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_modal',
  });

  // SDK may return payment details or undefined depending on redirectTarget
  const error = result?.error || result?.paymentDetails?.error;
  if (error) {
    return {
      status: 'FAILED',
      orderId: params.cfOrderId,
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
    return { status: 'COMPLETED', orderId: params.cfOrderId };
  }
  if (paymentStatus.includes('CANCEL') || paymentStatus.includes('USER_DROPPED') || result === undefined) {
    // Modal close without clear success → verify via backend status API
    return { status: 'UNKNOWN', orderId: params.cfOrderId, message: 'Checkout closed — verifying with server' };
  }
  return { status: 'UNKNOWN', orderId: params.cfOrderId };
};
