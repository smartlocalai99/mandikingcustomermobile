import assert from "node:assert/strict";
import test from "node:test";
import { nextOnboardingStep, shouldShowOnboarding } from "../src/lib/onboardingState.mjs";

test("shows onboarding until it is explicitly completed", () => {
  assert.equal(shouldShowOnboarding(null), true);
  assert.equal(shouldShowOnboarding({ completed: false }), true);
  assert.equal(shouldShowOnboarding({ completed: true }), false);
});

test("moves through welcome, notifications, location, and confirmation", () => {
  assert.equal(nextOnboardingStep("welcome"), "notifications");
  assert.equal(nextOnboardingStep("notifications"), "location");
  assert.equal(nextOnboardingStep("location"), "confirm-location");
  assert.equal(nextOnboardingStep("confirm-location"), "complete");
});
