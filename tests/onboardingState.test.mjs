import assert from "node:assert/strict";
import test from "node:test";
import { nextOnboardingStep, shouldShowOnboarding } from "../src/lib/onboardingState.mjs";

test("shows onboarding until it is explicitly completed", () => {
  assert.equal(shouldShowOnboarding(null), true);
  assert.equal(shouldShowOnboarding({ completed: false }), true);
  assert.equal(shouldShowOnboarding({ completed: true }), false);
});

test("completes onboarding after notification permission without requesting location", () => {
  assert.equal(nextOnboardingStep("welcome"), "notifications");
  assert.equal(nextOnboardingStep("notifications"), "complete");
});
