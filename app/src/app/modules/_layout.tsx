import { Stack } from 'expo-router';
export default function ModuleLayout(): React.JSX.Element {
  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
}
