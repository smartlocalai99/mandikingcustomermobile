import "react-native-gesture-handler";
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
import RootNavigator from "./src/navigation/RootNavigator";
import NotificationResponseHandler from "./src/components/NotificationResponseHandler";

const navigationRef = createNavigationContainerRef();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MenuDataProvider>
          <AuthProvider>
            <NotificationsProvider>
              <CartProvider>
                <FavoritesProvider>
                  <OrdersProvider>
                    <AddressProvider>
                      <PaymentProvider>
                        <StatusBar style="light" />
                        <NavigationContainer ref={navigationRef}>
                          <NotificationResponseHandler navigationRef={navigationRef} />
                          <RootNavigator />
                        </NavigationContainer>
                      </PaymentProvider>
                    </AddressProvider>
                  </OrdersProvider>
                </FavoritesProvider>
              </CartProvider>
            </NotificationsProvider>
          </AuthProvider>
        </MenuDataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
