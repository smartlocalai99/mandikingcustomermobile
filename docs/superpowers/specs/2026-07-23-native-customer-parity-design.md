# Native Customer App Parity Design

**Date:** 2026-07-23  
**Target:** `smartrestaimobile` Expo/React Native application  
**Reference:** `smartrestaicustomer` Next.js customer application

## Objective

Turn the native customer application into a native carbon copy of the working Next.js customer experience. The native app must preserve the web app's brand, information architecture, content, imagery, interactions, and complete customer journey while using native iOS and Android navigation, permissions, gestures, accessibility, and performance primitives.

The completed experience covers Home, menu and search, cart and checkout, login, addresses, payment methods, favourites, orders and tracking, notifications, help, and account. Owner and Supabase updates must continue to feed both customer clients from the same live data.

## Product Decisions

- Recreate the customer experience with React Native components. Do not wrap the website in a WebView.
- Match the Next.js app's visual language: assets, colors, typography hierarchy, labels, component order, cards, banners, sheets, empty states, loading states, and animations.
- Retain native bottom tabs, stack navigation, safe areas, keyboard handling, gestures, platform accessibility, notification delivery, and location APIs.
- Use the same image-based Veg/Non-veg toggle as the website, including its artwork, labels, colors, size, selector direction, and spring motion.
- Preserve the website's current filter meaning: **Veg** shows vegetarian items only; **Non-veg** restores the complete menu rather than hiding vegetarian items.
- Always show the four primary categories in this exact order: **Mandi, Starters, Rotis, Desserts**. Each category navigates to its mapped menu section. If a mapped section has no available items, keep the category visible and show a clear empty state.
- Ask for notification and foreground location permissions in a branded first-launch onboarding. Mobile operating systems show runtime permission prompts after launch, not as part of installation.
- When location is allowed, detect and reverse-geocode the current position, show the resolved address, and require confirmation before using or saving it.

## Architecture

### Parity layer

Create a page-to-screen parity inventory and map every web component/state to a native equivalent. Components that repeat across multiple screens will use shared native building blocks and centralized design tokens. This keeps visual decisions consistent without coupling the mobile app to browser-specific code.

Pure business rules that have web equivalents—menu search, menu filtering, pricing, delivery fees, order presentation, redirects, and category mapping—remain isolated from rendering. Where safe, the mobile behavior will mirror the tested web rule rather than creating a separate interpretation.

### Navigation and screen ownership

The existing React Navigation stack and bottom tabs remain the navigation foundation:

- Bottom tabs: Home, Favourites, Orders, Account.
- Stack destinations: Login, Checkout, Addresses, Payment Methods, Help, Notifications, and any dedicated order-tracking detail required to match the web experience.
- Push response routing stays above the navigator so a notification can open an offer/checkout flow or the transient notification experience from foreground, background, or terminated states.

Each screen owns presentation and user interaction only. Contexts/services own persisted state and Supabase communication. Large screens will be divided into focused components instead of accumulating unrelated behavior in a single file.

### Data flow

Supabase remains the source of truth for restaurant profile, menu sections/items, offers, categories, customer details, addresses, orders, and owner broadcasts. The mobile app will:

1. Hydrate safe cached data immediately.
2. Render usable cached content without waiting for the network.
3. Refresh current data in the background.
4. Coalesce realtime, foreground, and polling triggers so concurrent changes produce one trailing refresh.
5. Persist local-only state such as cart, favourites, permission onboarding completion, and the per-install push identifier.

Owner changes must appear in both clients without requiring a new mobile build.

## First-Launch and Permissions Experience

The first launch uses the same Mandi Kings brand artwork as the website's startup experience. It transitions into a short native onboarding rather than presenting operating-system dialogs without context.

Permission order:

1. Explain notification value in the app, then request notification permission.
2. Explain delivery-location value, then request foreground location permission.
3. If location succeeds, reverse-geocode the coordinates, show the resolved delivery address, and let the customer confirm or edit it.
4. If the customer is logged out, the confirmed location may be used as the displayed delivery location locally, but it is not written to the authenticated address table until the customer explicitly saves it after login.

Denial never blocks ordering with a manually entered address. A denied permission is not requested repeatedly. Relevant screens provide an **Open Settings** action and clear instructions for enabling it later. Location timeout, poor accuracy, or reverse-geocoding failure falls back to manual entry with a readable error.

Only permissions the customer app uses are requested: notifications and foreground location. Camera, microphone, contacts, photos, and background location are excluded.

## Home and Menu Experience

The Home screen follows the website's order and branding:

1. Delivery location header.
2. Exact image Veg/Non-veg toggle and notification access.
3. Search with matching suggestions and no-result behavior.
4. Offer banner/carousel.
5. Fixed four-category navigation.
6. Recommended and menu sections with matching cards, badges, prices, sold-out/closed states, favourites, and cart controls.
7. Restaurant information and disclaimers.

The top category row contains exactly those four entries and no additional remote categories. It uses their category records and images from Supabase when valid; other menu sections remain available in the menu below. Stable fallback mappings and packaged fallback art prevent the row from becoming blank when remote category metadata is missing. Category taps expand the target section if needed and scroll it below sticky/native header content.

Menu filtering is applied consistently to recommended items, menu sections, search results, and search suggestions. The toggle state is visually and semantically identical to the web app.

## Full Journey Parity

Every customer-facing route is checked against its web counterpart for:

- Component order and hierarchy.
- Text, labels, icons, images, color, spacing, borders, and typography emphasis.
- Loading, empty, unavailable, unauthenticated, validation, failure, and success states.
- Button disabled/loading behavior and prevention of duplicate submissions.
- Cart totals, fees, offer behavior, address selection, payment selection, and order creation.
- Favourites, account actions, notifications, help content, and order/tracking presentation.
- Motion that respects the operating system's Reduce Motion preference.

Native conventions may change the mechanism—such as a native sheet instead of a browser overlay—but not the information, outcome, brand, or visible state.

## Performance Design

- Replace the large Home `ScrollView` product tree with virtualized lists/sections so off-screen products are not mounted.
- Use stable keys, memoized derived menu data, focused context selectors or equivalent boundaries, and memoized product/category components to prevent unrelated rerenders.
- Continue using `expo-image` with memory/disk caching, correct resize modes, placeholders, transitions, and constrained image sizes.
- Cache data required for immediate startup and refresh it without clearing visible content.
- Avoid duplicate Supabase fetches caused by overlapping initial load, realtime subscription, foreground return, and polling.
- Prefetch the assets/data for likely next destinations without blocking interaction.
- Use skeletons and bounded startup timing; a network problem must not leave the branded splash visible indefinitely.
- Measure cold launch behavior, Home rendering, scroll responsiveness, render counts, request counts, image loading, and production-bundle/native build health before completion.

## Error Handling and Recovery

- Data failures keep valid cached content on screen and expose a retry action where the failure affects the current task.
- Missing category/menu data produces explicit empty states instead of broken or blank UI.
- Images always have packaged or branded fallbacks.
- Permission denial and location failures explain the next available action.
- Authentication expiry returns the customer to a safe state without losing unrelated local cart data.
- Order and payment submission failures remain retryable and must not create duplicate orders.
- Push registration errors do not crash startup; registration retries on a later launch, foreground return, or native token rotation.

## Verification Strategy

Automated coverage will include:

- Veg/Non-veg filtering across sections, recommended items, and search.
- Fixed category ordering, mapping, empty states, and navigation targets.
- First-launch onboarding decisions and permission states: undetermined, granted, denied, and previously decided.
- Location success, denial, timeout, reverse-geocode failure, confirmation, and logged-out behavior.
- Cache hydration, background refresh, refresh coalescing, and stale-data recovery.
- Cart/order calculations and critical navigation/deep-link behavior.
- Push registration and response routing.

Manual/device verification will include:

- A page-by-page comparison with the Next.js customer app at representative iPhone and Android sizes.
- Complete guest and authenticated ordering journeys.
- Permission onboarding on a clean install and behavior after denial from system settings.
- Owner-to-device push while the app is foregrounded, backgrounded, and terminated.
- Real connected-iPhone build and launch, plus Android native build verification.
- Accessibility labels, dynamic safe areas, keyboard avoidance, touch targets, and Reduce Motion behavior.

## Completion Criteria

The work is complete when every scoped customer screen has passed the parity checklist, the exact web image toggle and four fixed categories behave as specified, first-launch notification/location onboarding works safely, a real owner broadcast reaches the installed mobile app, automated tests and native builds pass, and measured performance checks show no known high-impact launch, scrolling, rendering, request, or image-loading issue in the tested journeys.

## Out of Scope

- Replacing Supabase or changing the owner application's product model.
- A WebView implementation.
- Requesting unused or invasive permissions.
- Redesigning the approved Next.js customer experience.
- Unrelated owner/super-admin features that do not affect the customer mobile journey.
