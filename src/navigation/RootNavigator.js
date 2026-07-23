import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabs from "./MainTabs";
import LoginScreen from "../screens/LoginScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import AddressesScreen from "../screens/AddressesScreen";
import PaymentMethodsScreen from "../screens/PaymentMethodsScreen";
import HelpScreen from "../screens/HelpScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import { useAuth } from "../context/AuthContext";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { requiresName } = useAuth();
  return (
    <Stack.Navigator key={requiresName ? "requires-name" : "app"} initialRouteName={requiresName ? "Login" : "MainTabs"} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ presentation: "modal" }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
