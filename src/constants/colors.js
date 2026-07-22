// Same palette as the customer web app (smartrestaicustomer), kept in sync
// by hand since the two apps don't share a build pipeline.
import { customerDesign } from "./customerDesign.mjs";

export const colors = {
  primary: customerDesign.colors.primary,
  primaryDark: customerDesign.colors.primaryDark,
  accentRed: "#b3402a",
  accentRedBright: "#b63b2d",
  favoriteRed: customerDesign.colors.favoriteRed,
  gold: customerDesign.colors.gold,
  success: "#3c7c5b",
  danger: "#c0402a",
  dangerBg: "#fdf1ef",
  warningBg: "#fdf6ea",
  warningText: "#8a5a10",
  cream: "#f5f5f5",
  creamAlt: "#f3ede4",
  offWhite: "#f7f0e8",
  border: "#f0e9e0",
  borderAlt: "#e4dcd2",
  textPrimary: "#241610",
  textSecondary: "#5f554c",
  textMuted: "#8b8580",
  textFaint: "#a99a8c",
  white: customerDesign.colors.white,
};
