export function shouldShowOnboarding(snapshot) {
  return snapshot?.completed !== true;
}

export function nextOnboardingStep(step) {
  return {
    welcome: "notifications",
    notifications: "complete",
  }[step] ?? "complete";
}
