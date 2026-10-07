# Theme adaptation

Neo Design System 2.0, 7 October 2026. Applied to the Natural Drops Expo / React Native app (`natural-drops-frontend`). Water Can HTML prototypes were not restyled.

## Platform and stack

- Expo 54, React Native, React Navigation 7, React Native Web (Metro, port 8081).
- Styling is `StyleSheet` plus shared objects in `src/theme`.
- One light theme. There was no app-wide dark or high-contrast mode. The Suggestion screen’s local black panel was converted to the light theme.

## Screen inventory

Auth: Splash, Login, Register, Forgot / Reset / Change password, Account inactive.

Buyer: Shop, Cart, My Orders, My Payments, Profile, Map, QR, Empty cans.

Seller / admin shell: Dashboard, Orders, Products, Customer ledger, More, plus stack screens for sellers, users, subscriptions, payments, shop profile, phone order, water-can management, can reports, and customer detail.

Shared overlays: app dialog, bill edit, date and delivery modals, create-buyer modal.

Routes, labels’ meaning, and data behavior were kept. Navigation destinations were not added or removed.

## Token location

| Layer | File |
|---|---|
| Color | `src/theme/colors.ts` |
| Spacing, radius, shadow | `src/theme/spacing.ts` |
| Type | `src/theme/typography.ts` |
| Barrel | `src/theme/index.ts` |

`comfortableColors.ts` is a legacy palette. Its brand values now match Neo blue. New screens should use `colors`.

## Font and icons

- Web loads Space Grotesk (400–700) from Google Fonts in `App.tsx`, with Inter and system-ui fallback.
- Native builds still use the platform fallback until Space Grotesk files are bundled. That is unverified on a device.
- Icons stay Ionicons outline/filled. No new icon package. Header bell and phone, profile photo, delivery date, and inactive-account mark now use Ionicons instead of emoji.

## Layout profiles

Existing phone-first tabs and stacked screens stay. Desktop is the same responsive web layout, not a new 1200px shell. Bottom tabs use a white bar, 1px top border, and `minHeight: 64` so React Navigation can still add the safe area. A fixed 72px height was not forced.

## Component variants

| Component | Treatment |
|---|---|
| `Button` | Pill, 52px default height, 44px small, blue primary, tinted secondary, 2px outline. Disabled uses gray-200 and readable gray, not a faded blue. Loading keeps the label. |
| `Card` | White, radius 20, 16 padding, 1px subtle border, light shadow. |
| `Input` | Persistent label, gray fill, radius 16, 52px min height, control-colored border, 2px blue focus. Password toggle is Show / Hide. |
| `StatusPill`, `EmptyState`, `AppDialog` | Status tints, pill actions, dialog radius 20 and 52px actions. |
| Charts | Orders use blue-600, subscriptions blue-500. Earnings keep Paid / Partial / Due as success, warning, and blue, with text labels. |

## Theme modes and locales

Light only. Locale remains the app’s existing English UI and Indian rupee formatting. No RTL layout was added.

## Approved overrides and assumptions

- Existing feature names, order statuses, and payment words stay.
- Financial chart colors stay meaningful (green paid, brown partial, blue due) instead of a single blue series.
- `Button` size `small` is 44px, not 52px, so dense rows do not grow without a product request.
- Some screens still pass local `style` overrides (radius, color). Those win over the shared component.
- Emoji was removed from visible controls that were edited. A few close marks (`✕`) and video labels remain.

## Unverified

Native font rendering, tablet split view, screen reader, 200% text, and every route at 360 / 768 / 1440 were not measured in a browser or device during this pass.
