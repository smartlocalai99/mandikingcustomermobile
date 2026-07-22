import assert from "node:assert/strict";
import test from "node:test";
import { readMenuCache, writeMenuCache } from "../src/lib/menuCache.mjs";

test("writes and reads a versioned menu snapshot", async () => {
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => values.set(key, value),
  };
  const snapshot = { profile: { name: "Mandi Kings" }, sections: [], offers: [], categories: [], savedAt: Date.now() };

  await writeMenuCache(storage, snapshot);
  assert.deepEqual(await readMenuCache(storage), snapshot);
});

test("rejects malformed or expired menu snapshots", async () => {
  const storage = {
    getItem: async () => JSON.stringify({ version: 1, profile: null, sections: [], offers: [], categories: [], savedAt: 0 }),
  };
  assert.equal(await readMenuCache(storage), null);
});
