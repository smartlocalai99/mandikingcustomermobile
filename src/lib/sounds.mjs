// Pure, testable core: given an adapter that knows how to play a named
// sound, wraps each call so audio failures never surface to the caller.
// Audio is a nice-to-have layered on top of an interaction — it must never
// be able to break the thing it's attached to.
export function createSoundPlayer(adapter) {
  const play = (key) => {
    try {
      const outcome = adapter.play(key);
      if (outcome && typeof outcome.catch === "function") {
        outcome.catch(() => {});
      }
    } catch {
      // ignore — sound is not essential to the interaction
    }
  };

  return {
    playFavoriteAdded: () => play("favoriteAdded"),
    playFavoriteRemoved: () => play("favoriteRemoved"),
    playOrderSuccess: () => play("orderSuccess"),
  };
}
