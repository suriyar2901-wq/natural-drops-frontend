import {
  CFErrorResponse,
  CFPaymentGatewayService,
} from 'react-native-cashfree-pg-sdk';
import { CFEnvironment, CFSession } from 'cashfree-pg-api-contract';
import type { CashfreeCheckoutParams, CashfreeCheckoutResult } from './cashfreeCheckout.types';

const toEnv = (environment?: string) =>
  (environment || 'SANDBOX').toUpperCase() === 'PRODUCTION'
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

/**
 * Native (iOS/Android): Cashfree RN Web Checkout.
 * Requires an Expo development / EAS build (not Expo Go).
 */
export const openCashfreeCheckout = async (
  params: CashfreeCheckoutParams
): Promise<CashfreeCheckoutResult> => {
  const paymentSessionId = (params.paymentSessionId || '').trim();
  const orderId = (params.cfOrderId || '').trim();
  if (!paymentSessionId || !orderId) {
    throw new Error('Missing Cashfree payment session');
  }

  return new Promise<CashfreeCheckoutResult>((resolve) => {
    let settled = false;
    const finish = (value: CashfreeCheckoutResult) => {
      if (settled) return;
      settled = true;
      try {
        CFPaymentGatewayService.removeCallback();
      } catch {
        // ignore
      }
      resolve(value);
    };

    try {
      CFPaymentGatewayService.setCallback({
        onVerify(verifiedOrderId: string) {
          finish({ status: 'COMPLETED', orderId: verifiedOrderId || orderId });
        },
        onError(error: CFErrorResponse, failedOrderId: string) {
          const message =
            (error as any)?.message
            || (error as any)?.getMessage?.()
            || JSON.stringify(error)
            || 'Payment failed';
          finish({
            status: 'FAILED',
            orderId: failedOrderId || orderId,
            message: String(message),
          });
        },
      });

      const session = new CFSession(paymentSessionId, orderId, toEnv(params.environment));
      CFPaymentGatewayService.doWebPayment(session);
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (/Expo Go|native module|null is not an object|CFPaymentGateway/i.test(msg)) {
        finish({
          status: 'FAILED',
          orderId,
          message:
            'Cashfree native SDK needs an Expo development build (npx expo run:android / EAS). Expo Go is not supported.',
        });
        return;
      }
      finish({ status: 'FAILED', orderId, message: msg });
    }
  });
};
