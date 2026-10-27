import { Tabs } from 'expo-router/js-tabs';
import { Icon } from '@/components/ui';
export default function MainTabs(): React.JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#131B2E',
        tabBarInactiveTintColor: '#3E4850',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#BEC8D2' },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 13 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ focused }) => (
            <Icon name="door-open" color={focused ? '#131B2E' : '#3E4850'} />
          ),
        }}
      />
      <Tabs.Screen
        name="modules"
        options={{
          title: 'Modules',
          tabBarIcon: ({ focused }) => <Icon name="chip" color={focused ? '#131B2E' : '#3E4850'} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => (
            <Icon name="history" color={focused ? '#131B2E' : '#3E4850'} />
          ),
        }}
      />
    </Tabs>
  );
}
