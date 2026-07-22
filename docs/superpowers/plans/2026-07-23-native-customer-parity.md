# Native Customer Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Expo customer app a native carbon copy of the Next.js customer experience, including first-launch notification/location onboarding, the exact web Veg/Non-veg image toggle, fixed Mandi/Starters/Rotis/Desserts navigation, complete customer flows, and fast resilient rendering.

**Architecture:** Keep React Native/Expo and the existing React Navigation structure. Reuse Supabase as the single source of truth, isolate pure filtering/location/cache rules in testable modules, and use native virtualized lists, permissions, sheets, and deep-link push routing for platform behavior.

**Tech Stack:** Expo SDK 57, React Native 0.86, React Navigation 7, `expo-image`, `expo-notifications`, `expo-location`, Supabase JS, Reanimated, Node's built-in test runner, Xcode 26.6, EAS.

## Global Constraints

- Match the approved Next.js customer app's brand assets, colors, copy, layout hierarchy, component states, and outcomes.
- Use the exact image-based web toggle: Veg filters vegetarian items; Non-veg restores the complete menu.
- The top category row contains exactly Mandi, Starters, Rotis, Desserts in that order; keep each visible when empty.
- Request only notifications and foreground location, after an explanatory first-launch screen; denial never blocks manual ordering.
- Never block startup indefinitely on the network; cached content or a recoverable fallback must appear quickly.
- Preserve the owner app, Supabase schema, existing push broadcast contract, and unrelated user changes.
- Use TDD for new pure behavior and run tests after each task.
- Do not add WebView-based rendering or unused invasive permissions.

---

### Task 1: Establish the parity inventory and native design tokens

**Files:**
- Create: `docs/superpowers/checklists/2026-07-23-customer-parity-checklist.md`
- Create: `src/constants/customerDesign.js`
- Modify: `src/constants/colors.js`
- Test: `tests/customerDesign.test.mjs`

**Interfaces:**
- Produces `customerDesign` with `colors`, `spacing`, `radii`, `typography`, and `categoryLabels` constants consumed by later screen work.
- Produces a checklist mapping each web route (`/`, `/login`, `/checkout`, `/addresses`, `/payment-methods`, `/favorites`, `/orders`, `/notifications`, `/help`, `/account`) to its native screen and verification state.

- [ ] **Step 1: Record the current parity baseline**

  Inspect the reference files in `/Users/vardhanreddy/Desktop/smartrestsuperadmin/smartrestaicustomer/pages`, `components/customer`, `context`, and `lib`, then record the corresponding native files in the checklist. Include visual states for loading, empty, unauthenticated, error, disabled, success, and permission-denied conditions.

- [ ] **Step 2: Write the failing token test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { customerDesign } from "../src/constants/customerDesign.js";

test("customer design constants preserve web category order and toggle assets", () => {
  assert.deepEqual(customerDesign.categoryLabels, ["Mandi", "Starters", "Rotis", "Desserts"]);
  assert.equal(customerDesign.toggle.vegAsset, "./assets/veg.webp");
  assert.equal(customerDesign.toggle.nonVegAsset, "./assets/nonveg.webp");
});
```

- [ ] **Step 3: Implement the shared tokens**

  Add the exact values already used by the web/mobile surfaces (primary brown `#32120d`, favorite red `#ef4f61`, yellow price badge `#ffdf3f`, white surface, muted text, shared radii/spacing) and export them as plain serializable objects. Update `colors.js` to consume the shared values without changing unrelated screen colors.

- [ ] **Step 4: Run the focused test**

  Run `npm test -- --test-name-pattern="customer design constants"` from `smartrestaimobile`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/checklists/2026-07-23-customer-parity-checklist.md src/constants/customerDesign.js src/constants/colors.js tests/customerDesign.test.mjs
git commit -m "chore: establish native customer parity baseline"
```

### Task 2: Build branded first-launch permission and location onboarding

**Files:**
- Modify: `package.json`, `app.json`
- Create: `src/lib/locationPermissions.mjs`
- Create: `src/context/OnboardingContext.js`
- Create: `src/screens/OnboardingScreen.js`
- Modify: `App.js`, `src/navigation/RootNavigator.js`
- Test: `tests/locationPermissions.test.mjs`

**Interfaces:**
- `requestForegroundLocation(locationAdapter): Promise<{ line: string, landmark: string, latitude: number, longitude: number }>` requests foreground permission, gets coordinates, calls the same Nominatim reverse-geocode contract as the web app, and throws readable typed errors.
- `OnboardingContext` exposes `{ isReady, needsOnboarding, completeOnboarding, locationState, requestLocation }`.

- [ ] **Step 1: Add the Expo location dependency and native permission declaration**

  Run `npx expo install expo-location`. Add the `expo-location` config plugin to `app.json` with the user-facing message: `SmartRest uses your location to suggest a delivery address. You can enter one manually instead.` Run `npx expo prebuild --platform ios --clean --no-install` after the config change.

- [ ] **Step 2: Write location behavior tests**

```js
test("returns a confirmed reverse-geocoded address", async () => {
  const result = await requestForegroundLocation({
    permissions: { getForegroundPermissionsAsync: async () => ({ status: "granted" }) },
    getCurrentPositionAsync: async () => ({ coords: { latitude: 14.6819, longitude: 78.8521 } }),
    reverseGeocode: async (lat, lon) => ({ line: `Kadapa ${lat},${lon}`, landmark: "Kadapa" }),
  });
  assert.equal(result.landmark, "Kadapa");
});

test("returns a settings-recovery error when location is denied", async () => {
  await assert.rejects(
    requestForegroundLocation({
      permissions: { getForegroundPermissionsAsync: async () => ({ status: "denied", canAskAgain: false }) },
    }),
    (error) => error.code === "LOCATION_DENIED" && error.canOpenSettings === true,
  );
});
```

- [ ] **Step 3: Implement the permission adapter**

  Implement `requestForegroundLocation` with `expo-location` adapters. Request permission only when status is undetermined; use `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`; pass coordinates to the existing web-compatible Nominatim reverse-geocode endpoint; map denied, timeout, unavailable, and reverse-geocode failures to stable error codes and readable messages. Never save an address from this function.

- [ ] **Step 4: Implement onboarding state and screen**

  Persist only onboarding completion and the last locally confirmed location in AsyncStorage. Render the packaged `assets/bannerlogin.png`, explain notifications and location in separate steps, request each permission after its explanation, show a confirmation card for the resolved address, and expose `Enter address manually`. Keep the app usable if either permission is denied.

- [ ] **Step 5: Gate the navigator without blocking indefinitely**

  Mount `OnboardingProvider` in `App.js` and render `OnboardingScreen` before `RootNavigator` only while onboarding is incomplete. Add a 6-second fallback that exits the splash/onboarding loading state if the network is unavailable. Ensure logged-out confirmed location remains local and authenticated saving continues through `AddressContext`.

- [ ] **Step 6: Run tests and commit**

  Run `npm test -- --test-name-pattern="location|onboarding"`. Expected: all matching tests PASS. Then commit:

```bash
git add package.json app.json App.js src/navigation/RootNavigator.js src/lib/locationPermissions.mjs src/context/OnboardingContext.js src/screens/OnboardingScreen.js tests/locationPermissions.test.mjs
git commit -m "feat: add native permission and location onboarding"
```

### Task 3: Add fast menu caching and coalesced refreshes

**Files:**
- Create: `src/lib/menuCache.mjs`
- Modify: `src/context/MenuDataContext.js`
- Modify: `src/lib/trailingRefresh.js`
- Test: `tests/menuCache.test.mjs`, `tests/trailingRefresh.test.mjs`

**Interfaces:**
- `readMenuCache(storage): Promise<{ profile, sections, offers, categories, savedAt } | null>`.
- `writeMenuCache(storage, snapshot): Promise<void>`.
- `createTrailingRefresh(task, { delayMs = 120 }): () => Promise<void>` remains the only refresh entry point for initial load, realtime, foreground, and polling triggers.

- [ ] **Step 1: Write cache and refresh tests**

  Cover valid snapshot hydration, malformed/stale JSON fallback, one trailing call for five synchronous refresh triggers, and error propagation that leaves the cached snapshot available.

- [ ] **Step 2: Implement bounded AsyncStorage caching**

  Store one versioned key, reject JSON without `profile`, array `sections`, array `offers`, and array `categories`, and expire snapshots after 24 hours. Never persist customer secrets, auth tokens, or order/payment data in this menu snapshot.

- [ ] **Step 3: Refactor `MenuDataContext`**

  Hydrate cache before the first Supabase fetch, render it immediately with `isLoading: false` when valid, then refresh in the background. Route initial, realtime, app-active, and 20-second fallback refreshes through one coalesced function. Write only successful complete snapshots and preserve the existing fallback categories.

- [ ] **Step 4: Verify and commit**

  Run `npm test -- --test-name-pattern="cache|refresh"`, then run the complete `npm test`. Expected: PASS. Commit with `git add src/lib/menuCache.mjs src/context/MenuDataContext.js src/lib/trailingRefresh.js tests/menuCache.test.mjs tests/trailingRefresh.test.mjs && git commit -m "perf: hydrate and refresh menu data efficiently"`.

### Task 4: Make Home a visual and behavioral carbon copy

**Files:**
- Create: `assets/veg.webp`, `assets/nonveg.webp`, `assets/mandi-category.png`, `assets/starters-category.png`, `assets/rotis-category.png`, `assets/desserts-category.png` (copied from the approved customer web assets)
- Modify: `src/components/VegToggle.js`, `src/components/CategoryRow.js`, `src/components/ProductCard.js`, `src/components/OfferCarousel.js`
- Modify: `src/screens/HomeScreen.js`, `src/lib/menuSearch.js`, `src/context/MenuDataContext.js`
- Test: `tests/menuSearch.test.mjs`, `tests/categoryNavigation.test.mjs`

**Interfaces:**
- `getVisibleMenuSections(sections, { vegOnly, searchQuery }): Section[]` applies identical filtering to recommended cards, sections, suggestions, and empty states.
- `getPrimaryCategories(categories): Category[]` always returns exactly the four ordered entries with stable section mappings and fallback assets.

- [ ] **Step 1: Add failing filter/category tests**

  Assert that the web-compatible Veg state excludes `isVeg !== true`, the Non-veg state returns every available item, search suggestions use the same filter, and missing remote categories still produce Mandi, Starters, Rotis, Desserts in order.

- [ ] **Step 2: Copy and use exact web assets**

  Copy `veg.webp`, `nonveg.webp`, `mandi9.png`, `starterimg.webp`, `rotis.png`, and `desert.png` from `smartrestaicustomer/public` into mobile assets with the names above. Keep the existing Supabase item images and `expo-image` placeholders for menu products.

- [ ] **Step 3: Rebuild the toggle and category row**

  Match the web toggle dimensions, image selector, labels, colors, accessibility role/state, and spring motion. Render only the four primary categories in the top row, use stable fallback images when remote URLs are absent, and scroll to/open the mapped section after a press.

- [ ] **Step 4: Virtualize Home sections**

  Replace the product-heavy Home `ScrollView` tree with a `SectionList` (or equivalent built-in virtualized list) whose section data is derived by `getVisibleMenuSections`. Preserve the offer/header/category content via `ListHeaderComponent`, stable item keys, two-column rows, sticky category/header behavior, and the existing notification/address sheets.

- [ ] **Step 5: Match product and offer states**

  Align cards with the web for badges, veg marker, favourite animation, image sizing, description clamping, price/old price, sold out, closed, quantity stepper, and accessibility labels. Ensure unavailable ordering never mutates the cart.

- [ ] **Step 6: Test and commit**

  Run `npm test -- --test-name-pattern="menu|category|notification"`, launch the iPhone dev build, and manually verify toggle, four category taps, search, empty category, offer, cart, and notification sheet. Commit the focused Home changes with `git commit -m "feat: match native home menu experience"`.

### Task 5: Complete screen-by-screen native parity

**Files:**
- Modify: `src/screens/LoginScreen.js`, `CheckoutScreen.js`, `AddressesScreen.js`, `PaymentMethodsScreen.js`, `FavoritesScreen.js`, `OrdersScreen.js`, `NotificationsScreen.js`, `HelpScreen.js`, `AccountScreen.js`
- Modify: `src/components/HomeAddressSheet.js`, `NotificationsSheet.js`, `CustomTabBar.js`, `EmptyState.js`, `src/navigation/RootNavigator.js`, `src/navigation/MainTabs.js`
- Test: add or extend focused tests under `tests/` for each pure rule changed

**Interfaces:**
- Preserve existing context contracts (`AuthContext`, `CartContext`, `AddressContext`, `PaymentContext`, `OrdersContext`, `FavoritesContext`, `NotificationsContext`) unless a compatibility-preserving adapter is added and tested.
- Navigation names remain `MainTabs`, `Login`, `Checkout`, `Addresses`, `PaymentMethods`, `Help`, `Notifications` so push and existing links continue to work.

- [ ] **Step 1: Match account/login/auth states**

  Compare web and native copy, validation, keyboard behavior, loading, error, login redirect, logout, and account rows. Keep guest access to browsing/cart while requiring auth only for actions the web app requires.

- [ ] **Step 2: Match addresses and location confirmation**

  Add current-location action using `locationPermissions.mjs`, saved-address radio selection, add/edit/delete/default behavior, redirect preservation into checkout, loading, and readable failure states.

- [ ] **Step 3: Match checkout/payment/order creation**

  Compare every total, delivery fee, offer, address, payment method, validation, disabled/loading, success, and failure state with the web implementation. Prevent duplicate submission and retain cart recovery on a failed order.

- [ ] **Step 4: Match favourites, orders/tracking, notifications, help, and tabs**

  Reproduce empty states, unread/read transitions, transient push behavior, offer tap routing, order tracking sections, tab badges, and accessible labels. Keep notification history transient as approved; do not recreate the removed database inbox.

- [ ] **Step 5: Update the parity checklist**

  Mark each route/state only after a manual iPhone comparison and attach the observed result in the checklist. Any mismatch found here becomes a focused fix in the same task, not an unrelated refactor.

- [ ] **Step 6: Run the full mobile test suite and commit**

  Run `npm test`. Expected: PASS with zero failures. Commit the screen parity batch with `git commit -m "feat: complete native customer screen parity"`.

### Task 6: Harden push and permission lifecycle across app states

**Files:**
- Modify: `src/context/NotificationsContext.js`, `src/lib/notificationsData.js`, `src/lib/pushRegistration.mjs`, `src/components/NotificationResponseHandler.js`
- Modify: `app.json` notification plugin configuration if native behavior requires it
- Test: `tests/pushRegistration.test.mjs`, `tests/notificationRouting.test.mjs`, add `tests/notificationLifecycle.test.mjs`

**Interfaces:**
- Keep `register-push-token` payload `{ installationId, expoPushToken, platform }` and the existing secure Supabase function contract.
- `startPushRegistration` registers immediately for every installation, regardless of login state, and refreshes on native token rotation with cleanup.

- [ ] **Step 1: Add lifecycle tests**

  Cover permission granted/denied, logged-out registration, foreground notification, background response, terminated response, duplicate response suppression, and cleanup of every native listener.

- [ ] **Step 2: Implement lifecycle handling**

  Keep registration independent from customer auth, retry on foreground return and token rotation, swallow registration failures without crashing startup, and route offer payloads to checkout while normal payloads open the transient sheet.

- [ ] **Step 3: Verify the real device flow**

  With the signed iPhone build installed, allow notifications, confirm one active token in Supabase, press Send in the owner app, and verify foreground/background/terminated delivery. Run `npm test` and commit with `git commit -m "test: verify native notification lifecycle"`.

### Task 7: Production-quality verification and handoff

**Files:**
- Modify: `docs/superpowers/checklists/2026-07-23-customer-parity-checklist.md`
- Create: `docs/native-customer-testing.md`
- No source changes unless a verification failure identifies a scoped defect

- [ ] **Step 1: Run automated verification**

  Run `npm test`, `npx expo-doctor`, `npx expo export --platform ios`, and the iOS simulator build. Expected: all tests pass, Expo Doctor reports no project issues, JS export succeeds, and Xcode reports `** BUILD SUCCEEDED **`.

- [ ] **Step 2: Run physical iPhone verification**

  Use `DEVELOPER_DIR=/Users/vardhanreddy/Downloads/Xcode.app/Contents/Developer xcodebuild -workspace ios/smartrestaimobile.xcworkspace -scheme smartrestaimobile -configuration Debug -destination 'platform=iOS,name=Vardhan’s iPhone' -allowProvisioningUpdates build`, then install the resulting app with `DEVELOPER_DIR=/Users/vardhanreddy/Downloads/Xcode.app/Contents/Developer xcrun devicectl device install app --device 00008140-000A044C027B001C /tmp/smartrestaimobile-device-build/Build/Products/Debug-iphoneos/smartrestaimobile.app`, and record the bundle ID, build result, permission decisions, token registration, and push result.

- [ ] **Step 3: Run Android build verification**

  Run `npx expo prebuild --platform android --no-install` and `npx expo run:android --variant release` when an Android SDK/device is available. If no Android device exists, record the release compile result and mark only device-delivery verification as pending.

- [ ] **Step 4: Review the checklist and repository state**

  Confirm no high-impact parity item is unchecked, `git diff --check` is clean, unrelated `SmartRestAI/` remains untouched, and all commits contain only scoped files. Update the testing guide with exact commands and known platform limitations.

- [ ] **Step 5: Commit verification artifacts**

```bash
git add docs/superpowers/checklists/2026-07-23-customer-parity-checklist.md docs/native-customer-testing.md
git commit -m "docs: record native customer verification"
```
