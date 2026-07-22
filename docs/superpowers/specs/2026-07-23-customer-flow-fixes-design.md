# Customer Flow Fixes Design

## Goal

Make the native customer app’s toggle, address, checkout/order, tracking, empty states, sounds, first-login profile capture, and Apple icon reliable and visually consistent with the customer web app.

## Boundaries

### UI parity

- Keep the Veg/Non-veg image selector fully clipped inside its pill while preserving the web dimensions and animation.
- Reuse the web `emptyplate.webp` artwork for empty favourites, empty previous orders, and other applicable empty states.
- Add native sound feedback for favourite add/remove and successful order placement, using bundled local audio and a safe no-op fallback when audio cannot load.
- Configure the requested Apple icon asset as the iOS app icon source and regenerate native assets.

### Address and profile data

- Normalize address form values before validation and submission.
- Refresh address state after create/update/delete/default changes and preserve checkout redirect behavior.
- During first login, collect a customer name when the authenticated profile has none, persist it with the customer record, and expose it to account/order surfaces.

### Checkout and order lifecycle

- Validate that cart entries, payment method, profile, and default address are present before submission.
- Make `createOrder` return a normalized saved order and update local order state only after the database write succeeds.
- Keep the cart until order persistence succeeds; show a readable error when it fails.
- Use a real `SectionList`/`ScrollView` data contract on Orders and preserve scrolling for current and previous orders.

### Tracking map

- Add a native map surface for the active order using restaurant and customer latitude/longitude when available.
- If coordinates or the native map provider are unavailable, show a deterministic route fallback with the two endpoints and an “open in maps” action.

## Data contracts

- Address: `{ id, label, line, landmark, phone, isDefault, lat, lng }`.
- Customer profile: `{ phone, name }`, with name optional until first-login capture completes.
- Order: normalized `items`, `deliveryAddress`, timestamps, totals, status, and payment method.
- Coordinates are nullable; missing coordinates never block order placement.

## Error handling

- Every remote mutation keeps the user’s local input/cart intact on failure.
- Empty arrays and nullable profile/address fields are normalized at context/data boundaries.
- Map failures never block order tracking; they switch to the fallback route view.
- Sound failures are swallowed after logging in development only.

## Verification

- Add unit tests for address normalization, profile-name capture rules, order payload normalization, and map endpoint fallback.
- Run the complete test suite and iOS export.
- Rebuild/install/launch the physical iPhone build and manually verify toggle, address save, checkout/order, order scrolling, empty artwork, sounds, first-login name, and map fallback.
