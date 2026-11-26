import { useCallback, useState, type ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import SplashIntro from './src/components/SplashIntro';
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
  const insets = useSafeAreaInsets();
  // Keep the tabs above the phone's own navigation bar (3-button or gesture).
  // Some Android devices report 0 here even with a bar drawn over the app.
  const bottom = Math.max(insets.bottom, 10);

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#E11D2E',
        tabBarInactiveTintColor: '#8E8E96',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
        tabBarStyle: {
          height: 58 + bottom,
          paddingTop: 6,
          paddingBottom: bottom,
          borderTopColor: '#E2E2E6',
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
  const [showIntro, setShowIntro] = useState(true);
  const hideIntro = useCallback(() => setShowIntro(false), []);

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
      {showIntro && <SplashIntro onFinish={hideIntro} />}
    </SafeAreaProvider>
  );
}
