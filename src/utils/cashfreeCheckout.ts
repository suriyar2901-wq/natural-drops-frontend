/**
 * Fallback module for TypeScript. Metro prefers:
 * - cashfreeCheckout.web.ts on web
 * - cashfreeCheckout.native.ts on iOS/Android
 */
export type { CashfreeCheckoutParams, CashfreeCheckoutResult } from './cashfreeCheckout.types';
export { openCashfreeCheckout } from './cashfreeCheckout.native';
