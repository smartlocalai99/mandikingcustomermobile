import assert from "node:assert/strict";
import test from "node:test";
import { createSoundPlayer } from "../src/lib/sounds.mjs";

test("plays the correct key for each interaction", () => {
  const calls = [];
  const player = createSoundPlayer({ play: (key) => calls.push(key) });

  player.playFavoriteAdded();
  player.playFavoriteRemoved();
  player.playOrderSuccess();

  assert.deepEqual(calls, ["favoriteAdded", "favoriteRemoved", "orderSuccess"]);
});

test("swallows a synchronous adapter failure", () => {
  const player = createSoundPlayer({
    play: () => {
      throw new Error("no audio device");
    },
  });

  assert.doesNotThrow(() => player.playFavoriteAdded());
});

test("swallows an asynchronous adapter rejection", async () => {
  const player = createSoundPlayer({ play: () => Promise.reject(new Error("playback failed")) });

  assert.doesNotThrow(() => player.playOrderSuccess());
  // Let the rejected promise's .catch() run before the test process exits,
  // so an unhandled rejection can't leak past a "successful" call.
  await new Promise((resolve) => setImmediate(resolve));
});

test("does not throw when the adapter returns nothing", () => {
  const player = createSoundPlayer({ play: () => undefined });
  assert.doesNotThrow(() => player.playFavoriteRemoved());
});
