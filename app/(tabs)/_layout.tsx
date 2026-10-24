import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { useTheme } from '@/constants/theme';

const WIDE_BREAKPOINT = 900;

export default function TabLayout() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT; // PC / Mac browser or tablet

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Side navigation on large screens, bottom tabs on phones.
        tabBarPosition: isWide ? 'left' : 'bottom',
        tabBarActiveTintColor: theme.primary,
        // Without this the selected tab gets a default bright-blue background that clashes with your palette.
        tabBarActiveBackgroundColor: theme.surfaceAlt,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderColor: theme.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'People',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkbox-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="giving" options={{ href: null, title: 'Giving' }} />
      <Tabs.Screen name="summary" options={{ href: null, title: 'Reports' }} />
      <Tabs.Screen name="statements" options={{ href: null, title: 'Giving statements' }} />
      <Tabs.Screen name="templates" options={{ href: null, title: 'Letter templates' }} />
      <Tabs.Screen name="appearance" options={{ href: null, title: 'Appearance' }} />
      <Tabs.Screen name="dashboard-layout" options={{ href: null, title: 'Dashboard layout' }} />
      <Tabs.Screen name="notes" options={{ href: null, title: 'Notes' }} />
      <Tabs.Screen name="events" options={{ href: null, title: 'Event types' }} />
    </Tabs>
  );
}
