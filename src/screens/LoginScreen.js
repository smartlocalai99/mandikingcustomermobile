import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { useAuth } from "../context/AuthContext";
import { authenticateWithBiometrics, getBiometricButtonLabel } from "../lib/biometricAuth";

function PhoneStep({ phone, onChange, onSubmit, isAuthenticating, error, buttonLabel }) {
  const isValid = phone.length === 10;

  return (
    <View style={styles.stepBody}>
      <Image source={require("../../assets/bannerlogin.png")} style={styles.banner} contentFit="contain" />

      <View style={styles.centerText}>
        <Text style={styles.title}>
          Fuel your <Text style={{ color: colors.primary }}>Cravings!</Text>
        </Text>
        <Text style={styles.subtitle}>Enter your mobile number, then unlock the app with Face ID.</Text>
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
          placeholder="Enter 10-digit mobile number"
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

function NameStep({ name, onChange, onSubmit, isSaving, error }) {
  const isValid = name.trim().length >= 2;
  return (
    <View style={styles.stepBody}>
      <Image source={require("../../assets/bannerlogin.png")} style={styles.banner} contentFit="contain" />
      <View style={styles.centerText}>
        <Text style={styles.title}>What should we call you?</Text>
        <Text style={styles.subtitle}>Save your name once for a more personal experience.</Text>
      </View>
      <TextInput
        value={name}
        onChangeText={onChange}
        autoFocus
        placeholder="Enter your name"
        placeholderTextColor="#9b9b9b"
        style={styles.nameInput}
        returnKeyType="done"
        onSubmitEditing={() => isValid && onSubmit()}
      />
      <View style={styles.errorSlot}>{error ? <Text style={styles.errorText}>{error}</Text> : null}</View>
      <Pressable disabled={!isValid || isSaving} onPress={onSubmit} style={[styles.primaryButton, !isValid || isSaving ? { opacity: 0.5 } : null]}>
        {isSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Save and continue</Text>}
      </Pressable>
    </View>
  );
}

export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, login, saveCustomerName, requiresName: authRequiresName } = useAuth();
  const [phone, setPhone] = useState(user?.phone || "");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authFailure, setAuthFailure] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Continue");
  const [needsName, setNeedsName] = useState(Boolean(authRequiresName && user?.phone));
  const [name, setName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  // Figure out what to call the button (Face ID vs Touch ID vs a plain
  // "Continue" when the device has no biometric hardware/enrollment, or the
  // current build predates expo-local-authentication being linked) once,
  // up front, so the phone step never has to guess.
  useEffect(() => {
    getBiometricButtonLabel().then(setButtonLabel);
  }, []);

  const finishLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("MainTabs", { screen: "Home" });
  };

  const handleContinue = async () => {
    console.log("[Login] handleContinue called, phone =", phone);
    if (isAuthenticating) {
      console.log("[Login] already authenticating, ignoring tap");
      return;
    }
    Keyboard.dismiss();
    setIsAuthenticating(true);
    setAuthFailure("");

    try {
      console.log("[Login] calling authenticateWithBiometrics");
      const biometricResult = await authenticateWithBiometrics("Verify it's you to continue");
      console.log("[Login] biometric result:", JSON.stringify(biometricResult));
      if (biometricResult.gated && !biometricResult.success) {
        console.log("[Login] biometric check failed, stopping here");
        if (biometricResult.error !== "user_cancel" && biometricResult.error !== "app_cancel") {
          setAuthFailure("Could not verify. Please try again.");
        }
        setIsAuthenticating(false);
        return;
      }

      console.log("[Login] calling login(phone)");
      const loginResult = await login(phone);
      if (loginResult?.needsName) {
        setNeedsName(true);
        return;
      }
      console.log("[Login] phone session unlocked, navigating back");
      finishLogin();
    } catch (error) {
      console.log("[Login] handleContinue threw:", error?.message, error);
      setAuthFailure(error?.message || "Unable to connect your account. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSaveName = async () => {
    if (isSavingName) return;
    setIsSavingName(true);
    setNameError("");
    try {
      await saveCustomerName(name);
      finishLogin();
    } catch (error) {
      setNameError(error?.message || "Could not save your name. Please try again.");
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { top: insets.top + 16 }]} hitSlop={8}>
        <Ionicons name="arrow-back" size={20} color="#333" />
      </Pressable>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.loginScrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {needsName ? (
            <NameStep name={name} onChange={setName} onSubmit={handleSaveName} isSaving={isSavingName} error={nameError} />
          ) : (
            <PhoneStep
              phone={phone}
              onChange={setPhone}
              onSubmit={handleContinue}
              isAuthenticating={isAuthenticating}
              error={authFailure}
              buttonLabel={buttonLabel}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  loginScrollContent: { flexGrow: 1 },
  stepBody: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 72, paddingBottom: 36 },
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
