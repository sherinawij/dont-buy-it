// Bottom tabs: Home, Wins, Week, Settings. A rounded bar floating above the bottom edge.
// Add, the debate and the share screen open on top of the tabs from the root stack (app/_layout.js).
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabIcon from '../../src/components/TabIcon';
import { useTheme } from '../../src/useTheme';

const BAR_HEIGHT = 68;

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        sceneStyle: { backgroundColor: colors.bg },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabText,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarItemStyle: { paddingVertical: 8 },
        tabBarStyle: {
          height: BAR_HEIGHT,
          paddingBottom: 0,
          marginHorizontal: 16,
          marginBottom: Math.max(insets.bottom, 12),
          borderRadius: 26,
          borderTopWidth: 1,
          borderWidth: 1,
          borderTopColor: colors.tabBorder,
          borderColor: colors.tabBorder,
          backgroundColor: colors.tabBar,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', headerTitle: "Don't Buy It!", tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }}
      />
      <Tabs.Screen
        name="achievements"
        options={{ title: 'Wins', headerTitle: 'Your wins', tabBarIcon: ({ color }) => <TabIcon name="wins" color={color} /> }}
      />
      <Tabs.Screen
        name="summary"
        options={{ title: 'Week', headerTitle: 'Your week', tabBarIcon: ({ color }) => <TabIcon name="week" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} /> }}
      />
    </Tabs>
  );
}
