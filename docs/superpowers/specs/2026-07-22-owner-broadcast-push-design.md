# Owner Broadcast Push Notifications

## Goal

When the authenticated restaurant owner presses **Send** in `smartrestownerai`, deliver one real OS push notification to every device registered by `smartrestaimobile`. Support iOS and Android in the application design, configure and verify iOS first, and leave the generated iOS workspace ready in Xcode.

## Confirmed product behavior

- Every registered SmartRest customer device is a recipient. There is no restaurant, order-history, or customer-segment filter.
- Sending is immediate and requires one owner action.
- A notification containing an `offerId` opens that offer when tapped.
- A notification without an `offerId` opens the mobile notification area using the payload delivered with the push.
- The send operation does not create campaign records or per-customer inbox rows.
- Because notification rows are not persisted, permanent cross-device notification history is outside this feature's scope.
- Existing notification inbox code may remain, but direct broadcasts do not add rows to it.

## Architecture

### Mobile application

`smartrestaimobile` obtains an Expo push token after notification permission is granted. One record is maintained per app installation/device in a private Supabase table. Registration is retried after login, app startup, permission changes, network recovery, and token rotation.

The app installs notification response listeners at its navigation root. A tap routes to the linked offer when `data.offerId` is present. Otherwise it routes to Home, opens the notification sheet, and passes the delivered title/body as transient route state. This makes the tapped notification visible without creating a permanent database inbox record.

The Expo configuration contains a stable EAS project UUID, iOS bundle identifier, Android package identifier, notification plugin settings, and platform-specific credentials. Remote notifications are tested in a native/development build rather than relying on Expo Go.

### Database

A private `push_tokens` table stores:

- token value, unique;
- platform (`ios` or `android`);
- installation identifier;
- active/inactive state;
- last registration timestamp;
- last delivery error, when applicable.

Frontend roles cannot enumerate tokens. Registration is performed through a narrowly scoped Edge Function that accepts the project's publishable key, validates the installation identifier, platform, and Expo token format, and can only upsert the submitted installation. Token reads are restricted to server-side privileged code. RLS remains enabled.

The existing draft notification migration will be replaced or superseded so it does not grant broad anonymous access to token enumeration, deletion, or unrelated customers' notification state.

### Broadcast Edge Function

The owner app invokes a Supabase Edge Function with the current owner session and a payload containing `title`, `body`, and optional `offerId`.

The function:

1. Validates method, payload sizes, and required fields.
2. Authenticates the caller and checks existing `is_owner()` authorization.
3. Reads all active device tokens using server-side credentials.
4. Deduplicates tokens and sends Expo push messages in batches of at most 100.
5. Includes sound, platform-safe data, and the optional offer identifier.
6. Deactivates tokens rejected immediately as malformed or invalid.
7. Returns accepted, rejected, and skipped counts to the owner UI.

If Enhanced Security is enabled for the Expo Push Service, its access token is stored only as a Supabase Edge Function secret.

Owner verification is automatic and has no extra user-facing step. It prevents an unauthenticated caller from broadcasting spam.

## Delivery and failure behavior

- An empty token list is a successful send with zero recipients.
- Invalid input returns a clear 4xx response and sends nothing.
- A caller who is not the owner receives 401/403 and sends nothing.
- Expo transport failures return a retryable error without pretending delivery succeeded.
- Individual token errors do not fail the complete broadcast; immediate invalid-token errors are disabled and reported in the result.
- The owner UI distinguishes accepted pushes from failed pushes. Expo acceptance is not presented as proof that APNs or FCM displayed the notification.
- The function is safe against accidental duplicate token rows. Full send idempotency is not included because the approved flow has no campaign/send record.
- Expo errors that appear only in asynchronous push receipts are not used for automatic cleanup in this simplified version because there is no durable send/ticket record.

## iOS-first native configuration

- Add the stable EAS project ID to Expo app configuration.
- Retain `com.smartrestai.SmartRestAI` as the iOS bundle identifier unless the Apple Developer account requires a different registered identifier.
- Configure the notification entitlement/plugin and APNs credentials.
- Regenerate the iOS directory with Expo Prebuild so native configuration matches app configuration.
- Install pods, validate the `smartrestaimobile` Xcode scheme, and open `ios/smartrestaimobile.xcworkspace`.
- Run the development build with Metro and verify permission, token registration, foreground delivery, background delivery, closed-app delivery, and tap routing.

Android shares token registration, Edge Function delivery, and tap routing. FCM v1 credentials and an Android native build are required before Android end-to-end verification.

## Testing

### Automated

- Edge Function rejects unauthenticated and non-owner callers.
- Payload validation rejects missing/oversized title or body.
- Token deduplication and 100-message batching are deterministic.
- Immediate invalid-token results deactivate only the affected tokens.
- Owner UI renders accepted/rejected counts and handles server failures.
- Mobile registration handles denied permission, missing project ID, offline token retrieval, successful upsert, and token rotation.
- Notification response routing opens an offer when present and the notification area otherwise.

### End-to-end iOS

1. Install the native development build.
2. Grant notifications and verify an iOS Expo push token is stored privately.
3. Send from the authenticated owner app.
4. Verify foreground, background, and terminated-app receipt.
5. Verify offer and non-offer tap destinations.
6. Verify a non-owner cannot invoke the broadcast.

## Out of scope

- Scheduled notifications.
- Customer segmentation or restaurant-specific targeting.
- Per-customer read state.
- Permanent notification history or campaign analytics.
- Delivery retries requiring a durable send queue.
- Asynchronous Expo receipt tracking and receipt-based token cleanup.
- Direct APNs/FCM integration that bypasses Expo Push Service.

## Success criteria

- One owner action results in an attempted push to every active registered device.
- Push tokens and privileged credentials are not readable from public clients.
- iOS receives the push in a native build and routes notification taps correctly.
- The generated iOS workspace opens successfully in Xcode.
- Shared code is Android-compatible, with only FCM credentials/build verification remaining for the Android release workflow.
