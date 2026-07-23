import "react-native-gesture-handler";
import { ActivityIndicator, LogBox, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createNavigationContainerRef, NavigationContainer } from "@react-navigation/native";
import { MenuDataProvider } from "./src/context/MenuDataContext";
import { AuthProvider } from "./src/context/AuthContext";
import { NotificationsProvider } from "./src/context/NotificationsContext";
import { CartProvider } from "./src/context/CartContext";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { OrdersProvider } from "./src/context/OrdersContext";
import { AddressProvider } from "./src/context/AddressContext";
import { PaymentProvider } from "./src/context/PaymentContext";
import { OnboardingProvider, useOnboarding } from "./src/context/OnboardingContext";
import RootNavigator from "./src/navigation/RootNavigator";
import NotificationResponseHandler from "./src/components/NotificationResponseHandler";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { colors } from "./src/constants/colors";

const navigationRef = createNavigationContainerRef();

// Sound effects are guarded (soundAssets.js) and never crash — but on a
// dev-client build compiled before expo-audio was linked natively, the
// module's own top-level requireNativeModule() call still logs a red
// LogBox screen the instant a sound is attempted, even though the app
// keeps working underneath. That's confusing on a device, not a real bug,
// so it's suppressed here until the next native rebuild picks up the module.
LogBox.ignoreLogs(["Cannot find native module 'ExpoAudio'"]);

function AppContent() {
  const { isReady, needsOnboarding } = useOnboarding();

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (needsOnboarding) return <OnboardingScreen />;

  return (
    <NavigationContainer ref={navigationRef}>
      <NotificationResponseHandler navigationRef={navigationRef} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <OnboardingProvider>
          <MenuDataProvider>
            <AuthProvider>
              <NotificationsProvider>
                <CartProvider>
                  <FavoritesProvider>
                    <OrdersProvider>
                      <AddressProvider>
                        <PaymentProvider>
                          <StatusBar style="light" />
                          <AppContent />
                        </PaymentProvider>
                      </AddressProvider>
                    </OrdersProvider>
                  </FavoritesProvider>
                </CartProvider>
              </NotificationsProvider>
            </AuthProvider>
          </MenuDataProvider>
        </OnboardingProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
