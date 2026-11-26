import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FavoritesScreen from './src/screens/FavoritesScreen';
import GymDetailScreen from './src/screens/GymDetailScreen';
import MapScreen from './src/screens/MapScreen';
import type { MainTabParamList, RootStackParamList } from './src/navigation/types';

const TAB_ICONS: Record<
  keyof MainTabParamList,
  [ComponentProps<typeof Ionicons>['name'], ComponentProps<typeof Ionicons>['name']]
> = {
  Explore: ['compass', 'compass-outline'],
  Favorites: ['heart', 'heart-outline'],
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#173c35',
        tabBarInactiveTintColor: '#8a968f',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
        // No fixed height: let the navigator add the device's bottom inset.
        tabBarStyle: {
          paddingTop: 6,
          borderTopColor: '#e3e8e5',
          backgroundColor: '#fff',
        },
      })}
    >
      <Tabs.Screen
        name="Explore"
        component={MapScreen}
        options={{ tabBarLabel: 'Explore' }}
      />
      <Tabs.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ tabBarLabel: 'Favorites' }}
      />
    </Tabs.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="GymDetail"
            component={GymDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
