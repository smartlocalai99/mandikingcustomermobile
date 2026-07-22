import { useState } from "react";
import { Image } from "expo-image";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import { useOnboarding } from "../context/OnboardingContext";

const COPY = {
  welcome: {
    eyebrow: "WELCOME TO MANDI KINGS",
    title: "Fresh food, delivered your way.",
    body: "A faster, smoother ordering experience is ready for you.",
    action: "Get started",
  },
  notifications: {
    eyebrow: "STAY IN THE KNOW",
    title: "Never miss a fresh offer.",
    body: "We’ll send order updates and special offers from the restaurant.",
    action: "Allow notifications",
  },
  location: {
    eyebrow: "DELIVERY MADE EASY",
    title: "Find your delivery address.",
    body: "Allow location access to suggest your current address. You can enter one manually instead.",
    action: "Use my location",
  },
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { requestNotifications, requestLocation, completeOnboarding, locationState } = useOnboarding();
  const [step, setStep] = useState("welcome");
  const [isWorking, setIsWorking] = useState(false);

  const handleNotifications = async () => {
    setIsWorking(true);
    try {
      await requestNotifications();
    } finally {
      setIsWorking(false);
      setStep("location");
    }
  };

  const handleLocation = async () => {
    setIsWorking(true);
    try {
      await requestLocation();
      setStep("confirm-location");
    } catch {
      // The current error is shown by the location step without blocking manual entry.
    } finally {
      setIsWorking(false);
    }
  };

  const finishManually = () => completeOnboarding(null);
  const confirmLocation = () => completeOnboarding(locationState.address);
  const copy = COPY[step] ?? COPY.location;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.hero}>
        <Image source={require("../../assets/bannerlogin.png")} style={styles.banner} contentFit="contain" />
      </View>

      <View style={styles.content}>
        {step === "confirm-location" ? (
          <>
            <Text style={styles.eyebrow}>ADDRESS FOUND</Text>
            <Text style={styles.title}>Use this delivery address?</Text>
            <View style={styles.addressCard}>
              <Text style={styles.addressTitle}>{locationState.address?.landmark || "Current location"}</Text>
              <Text style={styles.addressLine}>{locationState.address?.line}</Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={confirmLocation}>
              <Text style={styles.primaryButtonText}>Confirm address</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={finishManually}>
              <Text style={styles.secondaryButtonText}>Enter manually instead</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.body}>{copy.body}</Text>

            {step === "location" && locationState.status === "error" ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{locationState.error?.message}</Text>
                {locationState.error?.canOpenSettings ? (
                  <Pressable onPress={() => Linking.openSettings()}>
                    <Text style={styles.settingsLink}>Open Settings</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Pressable
              style={[styles.primaryButton, isWorking ? styles.disabledButton : null]}
              onPress={step === "welcome" ? () => setStep("notifications") : step === "notifications" ? handleNotifications : handleLocation}
              disabled={isWorking}
            >
              <Text style={styles.primaryButtonText}>{isWorking ? "Please wait…" : copy.action}</Text>
            </Pressable>

            {step === "location" ? (
              <Pressable style={styles.secondaryButton} onPress={finishManually} disabled={isWorking}>
                <Text style={styles.secondaryButtonText}>Enter address manually</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, paddingHorizontal: 20 },
  hero: { flex: 0.9, justifyContent: "center", alignItems: "center" },
  banner: { width: "100%", height: "100%", maxHeight: 270 },
  content: { flex: 1, justifyContent: "flex-end", paddingBottom: 12 },
  eyebrow: { color: colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { marginTop: 10, color: colors.white, fontSize: 30, lineHeight: 35, fontWeight: "900" },
  body: { marginTop: 10, color: "rgba(255,255,255,0.78)", fontSize: 15, lineHeight: 22, fontWeight: "600" },
  addressCard: { marginTop: 18, borderRadius: 18, backgroundColor: colors.white, padding: 16 },
  addressTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "900" },
  addressLine: { marginTop: 5, color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  primaryButton: { marginTop: 22, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.gold },
  primaryButtonText: { color: colors.primary, fontSize: 15, fontWeight: "900" },
  secondaryButton: { height: 48, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  disabledButton: { opacity: 0.6 },
  errorCard: { marginTop: 16, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)", padding: 12 },
  errorText: { color: colors.white, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  settingsLink: { marginTop: 8, color: colors.gold, fontSize: 13, fontWeight: "900" },
});
