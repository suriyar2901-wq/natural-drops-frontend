# Natural Drops — Complete Existing Application Analysis  
## Payment Module Readiness (Analysis Only)

**Date:** 2026-11-10  
**Mode:** Inspection only — no source, schema, or config was modified for this report.  
**Repos audited:**
- Backend: `/home/suriyarajendran/natural_drops_source_BE_sept24/Natural-Drops`
- Frontend: `/home/suriyarajendran/natural_drops_source_BE_sept24/natural-drops-frontend`

**Evidence rule:** Features are classified only when wiring (UI → API → service → persistence) was verified. Name-only stubs are **Not Implemented**.

---

## 1. Application Architecture Overview

### 1.1 Technology stack (verified)

| Layer | Technology | Evidence |
|-------|------------|----------|
| Frontend | Expo `~54.0.37`, React Native `0.81.5`, React `19.1.0` | `natural-drops-frontend/package.json` |
| Frontend state | Redux Toolkit + RTK Query + redux-persist (AsyncStorage) | `src/store/index.ts`, `src/store/api/baseApi.ts` |
| Frontend nav | React Navigation stack + bottom tabs | `src/navigation/AppNavigator.tsx` |
| Backend | Spring Boot **2.7.18**, Java **1.8** | `Natural-Drops/pom.xml` |
| Persistence | Spring Data JPA, PostgreSQL, `ddl-auto=update` | `pom.xml`, `application.properties` |
| Auth | Custom JWT (`jjwt`), `JwtTokenFilter`, `JwtTokenProvider`, BCrypt | `com.naturaldrops.config`, `util` |
| Payments PG | Cashfree (`CashfreeApiClient`, webhook HMAC) | `service.cashfree`, `CashfreeProperties` |
| Deploy (observed in ops) | FE: Vercel; BE: Render; DB: PostgreSQL (e.g. Prisma-hosted in local props) | Runtime URLs previously confirmed; env-driven |

### 1.2 Application shape

```
┌──────────────────────────┐     JWT Bearer      ┌──────────────────────────┐
│  Expo Web / Mobile FE    │ ──────────────────► │  Spring Boot REST API    │
│  BuyerApp / AdminApp     │ ◄────────────────── │  /api/**                 │
└──────────────────────────┘   JSON ApiResponse  └────────────┬─────────────┘
                                                              │
                                                              ▼
                                                     PostgreSQL (JPA)
                                                              │
                     Cashfree PG ◄── create order / status / webhook ──┘
```

**Roles:** `admin`, `seller`, `buyer` (`User.UserRole`).  
- Buyers → `BuyerApp` tabs (Shop, Orders, Payments, Profile).  
- Sellers / Admins → `AdminApp` (different tab sets) + shared stack screens.  
- Sellers without active subscription are blocked by `SellerSubscriptionGate`.

### 1.3 Frontend–backend communication

- Base URL: `EXPO_PUBLIC_API_BASE_URL` or localhost / LAN (`src/utils/constants.ts`).
- RTK Query unwraps backend wrapper `{ success, message, data }` (`baseApi.ts`).
- Auth: `Authorization: Bearer <accessToken>`; 401 → refresh via `/api/auth/refresh-token`.

### 1.4 Deployment configuration (high level)

- Backend: env vars for DB, JWT, mail, Cashfree (`CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`, `CASHFREE_ENV`), `app.base-url` / frontend return URL.
- Frontend: Vercel build of Expo web; Cashfree domain whitelist required for hosted checkout.
- Local secrets file `application-local.properties` is **gitignored** (not part of remote source).

---

## 2. Existing Customer Order Flow

Natural Drops is **shop-order → fulfill → bill → pay**, not classic “pay at checkout before order”.

### 2.1 Step-by-step (actual code)

| Step | What exists | Frontend | Backend |
|------|-------------|----------|---------|
| Registration / login | Yes | `RegisterScreen`, `LoginScreen` | `AuthController` `/api/auth/register`, `/login` |
| Product browse | Yes | `HomeScreen` (Shop) | Menu/shop APIs |
| Product details | Yes | `ProductDetailScreen` | Menu item APIs |
| Add / update / remove cart | Yes (client only) | Redux cart (`CartScreen`, cart slice) | **No Cart table/API** |
| Delivery address | Partial | Uses buyer profile address fields on order create | Stored on `Order.deliveryAddress` + user address columns |
| Checkout page | Partial | **Cart is checkout** (quote + place) | `GET /api/pricing/quote` |
| Order summary | Yes | Cart totals UI | Server recomputes total on create |
| Place Order | Yes | `CartScreen` → `useCreateOrderMutation` | `POST /api/orders` → `OrderService.createOrder` |
| After Place Order | Alert + go Shop | `clearCart()`, `navigateToShop()`, `Alert('Order Placed')` | Order row created `UNPAID` typically |
| Order confirmation screen | **No dedicated screen** | Alert only | — |
| Order history | Yes | `OrdersScreen`, `OrderDetailScreen` | `GET /api/orders/buyer/{id}`, etc. |
| Order tracking | Partial | Status labels + history | `Order.status`, `OrderStatusHistory`, status PATCH APIs |
| Cancellation | Yes (pending) | Buyer cancel | `POST /api/orders/{id}/buyer-cancel` |

### 2.2 Exact post–Place Order behavior

**Verified in** `src/screens/buyer/CartScreen.tsx`:
1. Build `orderData` (items, buyerId, lat/lng, etc.).
2. `createOrder(orderData).unwrap()`.
3. `clearCart()`.
4. Navigate to Shop (`Home`).
5. Show **Order Placed** alert.

**Payment is not collected at Place Order.**

### 2.3 Entities involved in order creation

- `Order` / `orders`
- `OrderItem` / `order_items` (`cartQuantity` is a column name, not a cart table)
- `User` (buyer address fields)
- `PricingService` for tax / platform fee / delivery-km
- Optional later: `PaymentClaim`, `CashfreePayment` when paying bills

---

## 3. Existing Payment Functionality

### 3.1 Classification matrix

| Feature | Classification | Evidence |
|---------|----------------|----------|
| Cashfree buyer bill pay | **Fully Implemented** | FE `BuyerPaymentsScreen.payWithCashfree`; BE `CashfreePaymentController` + `CashfreePaymentService.createOrderForBuyer` + status + webhook |
| Cashfree seller subscription | **Fully Implemented** | `SellerSubscriptionPayScreen`; `POST /api/payments/cashfree/subscription/orders` |
| Cashfree webhook + HMAC | **Fully Implemented** | `POST /api/payments/cashfree/webhook`, `CashfreeSignatureVerifier` |
| UPI deep link / GPay intent | **Partially Implemented** | `src/utils/upiPayment.ts` builds `upi://` / Android GPay intent; no official GPay SDK |
| UPI QR (seller / platform) | **Partially Implemented** | Generated/uploaded QR on `BuyerPaymentsScreen`, `ShopProfileScreen`, platform payment admin; dynamic amount QR for bills |
| Buyer UPI “I have paid” claim | **Fully Implemented** | `POST /api/payments/order/claim` → seller `SellerBillClaimsScreen` confirm/reject |
| Seller hand-cash subscription claim | **Fully Implemented** | `claimSubscriptionPayment` method `CASH` → admin “Cash received” |
| Platform UPI/QR settings | **Fully Implemented** | `GET/PUT /api/payments/platform` |
| Google Pay (native SDK) | **Not Implemented** | Intent/deeplink only |
| PhonePe / Paytm apps | **Not Implemented** | Names only in unused stub `src/services/payment.service.ts` |
| Razorpay | **Not Implemented** | Commented placeholder in `payment.service.ts`; **not used by any screen** |
| Credit / Debit card UI | **Not Implemented** (as first-class) | Cards may appear inside Cashfree hosted checkout only — **NOT VERIFIED** which methods Cashfree merchant account enables |
| Cash on Delivery (COD) | **Not Implemented** | No COD method on cart/checkout; unpaid-after-delivery model instead |
| Payment success/failure screens | **Not Implemented** | Toasts / in-screen verifying only (`cashfreeReturn.ts`) |
| PG refunds | **Not Implemented** | No refund APIs (can-deposit “REFUND” is inventory ledger, not PG refund) |
| Pre-order checkout capture | **Not Implemented** | Pay is post-order / post-bill |

### 3.2 Two separate money domains (critical)

1. **Seller → Platform subscription** (access fee): Cashfree GATEWAY or admin/cash claim → `SellerPayment` / `SellerSubscription`.  
2. **Buyer → Seller bill** (order unpaid balance): Cashfree `ORDER_BILL` or UPI `PaymentClaim` → updates `Order.paymentStatus` / `finalBillAmount`.

These must not be confused when designing a new “Payment Module”.

---

## 4. Existing Database Structure

### 4.1 Order / customer / catalog (relevant)

| Entity | Table | Notes |
|--------|-------|-------|
| `User` | `users` | Customer/seller/admin; structured address fields |
| `Order` | `orders` | `total`, `paymentStatus` (`PAID`/`UNPAID`/`PARTIALLY_PAID`), `finalBillAmount`, `deliveryAddress`, lat/lng, status |
| `OrderItem` | `order_items` | rate, quantity, cartQuantity, subtotal |
| `MenuItem` | menu items | Catalog |
| **Cart / CartItem** | — | **Do not exist** |
| `ShopCustomer` | shop customers | Outstanding `money` ledger |
| `ShopProfile` | `shop_profiles` | `upiId`, `qrData`, `deliveryChargePerKm` |

### 4.2 Payment-related tables (exist)

| Entity | Table | Key fields |
|--------|-------|------------|
| `CashfreePayment` | `cashfree_payments` | `cf_order_id`, `payment_session_id`, `amount`, `status`, `purpose` (`ORDER_BILL`/`SELLER_SUBSCRIPTION`), `payment_applied`, `order_id` (nullable for subscription) |
| `PaymentClaim` | `payment_claims` | `kind`, `amount`, `method`, `upi_reference`, `status`, order/seller links |
| `SellerPayment` | `seller_payments` | plan, amount, method `CASH`/`UPI`/`GATEWAY`, `gateway_ref` |
| `SellerSubscription` | `seller_subscriptions` | plan, amount, start/expiry, `payment_status` |
| `LedgerEvent` | `shop_ledger_events` | BILL / RECEIPT style shop ledger |
| `Setting` | settings | tax, platform fee, plan amounts, platform UPI/QR |

### 4.3 Missing relative to a classic ecommerce payment module

- No dedicated `cart` / `cart_items` tables.  
- No generic `payments` / `payment_transactions` table beyond Cashfree + claims + seller_payments.  
- No COD-specific columns.  
- No refund transaction table for PG.

---

## 5. Existing Backend APIs

### 5.1 Cart / checkout / orders

| Method | Endpoint | Controller | Service | Status |
|--------|----------|------------|---------|--------|
| — | (no cart API) | — | — | **Not Implemented** |
| GET | `/api/pricing/fees` | `PricingController` | `PricingService` | Fully |
| GET | `/api/pricing/quote` | `PricingController` | `PricingService` | Fully |
| POST | `/api/orders` | `OrderController` | `OrderService.createOrder` | Fully |
| GET | `/api/orders`, `/buyer/{id}`, filters | `OrderController` | `OrderService` | Fully |
| GET | `/api/orders/{id}` | `OrderController` | `getOrderById` | Fully |
| GET | `/api/orders/{id}/history` | `OrderController` | `getOrderStatusHistory` | Fully |
| POST | `/api/orders/{id}/buyer-cancel` | `OrderController` | `buyerCancelPending` | Fully |
| PUT | `/api/orders/{id}/bill` | `OrderController` | `updateOrderBill` | Fully (auth TODO) |
| PATCH | confirm / process / on-the-way / deliver / cancel | `OrderController` | matching methods | Fully (some role checks commented) |

**Create order body (conceptual):** `CreateOrderRequest` — buyerId, items (menuItemId, rate, cartQuantity, subtotal), location, schedule.  
**Response:** `ApiResponse<Order>`.  
**Purpose:** Persist order; **server overwrites total** via `PricingService`.

### 5.2 Payment APIs

| Method | Endpoint | Controller | Service | Purpose | Status |
|--------|----------|------------|---------|---------|--------|
| POST | `/api/payments/cashfree/orders` | `CashfreePaymentController` | `createOrderForBuyer` | Start Cashfree for unpaid bill | Fully |
| GET | `/api/payments/cashfree/orders/{cfOrderId}/status` | same | `verifyAndRefreshStatus` | Poll/confirm PAID | Fully |
| POST | `/api/payments/cashfree/subscription/orders` | same | `createOrderForSellerSubscription` | Seller sub pay | Fully |
| GET | `/api/payments/cashfree/subscription/orders/{cfOrderId}/status` | same | subscription verify | Fully |
| POST | `/api/payments/cashfree/webhook` | same | `handleWebhook` | Async confirm | Fully |
| POST | `/api/payments/order/claim` | `PaymentClaimController` | `claimOrderBill` | Buyer UPI claim | Fully |
| POST | `/api/payments/order/{id}/reference` | same | attach UTR | Fully |
| POST | `/api/payments/order/{id}/confirm\|reject` | same | seller resolve | Fully |
| GET | `/api/payments/order/mine\|pending` | same | lists | Fully |
| POST | `/api/payments/subscription/claim` | same | seller cash/UPI claim | Fully |
| POST | `/api/payments/subscription/{id}/confirm\|reject` | same | admin resolve | Fully |
| GET/PUT | `/api/payments/platform` | same | platform UPI/QR | Fully |
| POST | `/api/buyer-account/payments` | buyer-account controller | `buyerClaimPayment` | Direct apply (bypasses claim UX) | **Partial / legacy risk** |
| POST | `/api/admin/sellers/{id}/payments` | `PlatformAdminController` | `activateWithPayment` | Admin record sub payment | Fully |
| GET | `/api/admin/payments` | same | `listPayments` | SellerPayment ledger | Fully |
| GET | `/api/shop/subscription/payments` | `ShopController` | `listPaymentsForUser` | Seller history | Fully |

---

## 6. Existing Frontend Screens

| Screen | Path | Role in payment/order |
|--------|------|------------------------|
| `CartScreen` | `src/screens/buyer/CartScreen.tsx` | Checkout + Place Order → Shop |
| `BuyerPaymentsScreen` | `src/screens/buyer/BuyerPaymentsScreen.tsx` | **Main buyer payment UI** (Cashfree + UPI/GPay/QR + claims) |
| `OrdersScreen` / `OrderDetailScreen` | buyer/common | History / status; not PG checkout |
| `SellerSubscriptionPayScreen` | `src/screens/shop/...` | Platform subscription pay |
| `SellerSubscriptionGate` | `src/components/common/...` | Blocks unpaid sellers |
| `SellerBillClaimsScreen` | shop/admin area | Confirm buyer UPI bills |
| `AdminPlatformPaymentScreen` | admin | Platform QR + cash received |
| `RecordShopPaymentScreen` | shop | Manual ledger CASH/UPI/GATEWAY (not buyer checkout) |
| `QRScannerScreen` | buyer | Generic scan — **not** payment settlement |
| Stub `payment.service.ts` | services | Unused Razorpay placeholder |

### Answers to explicit questions

| Question | Answer (code-based) |
|----------|---------------------|
| Screen after Place Order? | **Shop (Home)** + Alert — not Payments |
| Existing payment selection at checkout? | **No** dedicated checkout payment step |
| Customer placing order directly? | **Yes** — order created unpaid |
| Payment before or after order? | **After** order (and typically after billing/fulfillment) |
| Payment success/failure screens? | **None** — toasts + verifying loader |

---

## 7. Business Logic

| Topic | Actual behavior | Evidence |
|-------|-----------------|----------|
| Product / line total | Client sends rate × qty; stored on `OrderItem` | `CreateOrderRequest` / `OrderService` |
| Order total | **Recomputed on server**: subtotal + tax + delivery + platform fee | `PricingService`, `OrderService.createOrder` |
| Tax | Settings `taxEnabled`, `taxRatePercent` (default ~5%) | `PricingService` |
| Platform fee | Optional flat fee from settings | `PricingService` |
| Delivery | `deliveryChargePerKm` × distance (haversine; min 1 km if rate set) | `ShopProfile` + `PricingService` |
| Discounts | **Not verified** as a first-class discount engine | No clear coupon module found in audit |
| Backend total validation | Client `total` not trusted for stored total | `OrderService` overwrite |
| Line rate authority | **Client rates accepted** (not re-loaded from `MenuItem` on create) | Gap |
| Duplicate order prevention | **Not verified** as idempotent create key | Normal POST create |
| Payment failure handling | Cashfree status FAILED/EXPIRED + UI toasts; unpaid order remains | `CashfreePaymentService`, FE poll |
| Partial payments | Supported via `PARTIALLY_PAID` + unpaid balance helpers | `OrderService` |

---

## 8. Security Analysis

| Risk | Finding | Severity |
|------|---------|----------|
| Payment amount manipulation (Cashfree bill) | Amount optional; **capped to unpaid balance** server-side | Mitigated |
| Subscription amount manipulation | Plan price from **server settings** | Mitigated |
| Frontend-only validation | Totals recomputed; still trust client **item rates** | Medium |
| Unauthorized order access | Buyer scoped queries exist; some seller mutations have **commented role checks** (`OrderController` TODO on confirm/cancel/bill) | High |
| Duplicate Cashfree apply | `paymentApplied` + pessimistic locks + webhook re-fetch | Mitigated |
| Duplicate UPI claims | One PENDING claim per order enforced | Mitigated |
| Payment status manipulation | Buyers cannot set `paymentStatus` directly via public DTO in normal Cashfree/claim paths; bill update is seller API | Mostly OK; bill endpoint auth weak |
| Direct buyer self-apply | `POST /api/buyer-account/payments` can apply without seller confirm | High (if still exposed to clients) |
| Sensitive PG secrets | Server-side env; session id returned to client (expected) | OK |
| API authentication | JWT on payment create/status; webhook public + HMAC | OK if secrets strong |
| Seller self-subscribe without proof | `POST /api/shop/subscription` can activate without gateway | High if enabled in prod UX |

---

## 9. Payment Module Readiness Assessment

### A. UPI QR Payment
- **Existing:** Seller/platform QR + `upi://` links + claim workflow.  
- **Missing:** True PSP-verified UPI collect (beyond Cashfree); scanner not tied to pay.  
- **FE:** Strengthen QR UX; optional dedicated pay screen.  
- **BE:** Mostly ready for claim model; optional intent status APIs if adding another PSP.  
- **DB:** `payment_claims` sufficient for manual; Cashfree table for gateway.  
- **External:** None for current claim model; Cashfree or other PSP for verified UPI.

### B. Google Pay / PhonePe / Paytm
- **Existing:** GPay via Android intent / UPI URL only.  
- **Missing:** PhonePe/Paytm SDKs; verified app-to-app collect.  
- **FE/BE/DB:** New integration layer if required beyond UPI intent.  
- **External:** Each app’s merchant APIs or a PG that aggregates them (Cashfree already can expose UPI apps inside checkout — merchant config **NOT VERIFIED**).

### C. Cash on Delivery
- **Existing:** Implicit “order now, pay later / unpaid bill”.  
- **Missing:** Explicit COD method, COD reconciliation UI, COD fees.  
- **FE:** Cart payment method + labels.  
- **BE:** Method enum + status rules.  
- **DB:** payment_method on order or claim.  
- **External:** None.

### D. Credit / Debit Card
- **Existing:** Only via Cashfree hosted checkout (if enabled on Cashfree account).  
- **Missing:** Dedicated card UI; PCI-compliant custom card form (not recommended).  
- **Recommended:** Keep cards inside Cashfree.  
- **External:** Cashfree production keys + card enablement.

### E. Future payment gateway integration
- **Existing:** Cashfree-shaped module (`CashfreePayment` purpose, webhook, idempotency) is a good pattern to copy.  
- **Missing:** Gateway abstraction interface; Razorpay stub is dead code.  
- **FE/BE:** Adapter pattern; do not revive unused `payment.service.ts` as-is.  
- **DB:** Either extend `cashfree_payments` to generic `gateway_payments` or add parallel tables.

### F. Payment transaction history
- **Existing:** Seller subscription history API; Cashfree rows; admin `SellerPayment` list; buyer sees claims/orders.  
- **Missing:** Unified buyer “transaction history” screen across Cashfree + UPI.  
- **FE:** History UI aggregation.  
- **BE:** Query endpoints joining purposes.  
- **DB:** Mostly present.

### G. Payment verification
- **Existing:** Cashfree status API + webhook + signature; UPI via human confirm.  
- **Missing:** Automated UPI bank reconciliation outside Cashfree.  
- **External:** Webhooks must stay publicly reachable with valid secrets.

---

## 10. Existing Implementation vs Missing Features

### Already strong
- Dual-rail money movement (Cashfree + manual claims).  
- Server-side subscription and bill amount controls for gateway.  
- Partial payments and unpaid balance.  
- Pricing engine (tax, fee, delivery/km).  
- Seller subscription gate + history/dates UX.  
- Webhook idempotency patterns.

### Missing for a “classic checkout Payment Module”
- Pay-at-checkout before/at Place Order.  
- Dedicated payment method selection on cart.  
- COD as a named method.  
- Razorpay/PhonePe/Paytm first-class.  
- Payment success/failure routes.  
- Server-authoritative catalog rates on order create.  
- Hardened role checks on some order mutation APIs.  
- PG refund flow.  
- Persistent server-side cart (optional).

---

## 11. Recommended Implementation Approach

**Do not rip out Cashfree/claims.** Extend them.

1. **Decide product model**  
   - Keep **pay-after-bill** (current water-delivery fit), **or**  
   - Add **pay-at-checkout** as an additional path.  
   Mixing without a clear state machine will confuse `UNPAID` / claims / Cashfree sessions.

2. **Short term (lowest risk)**  
   - Treat Cashfree as the online PG for cards/UPI apps.  
   - Keep UPI QR + claim for offline/manual.  
   - Add explicit **COD** only if business needs a labeled method (map to unpaid bill).  
   - Add buyer **payment history** UI over existing tables.  
   - Fix auth TODOs on order bill/confirm/cancel.  
   - Re-price line items from `MenuItem` on create.  
   - Disable or protect `POST /api/shop/subscription` and `/api/buyer-account/payments` if unsafe in prod.

3. **If adding another gateway**  
   - Introduce a gateway interface; implement Cashfree as first adapter; add Razorpay second.  
   - Reuse webhook + `payment_applied` idempotency pattern from `CashfreePaymentService`.

4. **Do not**  
   - Assume `payment.service.ts` is live.  
   - Assume PhonePe/Paytm exist because of stub names.  
   - Build custom card vaulting.

---

## 12. Files and Classes Relevant to Payment Implementation

### Backend
- `com.naturaldrops.controller.CashfreePaymentController`
- `com.naturaldrops.controller.PaymentClaimController`
- `com.naturaldrops.controller.OrderController`
- `com.naturaldrops.controller.PricingController`
- `com.naturaldrops.controller.PlatformAdminController`
- `com.naturaldrops.controller.ShopController` (subscription + payments history)
- `com.naturaldrops.service.CashfreePaymentService`
- `com.naturaldrops.service.PaymentClaimService`
- `com.naturaldrops.service.OrderService`
- `com.naturaldrops.service.PricingService`
- `com.naturaldrops.service.SellerAdminService`
- `com.naturaldrops.service.cashfree.CashfreeApiClient`
- `com.naturaldrops.service.cashfree.CashfreeSignatureVerifier`
- `com.naturaldrops.config.CashfreeProperties`
- Entities: `CashfreePayment`, `PaymentClaim`, `SellerPayment`, `SellerSubscription`, `Order`, `OrderItem`, `ShopProfile`, `Setting`

### Frontend
- `src/screens/buyer/CartScreen.tsx`
- `src/screens/buyer/BuyerPaymentsScreen.tsx`
- `src/screens/shop/SellerSubscriptionPayScreen.tsx`
- `src/components/common/SellerSubscriptionGate.tsx`
- `src/screens/admin/AdminPlatformPaymentScreen.tsx`
- `src/store/api/paymentApi.ts`
- `src/store/api/orderApi.ts`
- `src/store/api/baseApi.ts`
- `src/utils/cashfreeCheckout.ts` / `.web.ts` / `.native.ts`
- `src/utils/cashfreeReturn.ts`
- `src/utils/upiPayment.ts`
- `src/services/payment.service.ts` (**stub — do not treat as production**)

### Config / ops
- `Natural-Drops/src/main/resources/application.properties` (`cashfree.*`)
- Env: `CASHFREE_*`, `DATABASE_*`, `jwt.secret`, frontend base URL for return_url

---

## Appendix — Communication summary

| From | To | How |
|------|----|-----|
| Buyer FE | BE | HTTPS JSON + JWT |
| Seller/Admin FE | BE | Same |
| BE | PostgreSQL | JDBC/JPA |
| BE | Cashfree | Server REST create/fetch; webhook inbound |
| Buyer FE | Cashfree | JS/Native SDK checkout using `paymentSessionId` only |
| Buyer device | UPI apps | `upi://` / intent (unverified bank success until claim/Cashfree) |

---

## Document control

- **Type:** Analysis / readiness  
- **Code changes in app:** None  
- **Assumptions called out:** Cashfree merchant-enabled methods (cards/UPI apps list) **NOT VERIFIED** without dashboard access  
- **Related human docs:** `docs/APP_OVERVIEW_THANGLISH.md`, `docs/MANUAL_TESTING_THANGLISH.md`

**End of report.**
