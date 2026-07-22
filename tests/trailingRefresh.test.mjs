import assert from "node:assert/strict";
import test from "node:test";
import { createTrailingRefresh } from "../src/lib/trailingRefresh.mjs";

test("coalesces refresh triggers during a running task", async () => {
  let calls = 0;
  let release;
  const firstTask = new Promise((resolve) => { release = resolve; });
  const refresh = createTrailingRefresh(async () => {
    calls += 1;
    if (calls === 1) await firstTask;
  }, { delayMs: 0 });

  const pending = refresh();
  refresh();
  refresh();
  release();
  await pending;
  assert.equal(calls, 2);
});
