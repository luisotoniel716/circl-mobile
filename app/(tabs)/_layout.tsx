import { Tabs } from 'expo-router';
import { CirclTabBar } from '../../src/components/CirclTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CirclTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
