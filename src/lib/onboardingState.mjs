export function shouldShowOnboarding(snapshot) {
  return snapshot?.completed !== true;
}

export function nextOnboardingStep(step) {
  return {
    welcome: "notifications",
    notifications: "location",
    location: "confirm-location",
    "confirm-location": "complete",
  }[step] ?? "complete";
}
