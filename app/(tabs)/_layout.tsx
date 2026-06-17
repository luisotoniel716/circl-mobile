import { Tabs } from 'expo-router';
import { CirclTabBar } from '../../src/components/CirclTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CirclTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Visible tabs — only three. */}
      <Tabs.Screen name="home"    />
      <Tabs.Screen name="create"  />
      <Tabs.Screen name="profile" />
      {/* Hidden routes — kept inside (tabs) so existing router.push paths still
          work, but excluded from the tab bar with href: null. Activity is
          reached from the home bell; Groups from the home "All groups" link. */}
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="groups"   options={{ href: null }} />
    </Tabs>
  );
}
