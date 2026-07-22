import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import CustomTabBar from "../components/CustomTabBar";
import HomeScreen from "../screens/HomeScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import OrdersScreen from "../screens/OrdersScreen";
import AccountScreen from "../screens/AccountScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ title: "Fav" }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: "Orders" }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: "Account" }} />
    </Tab.Navigator>
  );
}
