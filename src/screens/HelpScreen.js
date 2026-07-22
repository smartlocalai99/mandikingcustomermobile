import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";

const SUPPORT_PHONE = "+919000000000";
const SUPPORT_EMAIL = "hello@smartrest.in";

const CONTACT_OPTIONS = [
  { label: "Call us", detail: "+91 90000 00000", icon: "call-outline", url: `tel:${SUPPORT_PHONE}` },
  { label: "WhatsApp", detail: "Chat with our team", icon: "logo-whatsapp", url: `https://wa.me/${SUPPORT_PHONE.replace("+", "")}` },
  { label: "Email", detail: SUPPORT_EMAIL, icon: "mail-outline", url: `mailto:${SUPPORT_EMAIL}` },
];

const FAQS = [
  {
    q: "How do I track my order?",
    a: "Open the Orders tab from the bottom navigation. Every order you place shows its live status there, from preparing to out for delivery.",
  },
  {
    q: "What area and hours do you deliver in?",
    a: "We deliver across Kadapa daily from 11 AM to 11 PM. If you're near our kitchen, orders usually arrive within 30–40 minutes.",
  },
  {
    q: "Can I cancel or change my order after placing it?",
    a: "Call or WhatsApp us right away — we can usually adjust an order before the kitchen starts cooking, but not once preparation has begun.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Cash on Delivery and UPI. Set your preferred option under Account → Payment Methods, and you can still change it at checkout.",
  },
  {
    q: "Do you have vegetarian options?",
    a: "Yes — flip the VEG toggle on the home screen to filter the entire menu down to vegetarian dishes only.",
  },
  {
    q: "Is there a delivery fee?",
    a: "Delivery fee is calculated based on your distance from the restaurant, shown clearly on the checkout screen before you pay.",
  },
];

function FaqItem({ q, a, isOpen, onToggle }) {
  return (
    <View style={styles.faqItem}>
      <Pressable onPress={onToggle} style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{q}</Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
      </Pressable>
      {isOpen ? <Text style={styles.faqAnswer}>{a}</Text> : null}
    </View>
  );
}

export default function HelpScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [openIndex, setOpenIndex] = useState(0);
  const canGoBack = navigation.canGoBack();

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        {canGoBack ? (
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color={colors.white} />
          </Pressable>
        ) : null}
        <Text style={styles.headerTitle}>Help & Support</Text>
        <Text style={styles.headerSubtitle}>We're here if something's not right</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.contactRow}>
          {CONTACT_OPTIONS.map(({ label, detail, icon, url }) => (
            <Pressable key={label} onPress={() => Linking.openURL(url)} style={styles.contactCard}>
              <View style={styles.contactIcon}>
                <Ionicons name={icon} size={20} color="#b3402a" />
              </View>
              <Text style={styles.contactLabel}>{label}</Text>
              <Text style={styles.contactDetail} numberOfLines={2}>
                {detail}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={styles.faqTitle}>Frequently asked questions</Text>
          <View>
            {FAQS.map((item, index) => (
              <FaqItem
                key={item.q}
                q={item.q}
                a={item.a}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingBottom: 20 },
  backButton: { marginBottom: 12, height: 36, width: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: colors.white },
  headerSubtitle: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  contactRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  contactCard: { flex: 1, alignItems: "center", gap: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 16, paddingHorizontal: 6 },
  contactIcon: { height: 40, width: 40, borderRadius: 20, backgroundColor: colors.offWhite, alignItems: "center", justifyContent: "center" },
  contactLabel: { fontSize: 12, fontWeight: "900", color: colors.textPrimary },
  contactDetail: { fontSize: 10, fontWeight: "600", color: colors.textFaint, textAlign: "center" },
  faqTitle: { fontSize: 15, fontWeight: "900", color: colors.textPrimary },
  faqItem: { borderBottomWidth: 1, borderBottomColor: "#f4eee9", paddingVertical: 12 },
  faqHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: "900", color: colors.textPrimary },
  faqAnswer: { marginTop: 8, fontSize: 13, fontWeight: "600", color: colors.textMuted, lineHeight: 19 },
});
