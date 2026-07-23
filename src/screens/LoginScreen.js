import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";

const LOGIN_TIMEOUT_MS = 12000;

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

function PhoneStep({ phone, onChange, onSubmit, isAuthenticating, error, buttonLabel }) {
  const isValid = phone.length === 10;

  return (
    <View style={styles.stepBody}>
      <Image source={require("../../assets/bannerlogin.png")} style={styles.banner} contentFit="contain" />

      <View style={styles.centerText}>
        <Text style={styles.title}>
          Fuel your <Text style={{ color: colors.primary }}>Cravings!</Text>
        </Text>
        <Text style={styles.subtitle}>Enter your mobile number, then verify it's you with your phone's lock</Text>
      </View>

      <View style={styles.phoneField}>
        <Text style={styles.flag}>🇮🇳</Text>
        <Text style={styles.code}>+91</Text>
        <View style={styles.divider} />
        <TextInput
          value={phone}
          onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 10))}
          keyboardType="number-pad"
          maxLength={10}
          autoFocus
          placeholder="9866531011"
          placeholderTextColor="#9b9b9b"
          style={styles.phoneInput}
        />
      </View>

      <View style={styles.errorSlot}>{error ? <Text style={styles.errorText}>{error}</Text> : null}</View>

      <Pressable
        disabled={!isValid || isAuthenticating}
        onPress={onSubmit}
        style={[styles.primaryButton, !isValid || isAuthenticating ? { opacity: 0.5 } : null]}
      >
        {isAuthenticating ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}

function NameStep({ onSubmit, isSaving }) {
  const [name, setName] = useState("");
  const valid = name.trim().length >= 2;
  return (
    <View style={styles.stepBody}>
      <Image source={require("../../assets/bannerlogin.png")} style={styles.banner} contentFit="contain" />
      <View style={styles.centerText}>
        <Text style={styles.title}>What should we call you?</Text>
        <Text style={styles.subtitle}>Add your name so we can personalize your orders.</Text>
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder="Your name"
        placeholderTextColor="#9b9b9b"
        style={styles.nameInput}
        returnKeyType="done"
        onSubmitEditing={() => valid && onSubmit(name.trim())}
      />
      <Pressable disabled={!valid || isSaving} onPress={() => onSubmit(name.trim())} style={[styles.primaryButton, !valid || isSaving ? { opacity: 0.5 } : null]}>
        {isSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Continue</Text>}
      </Pressable>
    </View>
  );
}

const AUTH_TYPE_LABELS = {
  [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]: "Continue with Face ID",
  [LocalAuthentication.AuthenticationType.FINGERPRINT]: "Continue with Touch ID",
  [LocalAuthentication.AuthenticationType.IRIS]: "Continue with Iris ID",
};

export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { login, saveCustomerName } = useAuth();
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [authFailure, setAuthFailure] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Continue");

  // Figure out what to call the button (Face ID vs Touch ID vs a plain
  // "Continue" when the device has no biometric hardware/enrollment) once,
  // up front, so the phone step never has to guess.
  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
        if (!hasHardware || !isEnrolled) return;
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const preferred = types.find((type) => AUTH_TYPE_LABELS[type]);
        if (preferred) setButtonLabel(AUTH_TYPE_LABELS[preferred]);
      } catch {
        // Keep the plain "Continue" label — biometrics are a bonus, not a requirement.
      }
    })();
  }, []);

  const handleContinue = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthFailure("");

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;

      // Only gate on biometrics when the device actually supports and has
      // them set up. A phone with no Face ID/Touch ID/passcode enrolled
      // shouldn't be locked out of the app entirely over it.
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Verify it's you to continue",
          disableDeviceFallback: false,
        });
        if (!result.success) {
          if (result.error !== "user_cancel" && result.error !== "app_cancel") {
            setAuthFailure("Could not verify. Please try again.");
          }
          setIsAuthenticating(false);
          return;
        }
      }

      const user = await withTimeout(
        login(phone),
        LOGIN_TIMEOUT_MS,
        "That's taking too long. Check your connection and try again."
      );
      if (!user.name) {
        setStep("name");
        return;
      }
      setTimeout(() => navigation.goBack(), 300);
    } catch (error) {
      setAuthFailure(error?.message || "Unable to connect your account. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleName = async (name) => {
    setIsSavingName(true);
    try {
      await saveCustomerName(name);
      navigation.goBack();
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { top: insets.top + 16 }]} hitSlop={8}>
        <Ionicons name="arrow-back" size={20} color="#333" />
      </Pressable>

      {step === "phone" ? (
        <PhoneStep
          phone={phone}
          onChange={setPhone}
          onSubmit={handleContinue}
          isAuthenticating={isAuthenticating}
          error={authFailure}
          buttonLabel={buttonLabel}
        />
      ) : (
        <NameStep onSubmit={handleName} isSaving={isSavingName} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 20,
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBody: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 72, paddingBottom: 24 },
  banner: { width: 260, height: 200 },
  centerText: { marginTop: 20, alignItems: "center" },
  title: { fontSize: 26, fontWeight: "900", color: "#222" },
  subtitle: { marginTop: 8, fontSize: 13, fontWeight: "600", color: "#9b9b9b", textAlign: "center", maxWidth: 280, lineHeight: 19 },
  phoneField: {
    marginTop: 32,
    height: 56,
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  flag: { fontSize: 18 },
  code: { fontSize: 15, fontWeight: "900", color: "#4a4a4a" },
  divider: { height: 24, width: 1, backgroundColor: "#d5d5d5" },
  phoneInput: { flex: 1, fontSize: 16, fontWeight: "700", color: "#333" },
  nameInput: { marginTop: 32, height: 56, width: "100%", borderRadius: 12, backgroundColor: "#f2f2f2", paddingHorizontal: 16, fontSize: 16, fontWeight: "700", color: "#333" },
  primaryButton: {
    marginTop: 24,
    height: 54,
    width: "100%",
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { fontSize: 16, fontWeight: "800", color: colors.white },
  errorSlot: { marginTop: 12, minHeight: 20 },
  errorText: { fontSize: 12, fontWeight: "800", color: colors.favoriteRed, textAlign: "center" },
});
