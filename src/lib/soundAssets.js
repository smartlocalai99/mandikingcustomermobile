import { createSoundPlayer } from "./sounds.mjs";

const SOURCES = {
  favoriteAdded: require("../../assets/sounds/favorite-added.wav"),
  favoriteRemoved: require("../../assets/sounds/favorite-removed.wav"),
  orderSuccess: require("../../assets/sounds/order-success.wav"),
};

const players = {};
// expo-audio is a native module: it only exists in a build that was
// actually compiled with it linked in. A dev client installed before this
// dependency was added won't have it, and a *static* `import` of the
// package throws at bundle-evaluation time — before app startup — taking
// the whole app down with it. Resolving it lazily, inside the one place
// it's used, means a stale native binary just loses sound effects instead
// of crashing on launch.
let audioModule = null;
let hasLoggedMissingModule = false;

function getPlayer(key) {
  if (!audioModule) audioModule = require("expo-audio");
  if (!players[key]) players[key] = audioModule.createAudioPlayer(SOURCES[key]);
  return players[key];
}

const nativeAdapter = {
  play(key) {
    try {
      const player = getPlayer(key);
      player.seekTo(0).catch(() => {});
      player.play();
    } catch (error) {
      if (!hasLoggedMissingModule) {
        hasLoggedMissingModule = true;
        console.warn("Sound effects are unavailable until the app is rebuilt with expo-audio linked.", error);
      }
    }
  },
};

const soundPlayer = createSoundPlayer(nativeAdapter);

export const playFavoriteAddedSound = soundPlayer.playFavoriteAdded;
export const playFavoriteRemovedSound = soundPlayer.playFavoriteRemoved;
export const playOrderSuccessSound = soundPlayer.playOrderSuccess;
