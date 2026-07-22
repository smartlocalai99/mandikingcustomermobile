import { createAudioPlayer } from "expo-audio";
import { createSoundPlayer } from "./sounds.mjs";

const SOURCES = {
  favoriteAdded: require("../../assets/sounds/favorite-added.wav"),
  favoriteRemoved: require("../../assets/sounds/favorite-removed.wav"),
  orderSuccess: require("../../assets/sounds/order-success.wav"),
};

const players = {};

function getPlayer(key) {
  if (!players[key]) players[key] = createAudioPlayer(SOURCES[key]);
  return players[key];
}

const nativeAdapter = {
  play(key) {
    const player = getPlayer(key);
    player.seekTo(0).catch(() => {});
    player.play();
  },
};

const soundPlayer = createSoundPlayer(nativeAdapter);

export const playFavoriteAddedSound = soundPlayer.playFavoriteAdded;
export const playFavoriteRemovedSound = soundPlayer.playFavoriteRemoved;
export const playOrderSuccessSound = soundPlayer.playOrderSuccess;
