# Owner Broadcast Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one authenticated owner action send a real Expo push notification to every active SmartRest mobile installation, with offer-aware tap routing, and leave the iOS native workspace buildable in Xcode.

**Architecture:** The mobile app registers one private Expo token per installation through a narrow Supabase Edge Function. A second owner-authenticated Edge Function validates the owner, loads every active token, batches messages to Expo Push Service, and returns accepted/rejected counts without creating campaign or inbox rows. Mobile notification listeners apply linked offers or display a transient notification payload.

**Tech Stack:** Expo SDK 57, React Native 0.86, `expo-notifications`, `expo-constants`, `expo-crypto`, React Navigation 7, Supabase Postgres/RLS/Edge Functions, Expo Push Service, Next.js owner app, Node test runner/Vitest, Xcode 26.6.

## Global Constraints

- Broadcast to every active registered app installation; do not filter by phone, customer, restaurant, or order history.
- Do not create campaign records or per-customer notification inbox rows.
- An `offerId` tap applies the matching offer and opens Checkout; a normal tap opens Home's notification sheet with transient payload data.
- Keep push tokens private: `anon` and `authenticated` clients may not select, update, or delete arbitrary token rows.
- Keep owner authorization automatic and server-side using the existing `public.is_owner()` function.
- Use Expo Push Service; do not add direct APNs/FCM delivery.
- Configure and verify iOS first while keeping shared code Android-compatible.
- Preserve the iOS bundle identifier `com.smartrestai.SmartRestAI`.
- Do not claim Expo ticket acceptance proves APNs/FCM display.
- Before dependency installation, native generation, or Xcode builds, `df -h /System/Volumes/Data` must show at least 8 GB available. Current availability is about 117 MB, so implementation must pause for user-approved disk cleanup if this precondition is not met.
- Read `smartrestownerai/node_modules/next/dist/docs/` for the installed Next.js API/client conventions before modifying owner code.
- Use Expo SDK 57 documentation for all notification and native configuration APIs.

---

### Task 1: Replace the draft notification schema with private installation tokens

**Files:**
- Modify: `../smartrestaicustomer/supabase/migrations/20260722000000_customer_notifications.sql`
- Modify: `../smartrestaicustomer/tests/supabase-setup.test.mjs`

**Interfaces:**
- Produces table `public.push_tokens(id, installation_id, expo_push_token, platform, is_active, last_error, created_at, updated_at)`.
- Produces unique constraints on `installation_id` and `expo_push_token` for server-side upsert/deduplication.
- No frontend role receives table privileges; Edge Functions use the service-role client.

- [ ] **Step 1: Add a failing schema-hardening test**

Append this test to `tests/supabase-setup.test.mjs`:

```js
test("keeps direct broadcast push tokens private", async () => {
  const migration = await read(
    "supabase/migrations/20260722000000_customer_notifications.sql"
  );

  assert.match(migration, /installation_id text not null unique/);
  assert.match(migration, /expo_push_token text not null unique/);
  assert.match(migration, /is_active boolean not null default true/);
  assert.match(migration, /alter table public\.push_tokens enable row level security/);
  assert.match(migration, /revoke all on table public\.push_tokens from anon, authenticated/);
  assert.doesNotMatch(migration, /customer_notifications/);
  assert.doesNotMatch(migration, /with check \(true\)/);
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `cd ../smartrestaicustomer && npm run test:legacy -- --test-name-pattern="private"`

Expected: FAIL because the draft migration still declares `customer_phone`, `customer_notifications`, and permissive anonymous policies.

- [ ] **Step 3: Replace the draft SQL with the direct-broadcast schema**

Use this complete migration body:

```sql
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  installation_id text not null unique,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  is_active boolean not null default true,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_active_idx
  on public.push_tokens(is_active) where is_active;

drop trigger if exists push_tokens_set_updated_at on public.push_tokens;
create trigger push_tokens_set_updated_at
before update on public.push_tokens
for each row execute function public.set_updated_at();

alter table public.push_tokens enable row level security;
revoke all on table public.push_tokens from anon, authenticated;
grant select, insert, update, delete on table public.push_tokens to service_role;
```

Before editing, run `npx supabase migration list --linked`. If `20260722000000` already appears in the remote column, do not rewrite deployed history: run `npx supabase migration new harden_direct_push_tokens` and put equivalent `alter table`/policy cleanup SQL in the exact CLI-generated file instead. The checked-in draft is currently untracked, so the expected path is to replace it before first deployment.

- [ ] **Step 4: Run schema tests**

Run: `cd ../smartrestaicustomer && npm run test:legacy -- --test-name-pattern="push tokens|private"`

Expected: PASS with no public token policy or `customer_notifications` table in the draft.

- [ ] **Step 5: Validate the linked migration without applying it**

Run: `cd ../smartrestaicustomer && npm run db:push:dry`

Expected: Supabase prints the direct push-token migration as pending and exits 0. Do not continue on a permission, link, or SQL error.

- [ ] **Step 6: Commit the schema task**

```bash
cd ../smartrestaicustomer
git add supabase/migrations/20260722000000_customer_notifications.sql tests/supabase-setup.test.mjs
git commit -m "feat: add private push installation tokens"
```

---

### Task 2: Add tested push batching and validation primitives

**Files:**
- Create: `../smartrestaicustomer/supabase/functions/_shared/push-broadcast.mjs`
- Create: `../smartrestaicustomer/test/pushBroadcast.test.mjs`

**Interfaces:**
- Produces `isExpoPushToken(value): boolean`.
- Produces `validateBroadcastPayload(value): { title, body, offerId }` or throws `TypeError`.
- Produces `buildMessages(tokens, payload): ExpoPushMessage[]`.
- Produces `chunkMessages(messages, size = 100): ExpoPushMessage[][]`.
- Produces `summarizeTickets(tokens, tickets): { acceptedCount, rejectedCount, invalidTokens }`.

- [ ] **Step 1: Write failing pure-function tests**

Create `test/pushBroadcast.test.mjs`:

```js
import { describe, expect, it } from "vitest";
import {
  buildMessages,
  chunkMessages,
  isExpoPushToken,
  summarizeTickets,
  validateBroadcastPayload,
} from "../supabase/functions/_shared/push-broadcast.mjs";

describe("push broadcast primitives", () => {
  it("validates and trims the owner payload", () => {
    expect(validateBroadcastPayload({ title: " Sale ", body: " Today ", offerId: "offer-1" }))
      .toEqual({ title: "Sale", body: "Today", offerId: "offer-1" });
    expect(() => validateBroadcastPayload({ title: "", body: "Today" })).toThrow(TypeError);
    expect(() => validateBroadcastPayload({ title: "x".repeat(61), body: "Today" })).toThrow(TypeError);
    expect(() => validateBroadcastPayload({ title: "Sale", body: "x".repeat(161) })).toThrow(TypeError);
  });

  it("accepts both current Expo token prefixes", () => {
    expect(isExpoPushToken("ExponentPushToken[abc]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abc]")).toBe(true);
    expect(isExpoPushToken("not-a-token")).toBe(false);
  });

  it("builds offer-aware messages and chunks at 100", () => {
    const tokens = Array.from({ length: 201 }, (_, index) => `ExpoPushToken[${index}]`);
    const messages = buildMessages(tokens, { title: "Sale", body: "Today", offerId: "offer-1" });
    expect(messages[0]).toMatchObject({ sound: "default", data: { offerId: "offer-1" } });
    expect(chunkMessages(messages).map((batch) => batch.length)).toEqual([100, 100, 1]);
  });

  it("maps ticket failures back to invalid tokens", () => {
    const summary = summarizeTickets(
      ["ExpoPushToken[a]", "ExpoPushToken[b]"],
      [{ status: "ok", id: "ticket-1" }, { status: "error", details: { error: "DeviceNotRegistered" } }]
    );
    expect(summary).toEqual({
      acceptedCount: 1,
      rejectedCount: 1,
      invalidTokens: ["ExpoPushToken[b]"],
    });
  });
});
```

- [ ] **Step 2: Verify the tests fail because the module does not exist**

Run: `cd ../smartrestaicustomer && npm run test:unit -- test/pushBroadcast.test.mjs`

Expected: FAIL resolving `_shared/push-broadcast.mjs`.

- [ ] **Step 3: Implement the pure module**

Create `_shared/push-broadcast.mjs` with:

```js
const TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

export const isExpoPushToken = (value) =>
  typeof value === "string" && TOKEN_PATTERN.test(value);

export function validateBroadcastPayload(value) {
  const title = typeof value?.title === "string" ? value.title.trim() : "";
  const body = typeof value?.body === "string" ? value.body.trim() : "";
  const offerId = typeof value?.offerId === "string" && value.offerId.trim()
    ? value.offerId.trim()
    : null;
  if (!title || title.length > 60) throw new TypeError("title must contain 1-60 characters");
  if (!body || body.length > 160) throw new TypeError("body must contain 1-160 characters");
  return { title, body, offerId };
}

export function buildMessages(tokens, { title, body, offerId }) {
  return tokens.filter(isExpoPushToken).map((to) => ({
    to,
    title,
    body,
    sound: "default",
    data: offerId ? { offerId } : {},
  }));
}

export function chunkMessages(messages, size = 100) {
  const chunks = [];
  for (let index = 0; index < messages.length; index += size) {
    chunks.push(messages.slice(index, index + size));
  }
  return chunks;
}

export function summarizeTickets(tokens, tickets) {
  const invalidTokens = [];
  let acceptedCount = 0;
  let rejectedCount = 0;
  tickets.forEach((ticket, index) => {
    if (ticket?.status === "ok") acceptedCount += 1;
    else {
      rejectedCount += 1;
      if (ticket?.details?.error === "DeviceNotRegistered" && tokens[index]) {
        invalidTokens.push(tokens[index]);
      }
    }
  });
  return { acceptedCount, rejectedCount, invalidTokens };
}
```

- [ ] **Step 4: Run the unit test**

Run: `cd ../smartrestaicustomer && npm run test:unit -- test/pushBroadcast.test.mjs`

Expected: 4 tests PASS.

- [ ] **Step 5: Commit the primitives**

```bash
cd ../smartrestaicustomer
git add supabase/functions/_shared/push-broadcast.mjs test/pushBroadcast.test.mjs
git commit -m "test: define push broadcast behavior"
```

---

### Task 3: Implement registration and owner broadcast Edge Functions

**Files:**
- Create: `../smartrestaicustomer/supabase/functions/_shared/http.ts`
- Create: `../smartrestaicustomer/supabase/functions/register-push-token/index.ts`
- Create: `../smartrestaicustomer/supabase/functions/broadcast-push/index.ts`
- Modify: `../smartrestaicustomer/supabase/config.toml`
- Modify: `../smartrestaicustomer/test/pushBroadcast.test.mjs`

**Interfaces:**
- `POST /functions/v1/register-push-token` consumes `{ installationId, expoPushToken, platform }` and returns `{ registered: true }`.
- `POST /functions/v1/broadcast-push` consumes `{ title, body, offerId? }` under an owner JWT and returns `{ recipientCount, acceptedCount, rejectedCount, skippedCount }`.

- [ ] **Step 1: Add failing source-contract tests**

Append a test that reads both function files and asserts:

```js
import { readFile } from "node:fs/promises";

it("keeps registration public but broadcast owner-authenticated", async () => {
  const [config, registerSource, broadcastSource] = await Promise.all([
    readFile(new URL("../supabase/config.toml", import.meta.url), "utf8"),
    readFile(new URL("../supabase/functions/register-push-token/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/functions/broadcast-push/index.ts", import.meta.url), "utf8"),
  ]);
  expect(config).toMatch(/\[functions\.register-push-token\][\s\S]*verify_jwt = false/);
  expect(config).toMatch(/\[functions\.broadcast-push\][\s\S]*verify_jwt = true/);
  expect(registerSource).toMatch(/from\("push_tokens"\)[\s\S]*\.upsert/);
  expect(broadcastSource).toMatch(/rpc\("is_owner"\)/);
  expect(broadcastSource).toMatch(/https:\/\/exp\.host\/--\/api\/v2\/push\/send/);
});
```

- [ ] **Step 2: Verify the contract test fails**

Run: `cd ../smartrestaicustomer && npm run test:unit -- test/pushBroadcast.test.mjs`

Expected: FAIL because the Edge Function files/config sections do not exist.

- [ ] **Step 3: Add shared CORS/JSON helpers**

Create `_shared/http.ts`:

```ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 4: Implement token registration**

`register-push-token/index.ts` must:

```ts
import { createClient } from "npm:@supabase/supabase-js@2.110.5";
import { isExpoPushToken } from "../_shared/push-broadcast.mjs";
import { corsHeaders, json } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const payload = await request.json().catch(() => null);
  const installationId = typeof payload?.installationId === "string" ? payload.installationId.trim() : "";
  const expoPushToken = payload?.expoPushToken;
  const platform = payload?.platform;
  if (!/^[0-9a-f-]{36}$/i.test(installationId) || !isExpoPushToken(expoPushToken) || !["ios", "android"].includes(platform)) {
    return json(400, { error: "Invalid push registration" });
  }
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
  await admin.from("push_tokens").delete()
    .eq("expo_push_token", expoPushToken)
    .neq("installation_id", installationId);
  const { error } = await admin.from("push_tokens").upsert(
    { installation_id: installationId, expo_push_token: expoPushToken, platform, is_active: true, last_error: null },
    { onConflict: "installation_id" }
  );
  return error ? json(500, { error: "Registration failed" }) : json(200, { registered: true });
});
```

- [ ] **Step 5: Implement owner broadcast**

Create `broadcast-push/index.ts`:

```ts
import { createClient } from "npm:@supabase/supabase-js@2.110.5";
import {
  buildMessages,
  chunkMessages,
  isExpoPushToken,
  summarizeTickets,
  validateBroadcastPayload,
} from "../_shared/push-broadcast.mjs";
import { corsHeaders, json } from "../_shared/http.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json(401, { error: "Authentication required" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: isOwner, error: ownerError } = await caller.rpc("is_owner");
  if (ownerError || isOwner !== true) return json(403, { error: "Owner access required" });

  let payload;
  try {
    payload = validateBroadcastPayload(await request.json());
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : "Invalid payload" });
  }

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: rows, error: tokenError } = await admin
    .from("push_tokens")
    .select("expo_push_token")
    .eq("is_active", true);
  if (tokenError) return json(500, { error: "Unable to load recipients" });

  const allTokens = [...new Set((rows ?? []).map((row) => row.expo_push_token))];
  const validTokens = allTokens.filter(isExpoPushToken);
  const messages = buildMessages(validTokens, payload);
  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  let acceptedCount = 0;
  let rejectedCount = 0;
  const invalidTokens = [];

  for (const batch of chunkMessages(messages)) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(batch),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(result?.data)) {
      return json(502, { error: "Expo Push Service rejected the broadcast" });
    }
    const summary = summarizeTickets(batch.map((message) => message.to), result.data);
    acceptedCount += summary.acceptedCount;
    rejectedCount += summary.rejectedCount;
    invalidTokens.push(...summary.invalidTokens);
  }

  if (invalidTokens.length) {
    await admin
      .from("push_tokens")
      .update({ is_active: false, last_error: "DeviceNotRegistered" })
      .in("expo_push_token", invalidTokens);
  }

  return json(200, {
    recipientCount: allTokens.length,
    acceptedCount,
    rejectedCount,
    skippedCount: allTokens.length - validTokens.length,
  });
});
```

- [ ] **Step 6: Configure gateway auth**

Append to `supabase/config.toml`:

```toml
[functions.register-push-token]
verify_jwt = false

[functions.broadcast-push]
verify_jwt = true
```

- [ ] **Step 7: Run function unit/contracts and full customer tests**

Run:

```bash
cd ../smartrestaicustomer
npm run test:unit -- test/pushBroadcast.test.mjs
npm test
```

Expected: all push tests and the existing suite PASS.

- [ ] **Step 8: Commit Edge Functions**

```bash
cd ../smartrestaicustomer
git add supabase/config.toml supabase/functions test/pushBroadcast.test.mjs
git commit -m "feat: add secure broadcast push functions"
```

---

### Task 4: Make the owner UI invoke direct broadcast only

**Files:**
- Modify: `../smartrestownerai/lib/notificationsData.mjs`
- Modify: `../smartrestownerai/pages/notifications/index.js`
- Modify: `../smartrestownerai/package.json`
- Create: `../smartrestownerai/tests/notificationsData.test.mjs`

**Interfaces:**
- `sendBroadcastNotification({ title, body, offerId }, client)` invokes `broadcast-push`.
- Returns `{ recipientCount, acceptedCount, rejectedCount, skippedCount }`.

- [ ] **Step 1: Read installed Next.js guidance**

Run: `cd ../smartrestownerai && rg -n "client component|pages router|environment" node_modules/next/dist/docs | head -80`

Expected: confirm the installed Pages Router/client conventions before changing the page.

- [ ] **Step 2: Add a failing owner-client test**

Create `tests/notificationsData.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { sendBroadcastNotification } from "../lib/notificationsData.mjs";

test("invokes one owner-authenticated direct broadcast", async () => {
  const calls = [];
  const client = {
    functions: {
      invoke: async (name, options) => {
        calls.push([name, options]);
        return { data: { recipientCount: 3, acceptedCount: 2, rejectedCount: 1, skippedCount: 0 }, error: null };
      },
    },
  };
  const result = await sendBroadcastNotification({ title: "Sale", body: "Today", offerId: "offer-1" }, client);
  assert.deepEqual(calls, [["broadcast-push", { body: { title: "Sale", body: "Today", offerId: "offer-1" } }]]);
  assert.equal(result.acceptedCount, 2);
});
```

Add `"test": "node --test tests/*.test.mjs"` to `package.json`.

- [ ] **Step 3: Verify the owner test fails**

Run: `cd ../smartrestownerai && npm test`

Expected: FAIL because the current function writes inbox rows and uses `/api/send-push`.

- [ ] **Step 4: Replace the owner data client**

Use:

```js
import { getSupabase } from "./supabaseClient.js";

export async function sendBroadcastNotification({ title, body, offerId = null }, client = getSupabase()) {
  const payload = { title: title.trim(), body: body.trim(), offerId: offerId || null };
  const { data, error } = await client.functions.invoke("broadcast-push", { body: payload });
  if (error) throw error;
  return data;
}
```

Remove `listNotificationHistory`; the old `/api/send-push` endpoint becomes unused and should be deleted only after `rg` confirms no callers.

- [ ] **Step 5: Simplify the owner page**

Remove phone targeting, history state/UI, and “saved to inbox” copy. Keep title/body/offer quick-fill. On success render:

```jsx
<p className="text-center text-xs text-success">
  Accepted by Expo: {result.acceptedCount} of {result.recipientCount} registered device
  {result.recipientCount === 1 ? "" : "s"}
  {result.rejectedCount ? ` · ${result.rejectedCount} rejected` : ""}
</p>
```

- [ ] **Step 6: Run owner verification**

Run:

```bash
cd ../smartrestownerai
npm test
npm run lint
npm run build
```

Expected: test PASS, lint exits 0, production build exits 0.

- [ ] **Step 7: Commit owner changes**

```bash
cd ../smartrestownerai
git add package.json package-lock.json lib/notificationsData.mjs pages/notifications/index.js pages/api/send-push.js tests/notificationsData.test.mjs
git commit -m "feat: send direct owner push broadcasts"
```

---

### Task 5: Register mobile installations and handle token rotation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.json`
- Create: `src/lib/pushRegistration.mjs`
- Modify: `src/lib/notificationsData.js`
- Modify: `src/context/NotificationsContext.js`
- Create: `tests/pushRegistration.test.mjs`

**Interfaces:**
- `getInstallationId(storage, createId): Promise<string>` persists one UUID under `smartrest_push_installation_id`.
- `submitPushRegistration(client, registration): Promise<void>` invokes `register-push-token`.
- `registerForPushNotifications(adapters): Promise<string | null>` requests permission, gets token with EAS project ID, and submits it.

- [ ] **Step 1: Add a Node test script and failing registration tests**

Add `"test": "node --test tests/*.test.mjs"` to mobile `package.json` and create `tests/pushRegistration.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  getInstallationId,
  registerForPushNotifications,
  submitPushRegistration,
} from "../src/lib/pushRegistration.mjs";

test("reuses and creates a persisted installation id", async () => {
  const existing = { getItem: async () => "existing-id", setItem: async () => assert.fail() };
  assert.equal(await getInstallationId(existing, () => "new-id"), "existing-id");
  let saved;
  const empty = { getItem: async () => null, setItem: async (_key, value) => { saved = value; } };
  assert.equal(await getInstallationId(empty, () => "new-id"), "new-id");
  assert.equal(saved, "new-id");
});

test("does not register when permission is denied", async () => {
  const result = await registerForPushNotifications({
    notifications: {
      getPermissionsAsync: async () => ({ status: "denied" }),
      requestPermissionsAsync: async () => ({ status: "denied" }),
    },
    projectId: "project-id",
    platform: "ios",
    installationId: "install-id",
    submit: async () => assert.fail(),
  });
  assert.equal(result, null);
});

test("requires the EAS project id", async () => {
  await assert.rejects(
    registerForPushNotifications({ notifications: {}, projectId: null, platform: "ios" }),
    /EAS project ID/
  );
});

test("submits the Expo token and propagates function errors", async () => {
  const calls = [];
  const client = { functions: { invoke: async (...args) => { calls.push(args); return { error: null }; } } };
  await submitPushRegistration(client, {
    installationId: "install-id",
    expoPushToken: "ExpoPushToken[abc]",
    platform: "ios",
  });
  assert.deepEqual(calls, [["register-push-token", { body: {
    installationId: "install-id",
    expoPushToken: "ExpoPushToken[abc]",
    platform: "ios",
  } }]]);
});

test("registers a fresh or rotated token through the same submit callback", async () => {
  const submitted = [];
  const notifications = {
    getPermissionsAsync: async () => ({ status: "granted" }),
    getExpoPushTokenAsync: async ({ projectId }) => ({ data: `ExpoPushToken[${projectId}]` }),
  };
  const result = await registerForPushNotifications({
    notifications,
    projectId: "project-id",
    platform: "ios",
    installationId: "install-id",
    submit: async (value) => submitted.push(value),
  });
  assert.equal(result, "ExpoPushToken[project-id]");
  assert.deepEqual(submitted[0], {
    installationId: "install-id",
    expoPushToken: "ExpoPushToken[project-id]",
    platform: "ios",
  });
});
```

Run: `npm test`

Expected: FAIL resolving `src/lib/pushRegistration.mjs`.

- [ ] **Step 2: Install SDK-compatible dependencies**

Run: `npx expo install expo-constants expo-crypto expo-application`

Expected: Expo installs SDK 57-compatible pinned versions and updates the lockfile.

- [ ] **Step 3: Initialize the EAS project ID**

Run: `npx eas-cli init` while authenticated to the intended Expo account. Allow EAS to write the generated UUID to `app.json`; do not fabricate a UUID. Confirm `extra.eas.projectId` exists with `npx expo config --type public`.

- [ ] **Step 4: Implement the pure registration module**

Create `pushRegistration.mjs`:

```js
const INSTALLATION_KEY = "smartrest_push_installation_id";

export async function getInstallationId(storage, createId) {
  const existing = await storage.getItem(INSTALLATION_KEY);
  if (existing) return existing;
  const created = createId();
  await storage.setItem(INSTALLATION_KEY, created);
  return created;
}

export async function submitPushRegistration(client, registration) {
  const { error } = await client.functions.invoke("register-push-token", { body: registration });
  if (error) throw error;
}

export async function registerForPushNotifications({
  notifications,
  projectId,
  platform,
  installationId,
  submit,
  androidImportance,
}) {
  if (!projectId) throw new Error("EAS project ID is not configured");
  if (platform === "android") {
    await notifications.setNotificationChannelAsync("default", {
      name: "SmartRest notifications",
      importance: androidImportance,
    });
  }
  const existing = await notifications.getPermissionsAsync();
  const permission = existing.status === "granted"
    ? existing
    : await notifications.requestPermissionsAsync();
  if (!["granted", "provisional"].includes(permission.status)) return null;
  const { data: expoPushToken } = await notifications.getExpoPushTokenAsync({ projectId });
  const registration = { installationId, expoPushToken, platform };
  await submit(registration);
  return expoPushToken;
}
```

- [ ] **Step 5: Connect the React Native adapters**

In `notificationsData.js`, replace the old registration function with:

```js
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  getInstallationId,
  registerForPushNotifications,
  submitPushRegistration,
} from "./pushRegistration.mjs";

export async function registerPushToken(client = getSupabase()) {
  // Modern iOS simulators support remote notifications; Android emulators
  // still need Google Play services and are handled during Android verification.
  if (!Device.isDevice && Platform.OS !== "ios") return null;
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  const installationId = await getInstallationId(AsyncStorage, Crypto.randomUUID);
  return registerForPushNotifications({
    notifications: Notifications,
    projectId,
    platform: Platform.OS,
    installationId,
    androidImportance: Notifications.AndroidImportance.MAX,
    submit: (registration) => submitPushRegistration(client, registration),
  });
}

export async function registerRotatedPushToken(expoPushToken, client = getSupabase()) {
  const installationId = await getInstallationId(AsyncStorage, Crypto.randomUUID);
  return submitPushRegistration(client, { installationId, expoPushToken, platform: Platform.OS });
}
```

In `NotificationsContext`, call `registerPushToken(client)` without a phone argument. Add this effect next to initial registration:

```js
useEffect(() => {
  if (!isLoggedIn) return undefined;
  const subscription = Notifications.addPushTokenListener(({ data }) => {
    registerRotatedPushToken(data, client).catch(() => {});
  });
  return () => subscription.remove();
}, [isLoggedIn, client]);
```

- [ ] **Step 6: Configure both native identifiers**

Ensure `app.json` contains:

```json
{
  "ios": { "bundleIdentifier": "com.smartrestai.SmartRestAI", "supportsTablet": true },
  "android": { "package": "com.smartrestai.smartrestaimobile" },
  "plugins": [
    "expo-image",
    ["expo-notifications", { "icon": "./assets/icon.png", "color": "#32120d", "defaultChannel": "default" }],
    "expo-font"
  ]
}
```

Preserve the exact EAS UUID generated in Step 3.

- [ ] **Step 7: Run mobile registration tests and Expo Doctor**

Run:

```bash
npm test
npx expo-doctor
```

Expected: all registration tests PASS and Expo Doctor reports 20/20 checks.

- [ ] **Step 8: Commit registration**

```bash
git add package.json package-lock.json app.json src/lib/pushRegistration.mjs src/lib/notificationsData.js src/context/NotificationsContext.js tests/pushRegistration.test.mjs
git commit -m "feat: register mobile push installations"
```

---

### Task 6: Route notification taps to offers or transient notification UI

**Files:**
- Create: `src/lib/notificationRouting.mjs`
- Create: `src/components/NotificationResponseHandler.js`
- Modify: `src/context/NotificationsContext.js`
- Modify: `src/components/NotificationsSheet.js`
- Modify: `src/screens/HomeScreen.js`
- Modify: `App.js`
- Create: `tests/notificationRouting.test.mjs`

**Interfaces:**
- `notificationRoute(content): { kind: "offer", offerId } | { kind: "inbox", notification }`.
- `NotificationsContext.ingestPush(content)` adds one transient notification keyed by notification request identifier.
- `NotificationResponseHandler` handles foreground receipt, cold-start response, and tap response exactly once.

- [ ] **Step 1: Write failing routing tests**

Create `tests/notificationRouting.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { notificationRoute } from "../src/lib/notificationRouting.mjs";

test("routes linked pushes to the offer", () => {
  assert.deepEqual(notificationRoute({ title: "Sale", body: "Today", data: { offerId: "offer-1" } }), {
    kind: "offer",
    offerId: "offer-1",
  });
});

test("routes normal pushes to transient notifications", () => {
  assert.deepEqual(notificationRoute({ title: "Hello", body: "News", data: {} }), {
    kind: "inbox",
    notification: { title: "Hello", body: "News", offerId: null },
  });
});
```

- [ ] **Step 2: Verify the routing tests fail**

Run: `npm test`

Expected: FAIL resolving `notificationRouting.mjs`.

- [ ] **Step 3: Implement the pure routing function**

Create `notificationRouting.mjs`:

```js
export function notificationRoute(content = {}) {
  const offerId = typeof content?.data?.offerId === "string" ? content.data.offerId.trim() : "";
  if (offerId) return { kind: "offer", offerId };
  return {
    kind: "inbox",
    notification: {
      title: typeof content.title === "string" ? content.title : "SmartRest",
      body: typeof content.body === "string" ? content.body : "",
      offerId: null,
    },
  };
}
```

- [ ] **Step 4: Add transient notifications to context and sheet**

Add these declarations to `NotificationsContext`:

```js
const [transientNotifications, setTransientNotifications] = useState([]);

const ingestPush = useCallback((content = {}, identifier) => {
  const next = {
    id: identifier || `push-${Date.now()}`,
    title: typeof content.title === "string" ? content.title : "SmartRest",
    body: typeof content.body === "string" ? content.body : "",
    offerId: typeof content?.data?.offerId === "string" ? content.data.offerId : null,
    isRead: false,
    isTransient: true,
    createdAt: new Date().toISOString(),
  };
  setTransientNotifications((current) =>
    current.some((item) => item.id === next.id) ? current : [next, ...current]
  );
}, []);

const visibleNotifications = useMemo(
  () => [...transientNotifications, ...notifications],
  [transientNotifications, notifications]
);
```

Change `unreadCount` to use `visibleNotifications`. At the start of `markRead`, handle transient rows without a database write:

```js
const transient = transientNotifications.some((item) => item.id === id);
if (transient) {
  setTransientNotifications((current) =>
    current.map((item) => item.id === id ? { ...item, isRead: true } : item)
  );
  return;
}
```

Make `markAllRead` update both arrays, and expose `{ notifications: visibleNotifications, ingestPush, ... }` from the context value. Import `useCallback` from React. `NotificationsSheet` then needs no new persistence logic because it already renders `notifications` and calls `markRead`.

- [ ] **Step 5: Add the response handler**

Create `NotificationResponseHandler.js`:

```js
import { useCallback, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useCart } from "../context/CartContext";
import { useMenuData } from "../context/MenuDataContext";
import { useNotifications } from "../context/NotificationsContext";
import { notificationRoute } from "../lib/notificationRouting.mjs";

export default function NotificationResponseHandler({ navigationRef }) {
  const { offers, isLoading } = useMenuData();
  const { applyOffer } = useCart();
  const { ingestPush } = useNotifications();
  const handled = useRef(new Set());
  const pending = useRef(null);

  const handle = useCallback((notification) => {
    const id = notification?.request?.identifier;
    if (id && handled.current.has(id)) return;
    const route = notificationRoute(notification?.request?.content);
    if (route.kind === "offer") {
      if (isLoading) {
        pending.current = notification;
        return;
      }
      const offer = offers.find((candidate) => candidate.id === route.offerId);
      if (offer) {
        if (id) handled.current.add(id);
        applyOffer(offer);
        navigationRef.navigate("Checkout");
        return;
      }
    }
    if (id) handled.current.add(id);
    ingestPush(notification?.request?.content, id);
    navigationRef.navigate("MainTabs", { screen: "Home", params: { openNotifications: true } });
  }, [applyOffer, ingestPush, isLoading, navigationRef, offers]);

  useEffect(() => {
    if (!isLoading && pending.current) {
      const notification = pending.current;
      pending.current = null;
      handle(notification);
    }
  }, [handle, isLoading]);

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification) handle(response.notification);
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handle(response.notification);
    });
    const receiveSubscription = Notifications.addNotificationReceivedListener((notification) => {
      ingestPush(notification.request.content, notification.request.identifier);
    });
    return () => {
      responseSubscription.remove();
      receiveSubscription.remove();
    };
  }, [handle, ingestPush]);

  return null;
}
```

- [ ] **Step 6: Let Home open the sheet from navigation state**

Change the signature to `HomeScreen({ navigation, route })` and add:

```js
useEffect(() => {
  if (!route.params?.openNotifications) return;
  setIsNotificationsSheetOpen(true);
  navigation.setParams({ openNotifications: undefined });
}, [navigation, route.params?.openNotifications]);
```

- [ ] **Step 7: Mount the handler inside navigation**

In `App.js`, import `createNavigationContainerRef` and `NotificationResponseHandler`, define `const navigationRef = createNavigationContainerRef();` at module scope, and change the container to:

```jsx
<NavigationContainer ref={navigationRef}>
  <NotificationResponseHandler navigationRef={navigationRef} />
  <RootNavigator />
</NavigationContainer>
```

The handler is mounted where all menu/cart/notification providers are available and uses the explicit root ref instead of `useNavigation` outside a navigator screen.

- [ ] **Step 8: Run mobile tests and Doctor**

Run: `npm test && npx expo-doctor`

Expected: routing and registration tests PASS; Doctor reports 20/20.

- [ ] **Step 9: Commit tap routing**

```bash
git add App.js src/lib/notificationRouting.mjs src/components/NotificationResponseHandler.js src/context/NotificationsContext.js src/components/NotificationsSheet.js src/screens/HomeScreen.js tests/notificationRouting.test.mjs
git commit -m "feat: route push notification taps"
```

---

### Task 7: Deploy Supabase notification backend

**Files:**
- No new source files; deploy committed `../smartrestaicustomer/supabase/**`.

**Interfaces:**
- Remote project: `uvrngxhovpzlxevkigoc`.
- Remote functions: `register-push-token`, `broadcast-push`.

- [ ] **Step 1: Verify CLI and linked state after disk cleanup**

Run:

```bash
cd ../smartrestaicustomer
npx supabase --version
npx supabase migration list --linked
npm run db:push:dry
```

Expected: CLI version prints, linked migration history loads, dry run lists only intended pending SQL.

- [ ] **Step 2: Apply schema migration**

Run: `npm run db:push`

Expected: migration applied once with exit 0.

- [ ] **Step 3: Deploy functions using discovered CLI syntax**

Run `npx supabase functions deploy --help`, then deploy:

```bash
npx supabase functions deploy register-push-token --project-ref uvrngxhovpzlxevkigoc
npx supabase functions deploy broadcast-push --project-ref uvrngxhovpzlxevkigoc
```

Expected: both functions report deployed.

- [ ] **Step 4: Configure optional Expo enhanced-security secret**

If Expo Enhanced Security is enabled, create an Expo access token in the Expo dashboard and run `npx supabase secrets set EXPO_ACCESS_TOKEN` interactively. Never put the token in `.env`, Git, app config, or command output. If Enhanced Security is disabled, explicitly verify the function omits the Authorization header.

- [ ] **Step 5: Verify server authorization**

Invoke `broadcast-push` without a user session and as a non-owner test user; both must return 401/403 and must not call Expo. Invoke as the owner with no registered tokens; expect 200 and `{ recipientCount: 0, acceptedCount: 0, rejectedCount: 0, skippedCount: 0 }`.

---

### Task 8: Regenerate, build, and open the iOS workspace

**Files:**
- Regenerate (gitignored): `ios/`
- Verify: `ios/smartrestaimobile.xcworkspace`

**Interfaces:**
- Xcode: `/Users/vardhanreddy/Downloads/Xcode.app` version 26.6.
- Simulator: iPhone 17 Pro / iOS 26.3.

- [ ] **Step 1: Enforce disk preflight**

Run: `df -h /System/Volumes/Data`

Expected: at least 8 GB available. If less, stop and ask the user to approve cleanup; do not delete personal files or broad directories.

- [ ] **Step 2: Configure APNs credentials**

Run `npx eas-cli credentials --platform ios`, select bundle ID `com.smartrestai.SmartRestAI`, and configure an Apple Push Notifications key under the intended paid Apple Developer team. Do not expose the `.p8` key or credentials in logs or Git.

- [ ] **Step 3: Regenerate iOS from app config**

Run:

```bash
DEVELOPER_DIR=/Users/vardhanreddy/Downloads/Xcode.app/Contents/Developer npx expo prebuild --platform ios --clean --no-install
PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH" RUBYOPT=-rlogger DEVELOPER_DIR=/Users/vardhanreddy/Downloads/Xcode.app/Contents/Developer pod install --project-directory=ios
```

Expected: `ios/smartrestaimobile.xcworkspace` exists and pod install exits 0. Old-system-Ruby precompiled-module warnings are acceptable only if pods fall back to source and installation completes.

- [ ] **Step 4: Verify schemes and build the simulator app**

Run:

```bash
DEVELOPER_DIR=/Users/vardhanreddy/Downloads/Xcode.app/Contents/Developer xcodebuild -list -workspace ios/smartrestaimobile.xcworkspace
DEVELOPER_DIR=/Users/vardhanreddy/Downloads/Xcode.app/Contents/Developer npx expo run:ios --device "iPhone 17 Pro"
```

Expected: `smartrestaimobile` scheme is listed, build succeeds, app installs, and Metro starts.

- [ ] **Step 5: Open the correct workspace**

Run:

```bash
open -a /Users/vardhanreddy/Downloads/Xcode.app ios/smartrestaimobile.xcworkspace
```

Expected: Xcode opens the generated workspace, not the old `SmartRestAI/SmartRestAI.xcodeproj` SwiftUI template.

---

### Task 9: End-to-end iOS notification verification

**Files:**
- No source changes unless a failing test identifies a defect.

**Interfaces:**
- Owner web app sends `{ title, body, offerId? }`.
- Mobile build registers token and receives push.

- [ ] **Step 1: Verify registration**

Launch the native app, sign in, grant notification permission, and inspect the Edge Function log/database through a privileged query. Confirm exactly one active row for the simulator/device installation and no public token read access.

- [ ] **Step 2: Verify foreground delivery**

Send a normal broadcast from the owner app while mobile is foregrounded. Expect a banner/sound and accepted count of 1 or more. Tap it and confirm Home opens its sheet with the transient title/body.

- [ ] **Step 3: Verify offer routing**

Send a broadcast linked to an existing offer. Tap it and confirm the matching offer is applied and Checkout opens.

- [ ] **Step 4: Verify background and terminated delivery**

Repeat with the app backgrounded, then force-terminated. Expect receipt in both states and correct tap routing after cold launch.

- [ ] **Step 5: Run all repository checks**

Run:

```bash
cd ../smartrestaicustomer && npm test
cd ../smartrestownerai && npm test && npm run lint && npm run build
cd ../smartrestaimobile && npm test && npx expo-doctor
```

Expected: every command exits 0; Expo Doctor reports 20/20.

- [ ] **Step 6: Record Android handoff**

Document that shared Android code is complete and that release verification still requires the Android package registration, FCM v1 service account credentials, and an Android native/development build. Do not claim Android delivery has been verified before those credentials and build exist.
