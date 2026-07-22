# Native Customer Parity Checklist

Reference app: `/Users/vardhanreddy/Desktop/smartrestsuperadmin/smartrestaicustomer`  
Native app: `/Users/vardhanreddy/Desktop/smartrestsuperadmin/smartrestaimobile`

## Shared decisions

- [x] Startup splash uses a white native background; branded onboarding follows after hydration.
- [x] Notification and foreground-location permission onboarding has explanatory copy, denial recovery, and manual fallback.
- [x] The web image toggle artwork, labels, colors, dimensions, and motion match.
- [x] The top category row contains exactly Mandi, Starters, Rotis, Desserts in that order.
- [ ] Empty categories remain visible and show a useful empty state.
- [ ] Cached menu appears before a network refresh and startup has a bounded fallback.

## Route parity

| Web route | Native destination | Visual | Behavior | Loading/empty/error | Manual result |
| --- | --- | --- | --- | --- | --- |
| `/` | `Home` | [ ] | [ ] | [ ] | |
| `/login` | `Login` | [ ] | [ ] | [ ] | |
| `/checkout` | `Checkout` | [ ] | [ ] | [ ] | |
| `/addresses` | `Addresses` | [ ] | [ ] | [ ] | |
| `/payment-methods` | `PaymentMethods` | [ ] | [ ] | [ ] | |
| `/favorites` | `Favorites` | [ ] | [ ] | [ ] | |
| `/orders` | `Orders` | [ ] | [ ] | [ ] | |
| `/notifications` | `Notifications` | [ ] | [ ] | [ ] | |
| `/help` | `Help` | [ ] | [ ] | [ ] | |
| `/account` | `Account` | [ ] | [ ] | [ ] | |

## Home and menu

- [ ] Non-veg toggle state shows the complete menu.
- [ ] Veg toggle state filters recommended cards, sections, search results, and suggestions.
- [ ] Mandi scrolls to its mapped section.
- [ ] Starters scrolls to its mapped section.
- [ ] Rotis scrolls to its mapped section.
- [ ] Desserts scrolls to its mapped section.
- [ ] Product cards match web image ratio, badges, price treatment, favourite control, sold-out state, and quantity stepper.
- [ ] Restaurant profile/disclaimer matches the reference.

## Permission and push matrix

- [ ] Clean install: notification prompt appears after explanation.
- [ ] Clean install: location prompt appears after explanation.
- [ ] Notification denied: app remains usable and exposes Settings recovery.
- [ ] Location denied: manual address entry remains usable.
- [ ] Location granted: resolved address requires confirmation before use/save.
- [ ] Push arrives while app is foregrounded.
- [ ] Push opens the transient notification sheet from background.
- [ ] Offer push opens the offer/checkout route from terminated state.

## Verification log

Record device, build, date, and any known limitation here after the implementation tasks complete.

- 2026-07-23: `npm test` passed (21/21); `npx expo export --platform ios` passed; physical iPhone `00008140-000A044C027B001C` built with Xcode 26.6, installed, and launched successfully. Expo Doctor still reports only the local CocoaPods PATH check; `pod install` itself completed successfully.
- 2026-07-23 (customer-flow-fixes plan, Tasks 3–6): `npm test` passed (45/45, up from 21 — added vegToggle, sounds, orderSubmission, and orderTrackingMap suites) after every task; `npx expo export --platform ios` passed cleanly after each of the four commits. This pass ran in a sandboxed execution environment without a full Xcode toolchain (`xctrace`/device tooling unavailable) or CocoaPods (`pod` not installed) — `expo prebuild`, `pod install`, the physical-device build/install, and the manual on-device verification steps (toggle clipping, address save, checkout/order success, order scrolling, sound feedback, first-login name, map "Open in Maps" link) were **not** run here and still need a pass on the machine that has Xcode + CocoaPods configured, same as the entry above. Also fixed a live bug found outside this plan while testing: `menu_categories.image_url` values seeded for the web app (e.g. "/mandi9.png") aren't valid React Native Image sources, so the four home category tiles were rendering blank — `getPrimaryCategories` now only trusts absolute http(s) URLs and falls back to the bundled category art otherwise.
