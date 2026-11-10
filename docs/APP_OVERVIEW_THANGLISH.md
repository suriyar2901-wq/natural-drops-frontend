# Natural Drops — Application Overview (New people-ku easy guide)

Ithu **code deep dive illa**.  
Oru puthiya person app open pannina / business flow ketta — **epdi work aaguthu** clear-ah theriya intha document padunga.

---

## 1) Ithu enna app?

**Natural Drops** = water can / shop delivery business-ku digital platform.

| Who | App-la enna pannuvaanga |
|-----|-------------------------|
| **Admin** | Platform owner. Sellers create/manage, subscription money, settings (fees, plans). |
| **Seller** | Oru water shop. Products, orders, buyers, cans, bills confirm. |
| **Buyer** | Customer. Shop-la order pottu, bill pay pannuvaanga. |

**Simple story:**  
Admin sellers-ah onboard pannuvaanga → Seller shop run pannuvaanga → Buyer order + pay pannuvaanga.

---

## 2) Big picture (oru diagram)

```
                    ┌─────────────┐
                    │   ADMIN     │
                    │  platform   │
                    └──────┬──────┘
           sellers create  │  subscription confirm (cash)
           settings/fees   │  renew / deactivate
                           ▼
              ┌────────────────────────┐
              │        SELLER          │
              │  shop + products       │
              │  orders + cans         │
              │  must pay subscription │
              └────────────┬───────────┘
         company code /    │    confirm buyer UPI bills
         products/orders   │
                           ▼
              ┌────────────────────────┐
              │        BUYER           │
              │  shop → cart → order   │
              │  pay bill (Cashfree/UPI)│
              └────────────────────────┘
```

**Tech (high level)**
- **Frontend:** React Native / Expo (web + mobile) — Vercel / local
- **Backend:** Spring Boot Java — Render / local `:8080`
- **DB:** PostgreSQL
- **Online pay:** Cashfree (sandbox / production)

---

## 3) Moonu role — easy explanation

### 3.1 Admin (boss)
Admin app open panna tabs roughly:

- **Dashboard** — overall numbers (sellers, money, expiring subs)
- **Subscriptions** — which seller active / pending / expired
- **Subscription Payments** — seller subscription money ledger
- **Manage Sellers** — add seller, edit, deactivate, renew, set dates
- **More** — Orders, Products, Users, **Platform payment QR**, App Settings, Profile

**Admin important power**
1. Seller create / stop
2. Seller subscription activate / renew (cash, UPI, gateway)
3. Seller “hand cash kuduthuten” request → **Cash received** mark pannina seller unlock
4. Plan amount, tax, platform fee settings

---

### 3.2 Seller (shop owner)
Seller login panna:

```
Login
  │
  ├─ Subscription unpaid / expired? ──► GATE popup
  │         │
  │         ├─ Pay online (Cashfree) ──► auto unlock
  │         └─ Hand cash ──► Admin confirm ──► unlock
  │
  └─ Paid / active ──► normal app
           Dashboard | Orders | Products | Customers | More
```

**Seller without subscription = app use panna mudiyathu** (gate block).  
Ithu platform fee / rent maari think pannunga.

**Seller daily work**
1. Products add / price / stock
2. Orders confirm → process → on the way → deliver
3. Buyer UPI bill claims confirm / reject
4. Empty cans track
5. Shop Profile-la **UPI + QR** (buyer pay-ku thevai)
6. More → **Subscription** — start/end date, history, renew

**Company code:**  
Seller-ku oru code. Buyer register-la athai enter pannina → antha seller shop-ku mattum link aagum.

---

### 3.3 Buyer (customer)
Buyer login → tabs:

- **Shop** — linked seller products mattum
- **Orders** — status, cancel (pending), regular orders
- **Payments** — unpaid bills pay
- **Profile** — address, regular order, empty cans, password

**Buyer order flow**
```
Shop → Add cart → Cart (tax/fee/delivery) → Place order
        │
        └─ optional: Save as Regular order (weekly schedule)
```

**Buyer pay flow**
```
Payments → select unpaid bill
   │
   ├─ Pay online Cashfree (ONE bill) ──► success = auto paid
   └─ GPay / UPI + “I have paid” ──► Seller confirm apram paid
```

---

## 4) Core business logics (romba important)

### 4.1 Seller ↔ Buyer link
- Buyer register-la **company code** compulsory
- Apram buyer **antha seller products / orders / bills** mattum paanga
- Oru buyer oru seller-ku link (linked seller)

### 4.2 Seller subscription (platform access)
| Status | Meaning | App |
|--------|---------|-----|
| Pending / Expired | Money illa / date pochu | Gate block |
| Active | Paid, date valid | Full seller app |
| Free | Admin FREE plan | Work pannalam |

**Pay methods**
1. **Cashfree online** — success aana system auto activate / renew (admin wait illa)
2. **Hand cash** — seller request → admin **Cash received** → activate
3. **Admin side renew** — admin seller detail-la manually renew

**Subscription screen (More → Subscription)**
- Current plan, **start date**, **end date**, days left
- Payment **history**
- Renew / extend option

### 4.3 Order lifecycle (seller side)
Typical path:

`pending → confirmed → processing → on the way → delivered`  
(or `canceled`)

Delivered / billed orders-ku **payment** buyer side-la varum.

### 4.4 Bill payment (buyer → seller)
Two rails:

| Method | Who confirms | Result |
|--------|--------------|--------|
| **Cashfree** | System (Cashfree PAID) | Order paid / partial auto |
| **UPI claim** | **Seller** confirms | Paid after seller OK |

**Rule:** Cashfree = **oru bill at a time**.  
Multiple bills same time = UPI “I have paid” path.

### 4.5 Pricing (cart total)
Buyer cart roughly:

```
Items total
+ Tax (admin setting)
+ Platform fee (admin setting, if on)
+ Delivery charge (seller per-km / settings)
= Pay amount
```

### 4.6 Regular (recurring) orders
- Buyer cart-la “regular order” save pannalam (days + time)
- System schedule padhi order create / reminder
- Buyer pause / resume / skip pannalam
- Seller orders-la REGULAR filter paanga

### 4.7 Empty cans
- Water business-la empty can return important
- Buyer holding count + “ready for pickup”
- Seller can stock / issue / return / daily collection report

---

## 5) Payment systems — clear map

```
                    CASHFREE
         ┌────────────┴────────────┐
         │                         │
  Seller subscription         Buyer bill
  (platform fee)              (shop bill)
         │                         │
    auto activate              auto mark paid
    on PAID                    on PAID


                    MANUAL / UPI
         ┌────────────┴────────────┐
         │                         │
  Seller hand cash            Buyer UPI claim
  → Admin confirm             → Seller confirm
```

**Remember**
- Seller subscription money → **Admin / platform**
- Buyer bill money → **Seller shop**
- Ithu rendu different pockets

---

## 6) Screens map (quick)

### Admin
| Screen | Purpose |
|--------|---------|
| Dashboard | Overview numbers |
| Subscriptions | Seller sub status |
| Subscription Payments | Money ledger |
| Manage Sellers | CRUD + renew |
| Platform payment | UPI/QR + cash claims |
| App Settings | Plans, tax, fees, support |
| Orders / Products / Users | Platform ops |

### Seller
| Screen | Purpose |
|--------|---------|
| Gate (popup) | Must subscribe |
| Subscription | Status, dates, history, renew |
| Orders | Fulfill delivery |
| Products | Catalog |
| Customers | Ledger + buyers |
| Buyer bill payments | Confirm UPI |
| Water cans / collection | Can ops |
| Shop Profile | UPI/QR/business |

### Buyer
| Screen | Purpose |
|--------|---------|
| Shop / Product / Cart | Order place |
| Orders | Track |
| Payments | Pay bills |
| Profile | Address, regular, cans |

---

## 7) Data flow (oru example)

**Example: Mohan Aquva shop + RAM buyer**

1. Admin / self-register → Seller “Mohan Aquva” create  
2. Seller subscription pay (Cashfree or admin cash) → can work  
3. Seller products add (20L can ₹50…)  
4. Buyer RAM register + company code  
5. RAM shop-la order  
6. Seller confirm → deliver → bill  
7. RAM Payments-la Cashfree / UPI  
8. Paid aana order closed  

---

## 8) New developer / new teammate — padikka order

1. Ithu document (overview) — **first**  
2. `docs/MANUAL_TESTING_THANGLISH.md` — how to test  
3. Frontend: `src/navigation/AppNavigator.tsx` — which screen which role  
4. Backend: `controller` packages — `/api/auth`, `/api/shop`, `/api/orders`, `/api/payments`, `/api/admin`  
5. Cashfree: `CashfreePaymentService` + FE `cashfreeCheckout`  

**Local run**
- BE: `Natural-Drops` → `mvn spring-boot:run` (profile `local`)  
- FE: `natural-drops-frontend` → `npm start`  
- Secrets: `application-local.properties` (**gitignored** — push aagathu)

---

## 9) Common confusion — clear answers

| Confusion | Truth |
|-----------|--------|
| Seller login aanalum app use aagala | Subscription gate — pay pannanum |
| Buyer ella shops-um paanga? | Illa — linked seller mattum |
| Cashfree pay success but thank-you blank | Return URL / FE base URL config |
| “I have paid” apram bill unpaid | Seller/Admin confirm pending |
| Admin Cash received enna | Seller hand-cash subscription approve |
| Subscription Payments list-la buyer bill? | Illa — seller platform payments mattum |
| application-local.properties push? | **No** — gitignore |

---

## 10) One-line summary

> **Admin** platform manage pannuvaanga; **Seller** subscription kuduthu shop run pannuvaanga; **Buyer** antha shop-la order pottu bill pay pannuvaanga — online Cashfree auto, manual UPI/cash confirm vendiya idathula.

---

**Related docs**
- Manual testing checklist: `docs/MANUAL_TESTING_THANGLISH.md`

Questions / doubt irundha: oru flow pick pannunga (ex: “seller subscribe”) — athu step-by-step screen padhi explain pannalam.
