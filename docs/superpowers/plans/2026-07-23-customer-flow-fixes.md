# Customer Flow Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the native customer app’s toggle, address, checkout/order, tracking, empty states, sounds, first-login name capture, and Apple icon reliable and web-parity accurate.

**Architecture:** Normalize remote and persisted data at context/data boundaries, keep checkout mutations transactional from the user’s perspective, and isolate map/audio/UI behavior behind small helpers. Native screens consume stable arrays and nullable-safe records, while map and sound failures degrade without blocking ordering.

**Tech Stack:** Expo SDK 57, React Native, React Navigation, Supabase, AsyncStorage, Expo Image, Expo AV/audio, native iOS assets, Node test runner.

## Global Constraints

- Preserve existing customer web visual language and the exact Mandi/Starters/Rotis/Desserts category order.
- Do not discard cart/address input when a remote mutation fails.
- Coordinates remain nullable and must never block order placement.
- Keep existing push/onboarding behavior intact.
- Use `apply_patch` for source edits and preserve unrelated untracked files.

---

### Task 1: Normalize addresses and customer profile data

**Files:**
- Modify: `src/lib/customerData.js`
- Modify: `src/context/AddressContext.js`
- Modify: `src/context/AuthContext.js`
- Create: `src/lib/customerProfile.mjs`
- Test: `tests/customerProfile.test.mjs`

**Interfaces:**
- `normalizeAddressInput(value)` returns a complete address object with trimmed strings and nullable coordinates.
- `normalizeCustomerProfile(row)` returns `{ phone, name }` with a blank name when absent.
- `needsCustomerName(profile)` returns a boolean.

- [ ] Write failing tests for trimming address fields, nullable coordinates, and missing-name detection.
- [ ] Run `node --test tests/customerProfile.test.mjs` and confirm failure.
- [ ] Implement the helpers and use them in address create/update and customer profile hydration.
- [ ] Make address refresh state after every successful mutation and keep the sheet open on failure.
- [ ] Run the focused tests and confirm pass.
- [ ] Commit `fix: normalize customer and address data`.

### Task 2: Capture the customer name during first login

**Files:**
- Modify: `src/screens/LoginScreen.js`
- Modify: `src/context/AuthContext.js`
- Modify: `src/lib/customerData.js`
- Create: `src/screens/CustomerNameScreen.js`
- Test: `tests/customerProfile.test.mjs`

**Interfaces:**
- `upsertCustomer(phone, { name })` persists the normalized name without overwriting a non-empty existing name.
- `CustomerNameScreen` calls `onComplete(name)` only for a non-empty name.

- [ ] Add tests for blank-name rejection and preserving an existing name.
- [ ] Add the name prompt after OTP verification only when the profile has no name.
- [ ] Save the name, update auth context, then navigate to the intended destination.
- [ ] Preserve checkout redirect parameters through the name step.
- [ ] Run focused tests and commit `feat: capture customer name on first login`.

### Task 3: Fix toggle clipping, empty-state artwork, and native icon assets

**Files:**
- Modify: `src/components/VegToggle.js`
- Modify: `src/components/EmptyState.js`
- Modify: `src/screens/FavoritesScreen.js`
- Modify: `src/screens/OrdersScreen.js`
- Modify: `src/screens/CheckoutScreen.js`
- Add binary: `assets/emptyplate.webp`
- Add binary/config: Apple icon source asset and `app.json`

**Interfaces:**
- Veg toggle keeps its animated knob inside a clipped track at both positions.
- EmptyState accepts `imageSource` and renders the supplied artwork above the existing copy.

- [ ] Copy `smartrestaicustomer/public/emptyplate.webp` into `assets/emptyplate.webp`.
- [ ] Add a failing component-level contract test or pure layout constants test for knob bounds.
- [ ] Set `overflow: "hidden"`, explicit inner bounds, and stable icon sizing on the toggle.
- [ ] Pass the emptyplate image to favourites, previous orders, and basket-empty states.
- [ ] Configure the requested Apple icon source in Expo config and regenerate native assets.
- [ ] Run export and commit `feat: restore native empty states and branding assets`.

### Task 4: Add safe native interaction sounds

**Files:**
- Create: `src/lib/sounds.mjs`
- Modify: `src/context/FavoritesContext.js`
- Modify: `src/screens/CheckoutScreen.js`
- Add binary: bundled favorite and order success audio files
- Test: `tests/sounds.test.mjs`

**Interfaces:**
- `playFavoriteAddedSound()` and `playFavoriteRemovedSound()` resolve without throwing.
- `playOrderSuccessSound()` resolves without throwing and is safe when audio is unavailable.

- [ ] Add tests using an injected audio adapter for success and failure paths.
- [ ] Implement a lazy-loading sound helper with a no-op fallback.
- [ ] Trigger add/remove sounds after the favorite state transition and order sound only after persistence succeeds.
- [ ] Run tests and commit `feat: add customer interaction sounds`.

### Task 5: Make address checkout and order placement transactional

**Files:**
- Modify: `src/context/AddressContext.js`
- Modify: `src/context/OrdersContext.js`
- Modify: `src/screens/CheckoutScreen.js`
- Modify: `src/lib/customerData.js`
- Create: `src/lib/orderSubmission.mjs`
- Test: `tests/orderSubmission.test.mjs`

**Interfaces:**
- `buildOrderPayload({ cartItems, totals, address, paymentMethod, profile })` returns a normalized insert payload or a typed validation error.
- `placeOrder` updates local state only after `createOrder` succeeds.

- [ ] Write failing tests for missing address, empty cart, valid payload, failed insert preserving cart, and saved-order normalization.
- [ ] Run focused tests and confirm failure.
- [ ] Implement payload validation and use it in Checkout.
- [ ] Ensure `clearCart()` runs only after the insert resolves successfully.
- [ ] Refresh orders after success and navigate to the confirmation/tracking view.
- [ ] Run tests and commit `fix: make checkout order placement reliable`.

### Task 6: Restore Orders scrolling and native map fallback

**Files:**
- Modify: `src/screens/OrdersScreen.js`
- Create: `src/components/OrderTrackingMap.js`
- Create: `src/lib/orderTrackingMap.mjs`
- Modify: `src/lib/orderView.js`
- Test: `tests/orderTrackingMap.test.mjs`

**Interfaces:**
- `getOrderMapEndpoints({ restaurant, deliveryAddress })` returns nullable restaurant/customer endpoints and labels.
- `buildMapsUrl(endpoint)` returns a platform-safe maps URL when coordinates exist.

- [ ] Add failing tests for complete coordinates, missing customer coordinates, and maps URL generation.
- [ ] Replace the non-scrolling current-order layout with a single scroll container that includes map, details, and timeline.
- [ ] Render native map markers/route when coordinates and provider support are present.
- [ ] Render a deterministic fallback route and “Open in Maps” action otherwise.
- [ ] Run focused tests and commit `feat: restore order tracking and scrolling`.

### Task 7: Full verification and device validation

**Files:**
- Modify: `docs/superpowers/checklists/2026-07-23-customer-parity-checklist.md`

- [ ] Run `npm test` and require all tests to pass.
- [ ] Run `npx expo export --platform ios`.
- [ ] Regenerate iOS with `npx expo prebuild --platform ios --clean --no-install`.
- [ ] Run CocoaPods install with the known Ruby workaround.
- [ ] Build, install, and launch on iPhone `00008140-000A044C027B001C`.
- [ ] Manually verify toggle clipping, address save, checkout/order success, order scrolling, empty artwork, sound feedback, first-login name, and map fallback.
- [ ] Record results and known environment warnings in the checklist.
- [ ] Commit `test: verify customer flow fixes on iPhone`.
