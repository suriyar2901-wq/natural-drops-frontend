# Natural Drops — Full Manual Testing Guide (Tanglish)

Ithu ungalukku **full application** manual testing pannura checklist.  
Pass / Fail / Notes column-la mark pannunga.

**Environments**
- Local FE: `http://localhost:8081` (Expo web / `npm start`)
- Local BE: `http://localhost:8080` (`mvn spring-boot:run`, profile `local`)
- Live FE: `https://natural-drops-frontend.vercel.app`
- Live BE: `https://natural-drops.onrender.com`

**Roles**
1. **Admin** — platform manage
2. **Seller** — shop / orders / subscription
3. **Buyer** — shop / cart / pay bills

**Pass criteria tip:** Expected result varaikkum wait pannunga; screenshot edunga fail aana.

---

## 0) Setup before testing

- [ ] BE run aagudha? Health / login API work aagudha?
- [ ] FE open aagudha?
- [ ] Cashfree local: `application-local.properties`-la `cashfree.client-id` + `client-secret` set + BE **restart**
- [ ] Cashfree Render (production): Environment-la `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`, `CASHFREE_ENV`, `FRONTEND_BASE_URL` / `app.base-url` set
- [ ] Test accounts ready: 1 admin, 1–2 sellers, 2 buyers (oru seller company code-ku link)
- [ ] Seller Shop Profile-la UPI ID / QR irukka (buyer UPI test-ku)
- [ ] Admin → Platform payment-la platform UPI/QR irukka (seller cash/UPI guidance-ku)

---

## 1) Auth & account create

### 1.1 Login
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| A1 | Correct admin username/password | AdminApp Dashboard | ☐ |
| A2 | Correct seller login | Seller Dashboard (or Subscribe gate) | ☐ |
| A3 | Correct buyer login | Buyer Shop tab | ☐ |
| A4 | Wrong password | Error, login fail | ☐ |
| A5 | Inactive account | Account inactive screen / message | ☐ |
| A6 | Logout | Login screen | ☐ |

### 1.2 Register — Seller
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| R1 | Seller role, shop name, 12-digit Aadhaar, valid phone, address, 6-digit pincode | Success (or “try Login” if network slow) | ☐ |
| R2 | Pincode auto-fill fail aana city/district/state manual fill → submit | Account create aaganum; false “Failed” mattum varakudadhu | ☐ |
| R3 | Same username again register | “already exists / go to Login” | ☐ |
| R4 | Create aana username/password-la login | Login success | ☐ |
| R5 | New seller login | **Subscribe to continue** gate varanum (canWork false) | ☐ |

### 1.3 Register — Buyer
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| B1 | Buyer + valid seller **company code** | Account create + seller-ku link | ☐ |
| B2 | Wrong / empty company code | Validation error | ☐ |
| B3 | Login → Shop | Linked seller products mattum | ☐ |

### 1.4 Forgot / Reset / Change password
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| P1 | Forgot password + registered email | Mail / success message | ☐ |
| P2 | Reset link-la new password | Login new password-la work | ☐ |
| P3 | Profile → Change password | Old→new work; old fail | ☐ |

---

## 2) Admin testing

Tabs: **Dashboard · Subscriptions · Subscription Payments · Manage Sellers · More**

### 2.1 Dashboard
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| AD1 | Open Dashboard | Sellers / revenue / active / expiring / pending counts | ☐ |
| AD2 | Recent payments / renewals section | Data load / empty state clear | ☐ |

### 2.2 Manage Sellers
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| AS1 | Add Seller (FREE or paid plan) | Seller create + login details | ☐ |
| AS2 | Seller list → Detail | Profile, subscription dates, payments | ☐ |
| AS3 | Edit seller | Changes save | ☐ |
| AS4 | Deactivate / Reactivate | Login block / allow | ☐ |
| AS5 | Activate payment (CASH / UPI / GATEWAY) | Subscription ACTIVE + dates set | ☐ |
| AS6 | Renew Monthly / Yearly | Expiry extend; ledger entry | ☐ |
| AS7 | Edit start / expiry dates | Dates update correctly | ☐ |

### 2.3 Subscriptions & Payments list
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| AP1 | Subscriptions filters: Active / Expiring / Expired / Pending | Correct lists | ☐ |
| AP2 | Subscription Payments list | Seller subscription payments only (buyer bills illa) | ☐ |
| AP3 | CSV export (irundha) | File download | ☐ |

### 2.4 Platform payment (More → Platform payment QR)
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| AQ1 | Set platform UPI + QR + plan amounts | Save success | ☐ |
| AQ2 | Seller hand-cash request varum | Pending claim list-la theriyanum | ☐ |
| AQ3 | **Cash received** click | Seller subscription activate; seller gate remove | ☐ |
| AQ4 | Reject claim | Seller pending clear; still blocked if unpaid | ☐ |

### 2.5 App Settings
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| ST1 | Monthly / Yearly plan amount change | Seller pay screen-la new amount | ☐ |
| ST2 | Subscription required ON/OFF | Gate appear / disappear | ☐ |
| ST3 | Tax / platform fee enable + amount | Buyer cart total change | ☐ |
| ST4 | Support phone / WhatsApp / email | Save + show where used | ☐ |

### 2.6 More → Orders / Products / Users
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| AM1 | Order management open | Orders list | ☐ |
| AM2 | Menu / products manage | CRUD / stock | ☐ |
| AM3 | Users list | Users visible | ☐ |
| AM4 | Notifications bell | History open | ☐ |

---

## 3) Seller testing

Tabs: **Dashboard · Orders · Products · Customers · More**

### 3.1 Subscription gate & pay (IMPORTANT)
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| SS1 | Unpaid / expired seller login | Full-screen **Subscribe to continue** | ☐ |
| SS2 | Plan Monthly / Yearly select | Amount update | ☐ |
| SS3 | **Pay online (Cashfree)** | Gate hide → Cashfree open (blank thank-you-la stuck aagakudadhu) | ☐ |
| SS4 | Sandbox pay success | Fast return app-ku; subscription **Active**; start/end date; gate remove; app use pannalam | ☐ |
| SS5 | **Paid by hand cash** | Waiting for admin confirmation screen | ☐ |
| SS6 | Admin Cash received | Seller auto unlock (poll ~few sec) | ☐ |
| SS7 | Pending cash irukka → Pay online | Block / clear message | ☐ |
| SS8 | More → **Subscription** (already active) | Status, **start date**, **end date**, days left, **history**, Renew button — false “Success active” popup varakudadhu | ☐ |
| SS9 | Renew via Cashfree | History-la new payment; end date extend | ☐ |
| SS10 | “Pay with admin UPI/QR” | **Illa** — remove aagirukkanum | ☐ |

### 3.2 Shop Profile / QR
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| SP1 | Business name, address save | Save OK | ☐ |
| SP2 | UPI ID set | Buyer payments-la UPI theriyum | ☐ |
| SP3 | QR generate / upload | Show in profile + buyer pay | ☐ |

### 3.3 Products
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| PR1 | Add product (name, price, stock, image) | List-la appear | ☐ |
| PR2 | Edit / disable stock | Buyer shop reflect | ☐ |
| PR3 | Delete / hide | Buyer-ku theriyadhu | ☐ |

### 3.4 Customers / buyers
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| SC1 | Add shop customer | Ledger customer create | ☐ |
| SC2 | Record shop payment | Balance update | ☐ |
| SC3 | Create / list app buyers | Company code share work | ☐ |

### 3.5 Orders flow
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| SO1 | New order notification | Badge / list | ☐ |
| SO2 | Confirm → Processing → On the way → Delivered | Status each step | ☐ |
| SO3 | Cancel order | Status canceled | ☐ |
| SO4 | Bill / final amount | Bill show / PDF if any | ☐ |
| SO5 | Phone order create | Order create for customer | ☐ |
| SO6 | Regular orders filter | Regular orders visible | ☐ |

### 3.6 Buyer bill claims (More → Buyer bill payments)
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| SB1 | Buyer UPI “I have paid” claim | Pending list-la | ☐ |
| SB2 | Confirm | Order paid / partial | ☐ |
| SB3 | Reject | Claim rejected; bill unpaid | ☐ |

### 3.7 Water cans
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| CN1 | Water can management — stock add/remove | Stock numbers correct | ☐ |
| CN2 | Issue / return cans for customer | Customer holding update | ☐ |
| CN3 | Daily can collection report | Date filter + counts | ☐ |
| CN4 | Buyer “cans ready for pickup” | Seller notification / inbox | ☐ |

### 3.8 Map / Dashboard / Profile
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| SM1 | Map open | Map load | ☐ |
| SM2 | Dashboard stats | Orders / reminder CTA | ☐ |
| SM3 | Profile + company code | Code copy / show | ☐ |

---

## 4) Buyer testing

Tabs: **Shop · Orders · Payments · Profile**

### 4.1 Shop & Cart
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| BY1 | Shop catalog | Linked seller products mattum | ☐ |
| BY2 | Product detail → Add cart | Cart count | ☐ |
| BY3 | Cart totals | Item + tax + platform fee + delivery (settings base-la) | ☐ |
| BY4 | Place order | Order create; seller-ku theriyum | ☐ |
| BY5 | Save as Regular order (days + time) | Regular plan save | ☐ |

### 4.2 Orders
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| BO1 | Active / completed lists | Correct orders | ☐ |
| BO2 | Cancel pending | Cancel OK | ☐ |
| BO3 | Payment badge UNPAID / PARTIAL / PAID | Correct | ☐ |
| BO4 | Bill PDF / detail | Open | ☐ |
| BO5 | Regular filter / edit regular | Edit → cart / profile card | ☐ |

### 4.3 Payments (IMPORTANT)
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| BP1 | Select **one** unpaid bill → Pay online Cashfree | Gateway open | ☐ |
| BP2 | Pay success | Bill paid / partial; **fast** return app; amount reflect | ☐ |
| BP3 | Multi bill select → Cashfree | “One bill at a time” / UPI path | ☐ |
| BP4 | GPay / UPI (phone) | UPI app / QR; then I have paid | ☐ |
| BP5 | Desktop GPay click | Cashfree / QR path — “No Apps available” varakudadhu | ☐ |
| BP6 | Optional UTR save | Seller claim-la ref | ☐ |
| BP7 | Seller confirm apram | Unpaid → Paid | ☐ |

### 4.4 Regular order & Empty cans & Profile
| # | Steps | Expected | Result |
|---|--------|----------|--------|
| BR1 | Profile → Regular order pause / resume / skip | Status change | ☐ |
| BR2 | Empty cans holding + “ready for pickup” | Seller notify | ☐ |
| BR3 | Edit delivery address | Save; next order-la use | ☐ |
| BR4 | Buyer QR / company code | Show | ☐ |

---

## 5) End-to-end happy paths (must run)

### E2E-1: New seller → Cashfree subscribe → sell
1. Register seller → login → gate  
2. Pay online Monthly → success → gate clear  
3. Add product → buyer order → confirm → deliver  
4. More → Subscription → history + dates check  

### E2E-2: Seller hand cash
1. Gate → Hand cash → waiting screen  
2. Admin Platform payment → Cash received  
3. Seller app unlock  

### E2E-3: Buyer Cashfree bill
1. Delivered / billed unpaid order  
2. Buyer Payments → Cashfree → success  
3. Order shows paid; seller ledger OK  

### E2E-4: Buyer UPI + seller confirm
1. Buyer UPI pay + I have paid  
2. Seller Buyer bill payments → Confirm  
3. Bill paid  

### E2E-5: Admin renew seller
1. Seller Detail → Renew Yearly GATEWAY/CASH  
2. Expiry extend; Payment list entry  

---

## 6) Regression / “don’t break old”

- [ ] Old already-subscribed seller login — gate **varakudadhu**
- [ ] Admin dashboard colors / sellers list still work
- [ ] Buyer shop only linked seller
- [ ] Regular order scheduler / tomorrow reminder (next-day check)
- [ ] Notifications badge admin/seller/buyer
- [ ] Logout everywhere clean

---

## 7) Known config checks (fail aana env issue, code illa)

| Symptom | Check |
|---------|--------|
| “Cashfree is not configured…” | BE env / `application-local.properties` + restart |
| Blank Cashfree thank-you, slow return | `app.base-url` / `FRONTEND_BASE_URL` correct FE URL + return_url deploy |
| History empty but UI ok | `/shop/subscription/payments` BE deployed? |
| Gate covers Cashfree | Should hide on Subscription pay screen |
| More page crash `Cannot access 'v'` | FE TDZ fix deployed? |

---

## 8) Test sign-off

| Area | Tester | Date | Pass? | Notes |
|------|--------|------|-------|-------|
| Auth | | | ☐ | |
| Admin | | | ☐ | |
| Seller + Subscription | | | ☐ | |
| Buyer + Payments | | | ☐ | |
| E2E 1–5 | | | ☐ | |

**Build / URL tested:** _______________________  
**Cashfree env (SANDBOX / PRODUCTION):** _______________________  

---

Tip: Oru round-la **happy path** first (E2E), apram edge cases (reject, partial pay, expired, multi-bill). Fail aana **role + screen + steps + screenshot + time** note pannunga.
