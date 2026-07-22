import assert from "node:assert/strict";
import test from "node:test";
import { customerDesign } from "../src/constants/customerDesign.mjs";

test("veg toggle knob stays fully inside the track at both rest positions", () => {
  const { width, trackPadding, knobSize, knobLeftOff, knobLeftOn } = customerDesign.toggle;

  assert.ok(knobLeftOff >= trackPadding, "off position clips the left edge of the track");
  assert.ok(
    knobLeftOff + knobSize <= width - trackPadding,
    "off position overflows the right edge of the track"
  );
  assert.ok(knobLeftOn >= trackPadding, "on position clips the left edge of the track");
  assert.ok(
    knobLeftOn + knobSize <= width - trackPadding,
    "on position overflows the right edge of the track"
  );
});
