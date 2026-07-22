# Native Customer Parity Checklist

Reference app: `/Users/vardhanreddy/Desktop/smartrestsuperadmin/smartrestaicustomer`  
Native app: `/Users/vardhanreddy/Desktop/smartrestsuperadmin/smartrestaimobile`

## Shared decisions

- [ ] Brand splash matches `components/customer/BrandedSplash.jsx` and `public/bannerlogin.png`.
- [ ] Notification and foreground-location permission onboarding has explanatory copy, denial recovery, and manual fallback.
- [ ] The web image toggle artwork, labels, colors, dimensions, and motion match.
- [ ] The top category row contains exactly Mandi, Starters, Rotis, Desserts in that order.
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
