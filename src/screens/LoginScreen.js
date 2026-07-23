import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
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

const OTP_LENGTH = 4;
const VALID_OTP = "1234";
const RESEND_SECONDS = 30;
const LOGIN_TIMEOUT_MS = 12000;

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

function PhoneStep({ phone, onChange, onSubmit, isSending }) {
  const isValid = phone.length === 10;

  return (
    <View style={styles.stepBody}>
      <Image source={require("../../assets/bannerlogin.png")} style={styles.banner} contentFit="contain" />

      <View style={styles.centerText}>
        <Text style={styles.title}>
          Fuel your <Text style={{ color: colors.primary }}>Cravings!</Text>
        </Text>
        <Text style={styles.subtitle}>Please enter your valid mobile number to get verified</Text>
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

      <Pressable
        disabled={!isValid || isSending}
        onPress={onSubmit}
        style={[styles.primaryButton, !isValid || isSending ? { opacity: 0.5 } : null]}
      >
        {isSending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Login</Text>}
      </Pressable>
    </View>
  );
}

function OtpStep({ onVerified, onBack }) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRefs = useRef([]);
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const code = digits.join("");

  const attemptVerify = (candidate) => {
    setIsVerifying(true);
    setError("");
    setTimeout(async () => {
      if (candidate === VALID_OTP) {
        try {
          await onVerified();
          // onVerified is expected to navigate away (step change or
          // goBack). Resetting here too means a stalled or no-op
          // navigation never leaves the spinner running forever with no
          // way to recover.
          setIsVerifying(false);
        } catch (verificationError) {
          setIsVerifying(false);
          hasAttemptedRef.current = false;
          setError(verificationError?.message || "Unable to connect your account. Please try again.");
        }
      } else {
        setIsVerifying(false);
        hasAttemptedRef.current = false;
        setError("That code doesn't match. Try 1234 for this demo.");
        setDigits(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      }
    }, 500);
  };

  // Verification is triggered here, from an effect watching the assembled
  // code, rather than from inside the setDigits updater above. Updater
  // functions can run more than once for the same state transition (React
  // dev-mode double-invocation, fast re-renders), and attemptVerify has
  // side effects (network call, keyboard dismiss) that must only fire once
  // per completed code — hasAttemptedRef guards that.
  useEffect(() => {
    if (code.length === OTP_LENGTH && !hasAttemptedRef.current && !isVerifying) {
      hasAttemptedRef.current = true;
      Keyboard.dismiss();
      attemptVerify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const setDigitAt = (index, value) => {
    // maxLength={1} on each box means a single keystroke is all this ever
    // receives in practice, but handle a bulk paste/autofill value
    // defensively anyway by spreading it across this box and the ones
    // after it instead of keeping only the first character.
    const incoming = value.replace(/\D/g, "");

    setDigits((current) => {
      const next = [...current];
      if (!incoming) {
        next[index] = "";
        return next;
      }
      let cursor = index;
      for (const char of incoming) {
        if (cursor >= OTP_LENGTH) break;
        next[cursor] = char;
        cursor += 1;
      }
      return next;
    });

    if (incoming) {
      const focusIndex = Math.min(index + incoming.length, OTP_LENGTH - 1);
      requestAnimationFrame(() => inputRefs.current[focusIndex]?.focus());
    }
  };

  const handleKeyPress = (index, event) => {
    if (event.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.stepBody}>
      <Image source={require("../../assets/bannerlogin.png")} style={styles.banner} contentFit="contain" />

      <View style={styles.centerText}>
        <Text style={styles.title}>Verification</Text>
        <Text style={styles.subtitle}>We just sent you an SMS With 6 digit verification code on your number</Text>
      </View>

      <View style={styles.otpRow}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            value={digit}
            editable={!isVerifying}
            onChangeText={(value) => setDigitAt(index, value)}
            onKeyPress={(event) => handleKeyPress(index, event)}
            keyboardType="number-pad"
            maxLength={1}
            style={[
              styles.otpBox,
              error ? styles.otpBoxError : digit ? styles.otpBoxFilled : styles.otpBoxEmpty,
            ]}
          />
        ))}
      </View>

      <View style={styles.errorSlot}>{error ? <Text style={styles.errorText}>{error}</Text> : null}</View>

      <Pressable
        disabled={code.length !== OTP_LENGTH || isVerifying}
        onPress={() => {
          hasAttemptedRef.current = true;
          attemptVerify(code);
        }}
        style={[styles.primaryButton, code.length !== OTP_LENGTH || isVerifying ? { opacity: 0.5 } : null]}
      >
        {isVerifying ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Verify</Text>}
      </Pressable>

      <View style={styles.footerLinks}>
        {secondsLeft > 0 ? (
          <Text style={styles.footerMuted}>Resend code in 0:{String(secondsLeft).padStart(2, "0")}</Text>
        ) : (
          <Pressable onPress={() => setSecondsLeft(RESEND_SECONDS)}>
            <Text style={styles.footerLink}>Resend OTP</Text>
          </Pressable>
        )}
        <Pressable onPress={onBack}>
          <Text style={styles.footerMutedUnderline}>Change mobile number</Text>
        </Pressable>
      </View>
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

export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { login, saveCustomerName } = useAuth();
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const handleSendOtp = () => {
    if (isSending) return;
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setStep("otp");
    }, 700);
  };

  const handleVerified = async () => {
    const user = await withTimeout(
      login(phone),
      LOGIN_TIMEOUT_MS,
      "That's taking too long. Check your connection and try again."
    );
    if (!user.name) {
      setStep("name");
      return;
    }
    setTimeout(() => navigation.goBack(), 400);
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

  const handleBack = () => {
    if (step === "otp") {
      setStep("phone");
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Pressable onPress={handleBack} style={[styles.backButton, { top: insets.top + 16 }]} hitSlop={8}>
        <Ionicons name="arrow-back" size={20} color="#333" />
      </Pressable>

      {step === "phone" ? (
        <PhoneStep phone={phone} onChange={setPhone} onSubmit={handleSendOtp} isSending={isSending} />
      ) : step === "otp" ? (
        <OtpStep onVerified={handleVerified} onBack={() => setStep("phone")} />
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
  otpRow: { marginTop: 32, flexDirection: "row", justifyContent: "space-between", width: "100%", maxWidth: 320, gap: 8 },
  otpBox: {
    height: 56,
    width: 48,
    borderRadius: 12,
    borderWidth: 2,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#333",
  },
  otpBoxEmpty: { borderColor: "#eee", backgroundColor: "#f8f8f8" },
  otpBoxFilled: { borderColor: colors.primary, backgroundColor: colors.white },
  otpBoxError: { borderColor: colors.favoriteRed, backgroundColor: colors.white },
  errorSlot: { marginTop: 12, minHeight: 20 },
  errorText: { fontSize: 12, fontWeight: "800", color: colors.favoriteRed, textAlign: "center" },
  footerLinks: { marginTop: Platform.select({ ios: 4, android: 4 }), alignItems: "center", gap: 16 },
  footerMuted: { fontSize: 13, fontWeight: "700", color: "#9b9b9b" },
  footerLink: { fontSize: 13, fontWeight: "800", color: colors.primary },
  footerMutedUnderline: { fontSize: 13, fontWeight: "700", color: "#7a7a7a", textDecorationLine: "underline" },
});
