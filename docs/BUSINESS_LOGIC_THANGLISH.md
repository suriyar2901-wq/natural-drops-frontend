# Natural Drops — Business Logic Document (Shareable)

**Audience:** Business / operations / product / new team members  
**Language:** Tanglish (easy English + Tamil mix)  
**Purpose:** App-la **money, order, payment** epdi work aaguthu — clear business rules.  
**Source of truth:** Current Natural Drops application (buyer checkout dual payment included).

Ithu **code dump illa**. Business rules + flows.

---

## 1) Business in one line

Natural Drops = **water can / shop delivery** platform.

1. **Admin** — platform run pannuvaanga (sellers, subscription, fees).  
2. **Seller** — oru shop; products, delivery, bill, payment confirm.  
3. **Buyer** — order pottu, delivery-ku aprm (or Pay Now-la) pay pannuvaanga.

---

## 2) Roles & money domains (mix panna koodathu)

| Domain | Who pays | Who receives | Method examples |
|--------|----------|--------------|-----------------|
| **Seller subscription** | Seller → Platform (Admin) | Platform | Cashfree / hand cash / UPI claim to admin |
| **Buyer order bill** | Buyer → Seller shop | Seller | Cashfree / UPI QR claim / cash (seller confirm) |

**Important:** Subscription money ≠ order bill money. Oru flow-la render panna koodathu.

---

## 3) Order lifecycle (delivery status)

Order **delivery / shop workflow** status (payment status illa):

| Status | Meaning |
|--------|---------|
| `pending` | Buyer place pannitan; seller accept pannala |
| `confirmed` | Seller accept |
| `processing` | Packing / on the way style progress |
| `delivered` | Delivered |
| `canceled` | Cancelled |

**Rule:** Delivery status-ah payment status-ah use panna koodathu.  
Example: `delivered` ≠ automatically `PAID`.

---

## 4) Payment lifecycle (money status)

Order-ku separate **payment status**:

| Status | Meaning |
|--------|---------|
| `UNPAID` | Still money pending (full balance due) |
| `PARTIALLY_PAID` | Konjam paid; balance still iruku |
| `PAID` | Full amount settled |

Historical old orders-la payment status empty (`null`) irukalam — app treat pannum as unpaid balance = order total.

---

## 5) Dual payment model (checkout)

Buyer cart-la **rendu choice**:

### 5.1 Pay After Delivery (default — classic water-can business)

```
Cart → Select Pay After Delivery → Place Order
  → Order created = UNPAID
  → Seller accept → deliver → final bill / collect
  → Buyer pays later (Cashfree / UPI / cash)
  → Seller (or Cashfree verify) confirm → PAID / PARTIALLY_PAID
```

**Business meaning:**  
“Order ippo podu; money delivery / bill aprm.”

### 5.2 Pay Now (online while placing)

```
Cart → Select Pay Now → Place Order (still UNPAID first)
  → Cashfree checkout open
  → Server verify payment success
  → Only then payment = PAID (or partial if partial amount)
```

**Business meaning:**  
“Order create aagum; paid nu mark aagum **only after bank/Cashfree server confirm**.”

**Rules**
- Frontend “payment success” screen alone trust panna koodathu.
- Checkout close / app close → order **UNPAID**-ah irukum; same order-ku retry allow.
- Duplicate order create panna koodathu for same Pay Now attempt (retry = same order id).

---

## 6) Pricing / bill amount logic

### 6.1 Order total (server calculates)

Buyer cart-la numbers show aagum, but **final order total server decide**.

Typical formula:

```
Items subtotal
+ Tax (admin setting on/off + %)
+ Delivery charge (seller per-km × distance, or flat per-km if no GPS)
+ Platform fee (admin setting on/off + amount)
= Order total
```

**Rules**
- Client “total” field trust panna koodathu.
- Product rate prefer **menu price from server** (menu item id irundha).
- Seller later final bill edit — paid full bill lock (already PAID bill edit koodathu).

### 6.2 Outstanding balance (buyer still owe)

- `PAID` → balance `0`
- `PARTIALLY_PAID` → balance = `order total − amount already paid`
- `UNPAID` / empty → balance = **full order total**

Buyer Payments screen ithu base-la unpaid bills list pannum.

### 6.3 Partial payment

Buyer unpaid balance-ku **less amount** pay panna:

- Status → `PARTIALLY_PAID`
- Remaining balance next payment-ku open

Cashfree / UPI claim both amount ≤ outstanding enforce pannum.

---

## 7) How buyer can pay an order bill

### 7.1 Cashfree (online)

- Buyer selects unpaid bill(s) / Pay Now checkout.
- Backend creates Cashfree session for **server-calculated amount**.
- Webhook + status API verify.
- Success → payment applied **once** (idempotent — duplicate webhook double credit illa).

### 7.2 UPI QR / UPI apps + Payment claim

- Buyer seller UPI / QR use panni pay pannuvaanga.
- App-la **“I have paid”** → creates **Payment claim = PENDING**.
- **PENDING ≠ PAID.**
- Seller (authorized) **Confirm** → then order payment updates.
- Seller **Reject** → order stays unpaid; buyer retry / new claim.

### 7.3 Cash (hand collection)

- Seller / shop records cash received through existing seller payment workflows.
- Cash **confirm aagum varikum** auto PAID aaga koodathu.

---

## 8) Seller billing rules

1. Seller order accept / deliver pannalam (order status).  
2. Bill update (`final bill`) unpaid / partial orders-ku allow.  
3. **Fully PAID bill lock** — edit koodathu.  
4. Partial bill change → buyer notify (existing behaviour).  
5. Final bill amount original order total-ku **over** poga koodathu (validation).

**Pay Now full pay aana:** order already `PAID` → seller bill edit lock — prepaid business rule.

---

## 9) Seller subscription business logic (separate)

- Seller app use panna **active subscription** thevai.
- Plans: Monthly / Yearly (admin amounts).
- Pay online (Cashfree) **or** “hand cash to admin” claim.
- Admin **Cash received / confirm** → subscription activate / renew → seller gate open.
- Gateway paid → auto activate path (Cashfree subscription purpose).

Ithu buyer order payment-oda mix aaga koodathu.

---

## 10) Cans / empty can (ops logic — short)

- 20L style cans order-la issue aagalam (empty can count / deposit ledger).
- Buyer “cans ready” → seller collect workflow.
- Ithu payment module-oda separate ops track; bill money logic-oda confuse panna vendaam.

---

## 11) Regular order vs normal order

| Type | Business |
|------|----------|
| **Normal** | Oru date/time-ku one-shot delivery order. Dual payment choice apply aagum. |
| **Regular** | Week days + time repeat plan. Plan save; system later delivery orders create. Payment timing checkout cards mainly **normal** order-ku. |

---

## 12) Cancellation rules (buyer)

- Buyer **pending** order cancel panna mudiyum.
- Confirmed / processing / delivered — buyer cancel limit (seller/admin path).
- Canceled order **pay panna koodathu**.

---

## 13) Security / trust rules (business + tech)

1. Buyer **vera buyer** order create / pay panna koodathu.  
2. Payment amount server balance-ku over poga koodathu.  
3. Claim confirm **seller/admin only**.  
4. Cashfree secrets frontend-la illa.  
5. Card CVV / full card data app store panna koodathu (Cashfree handles).  
6. “I paid” button alone PAID aaga koodathu.

---

## 14) Happy path examples

### A) Classic water can (Pay After Delivery)

1. Buyer 2 cans cart-la add.  
2. Pay After Delivery select → Place order.  
3. Seller accept → deliver.  
4. Buyer Payments-la Cashfree or UPI claim.  
5. Seller UPI confirm / Cashfree auto → PAID.

### B) Prepaid (Pay Now)

1. Buyer Pay Now select → Pay now.  
2. Order create (UNPAID).  
3. Cashfree pay complete.  
4. Server verify → PAID.  
5. Seller delivery continue (order status).

### C) Partial UPI

1. Bill ₹500; buyer ₹200 claim.  
2. Seller confirm → PARTIALLY_PAID; balance ₹300.  
3. Later remaining pay → PAID.

---

## 15) What is NOT business-supported yet (honest)

- Checkout-la dedicated **COD button as separate gateway** (cash still post-delivery confirm).  
- Razorpay / PhonePe PG as separate stack (Cashfree reuse).  
- Pay Now-ku separate UPI claim UI (Phase later; post-delivery UPI already iruku).  
- Unverified frontend success → PAID mark (intentionally **not** allowed).

---

## 16) Document map (team share)

| Doc | Use |
|-----|-----|
| `APP_OVERVIEW_THANGLISH.md` | App who/what overview |
| `BUSINESS_LOGIC_THANGLISH.md` | **This file** — money & order rules |
| `MANUAL_TESTING_THANGLISH.md` | Test checklist |
| `PAYMENT_MODULE_READINESS_ANALYSIS.md` | Technical payment audit |

---

## 17) One-page cheat sheet

```
ORDER STATUS     = delivery workflow (pending → … → delivered)
PAYMENT STATUS   = money (UNPAID / PARTIAL / PAID)

Pay After Delivery = order first, money later
Pay Now            = order first, Cashfree now, PAID only after verify

UPI "I have paid"  = claim PENDING → seller confirm → money applied
Cashfree success   = server/webhook verify → money applied once

Subscription $     ≠ Order bill $
```

---

**Last updated:** Dual payment Phases 1–3 (paymentTiming + Cart Pay Now/After + Cashfree verify) live in source.  
Share this file as-is with business stakeholders; technical deep dive thevai na readiness analysis padunga.
