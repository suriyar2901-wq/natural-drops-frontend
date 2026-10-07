# UI Audit Report

## Scope and basis

App/build/commit: Natural Drops frontend, local uncommitted theme pass. Commit hash not recorded as the release id.
Audit date: 7 October 2026
Design system and adaptation version: Neo Design System 2.0 and `THEME_ADAPTATION.md`
Platforms, browsers, OS, locales and themes: source review plus Metro web bundle. Light theme, English. No browser viewport matrix, no iOS/Android device, no screen reader.
Inventory and exclusions: shared theme, Button, Card, Input, StatusPill, EmptyState, AppDialog, charts, tab headers, and the screens edited for emoji and the suggestion letter. Every other screen is covered only where it already consumes `colors` / `spacing` / `typography`. Water Can prototypes are out of scope.

## Coverage

| Screen/component | State/flow | Viewport/device | Zoom/font scale | Input/theme/locale | Result | Evidence |
|---|---|---|---|---|---|---|
| Theme tokens | source | n/a | default | light / en | Pass (source) | `src/theme/colors.ts`, `spacing.ts`, `typography.ts` |
| Button, Card, Input, dialog | source | n/a | default | light | Pass (source) | shared component files |
| Seller dashboard earnings | source only | not measured | default | light | Unverified | chart uses theme status colors and labels |
| Login, orders, users, more, suggestion | source | not measured | default | light | Unverified | emoji and black suggestion panel updated in source |
| 360, 768, 1024, 1440, zoom, keyboard, screen reader | not run | n/a | n/a | n/a | Unverified | no browser or device session |

## Findings and verification

| ID | Severity | Screen/state | Expected rule/token | Before actual | Fix + file:line | After actual | Evidence | Status |
|---|---|---|---|---|---|---|---|---|
| F1 | High | App theme | blue-600 `#0232AA`, canvas `#F4F5F6`, ink `#111111` | Primary `#4A90E2`, canvas `#F5F5F5` | `src/theme/colors.ts` | Tokens match Neo names | source | Source updated, render unverified |
| F2 | Medium | Buttons | Pill, 52px, white on blue | Smaller radius, purple secondary with white text | `src/components/common/Button.tsx` | Default 52, pill, tinted secondary | source | Source updated, render unverified |
| F3 | Medium | Inputs | 52px, radius 16, visible border, no emoji toggle | Shorter field, eye emoji | `src/components/common/Input.tsx` | Show/Hide, minHeight 52, border `#666A70` | source | Source updated, render unverified |
| F4 | Medium | Suggestion letter | Light surfaces | Full black page | `SuggestionLetterScreen.tsx` | Canvas and white card | source | Source updated, render unverified |
| F5 | Low | Finished controls | No emoji | Emoji in headers, menus, orders, users | Navigator, More, orders, users, profile | Ionicons or plain words | source | Remaining `✕` marks not fully removed |
| F6 | Low | Tab label | Caption 12/16 | 10px labels | `AppNavigator.tsx` `adminTabLabel` | 12 / 16 | source | Wrapping at narrow width unverified |
| F7 | Medium | Native type | Space Grotesk | System font | Web stylesheet in `App.tsx` | Web link only | source | Native font unverified |

## Contrast measurements

Rendered pairs were not measured in a browser. Token pairs intended to pass 4.5:1 for text:

| Element/state/theme | Foreground | Effective background | Ratio | Required | Result |
|---|---|---|---|---|---|
| Body text / light | `#111111` | `#FFFFFF` | not computed in browser | 4.5:1 | Unverified render; token pair is high contrast |
| Secondary text / light | `#666A70` | `#FFFFFF` | not computed in browser | 4.5:1 | Unverified render |
| Primary label / blue | `#FFFFFF` | `#0232AA` | not computed in browser | 4.5:1 | Unverified render |
| Warning text / tint | `#854A0E` | `#FFFAEB` | not computed in browser | 4.5:1 | Unverified render |
| Success text / tint | `#166534` | `#F0FDF4` | not computed in browser | 4.5:1 | Unverified render |
| Error text / tint | `#B42318` | `#FEF3F2` | not computed in browser | 4.5:1 | Unverified render |
| Decorative blue-300 | `#8EA6E6` | white | n/a | not for small text | Not used for body text |

## Validation

Commands/tools and versions where relevant: Metro web bundle request after the edits.
Automated results: bundle HTTP status recorded in the session; no Playwright, axe, or screenshot suite.
Manual visual, keyboard, screen-reader and touch checks: not run.
Screenshots and measurement artifact paths: none.
Files changed: `src/theme/*`, `App.tsx`, shared components listed above, navigator, and the screens named in the findings.
Behavior regressions checked: routes and button handlers were not retargeted. Runtime click-through was not repeated.

## Remaining issues and exceptions

| Item | Impact/reason | Evidence | Owner/next action | Acceptance authority if any |
|---|---|---|---|---|
| No rendered audit | Spacing, focus, and contrast can still fail on screen | This report | Refresh web and check Login, seller Dashboard, Orders, More at 390 and 1440 | Product owner |
| Native Space Grotesk | Android/iOS may still show the system font | `App.tsx` loads the font only on web | Bundle the OFL font files if native must match | Product owner |
| Local style overrides | Some buttons and cards keep old radius or hex colors | screen StyleSheets | Follow-up pass on remaining hardcoded colors | Product owner |
| Close glyphs `✕` | A few dialogs still use a text close mark | Bill edit, create buyer, order cancel | Replace with Ionicons and an accessible name | Product owner |
| Tab bar height | `minHeight` 64 plus safe area, not a fixed 72 | `AppNavigator.tsx` | Keep, so the home indicator is not clipped | Recorded exception |

## Readiness decision

Status: Incomplete verification

Exact scope covered: shared tokens and the shared components and screens edited in source. Business routes and data behavior were preserved in code review only.

Unverified platforms/states and remaining blockers: browser layout, keyboard focus, zoom, screen reader, Android, iOS, and dark mode (not supported).

What this report does not certify: backend correctness, security, WCAG conformance, or production readiness.
