import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { MenuDataProvider } from "./src/context/MenuDataContext";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { OrdersProvider } from "./src/context/OrdersContext";
import { AddressProvider } from "./src/context/AddressContext";
import { PaymentProvider } from "./src/context/PaymentContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MenuDataProvider>
          <AuthProvider>
            <CartProvider>
              <FavoritesProvider>
                <OrdersProvider>
                  <AddressProvider>
                    <PaymentProvider>
                      <StatusBar style="light" />
                      <NavigationContainer>
                        <RootNavigator />
                      </NavigationContainer>
                    </PaymentProvider>
                  </AddressProvider>
                </OrdersProvider>
              </FavoritesProvider>
            </CartProvider>
          </AuthProvider>
        </MenuDataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
