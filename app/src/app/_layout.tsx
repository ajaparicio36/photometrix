import '../global.css';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Brand, Button, Notice, Small } from '@/components/ui';

void SplashScreen.preventAutoHideAsync();
function Navigation(): React.JSX.Element {
  const { state, restore, signOut } = useAuth();
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  if (state.status === 'restoring' || state.status === 'restore-error')
    return (
      <View className="flex-1 items-center justify-center gap-6 bg-canvas px-6">
        <Brand large />
        {state.status === 'restoring' ? (
          <Small>Restoring your session…</Small>
        ) : (
          <View className="w-full max-w-md gap-3">
            <Notice tone="error">{state.message}</Notice>
            <Button label="Reconnect" onPress={() => void restore()} />
            <Button
              label="Return to sign in"
              kind="secondary"
              onPress={() => void signOut().catch(() => undefined)}
            />
          </View>
        )}
      </View>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAF8FF' },
        animation: 'none',
      }}
    >
      <Stack.Protected guard={state.status === 'signed-out'}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={state.status === 'signed-in'}>
        <Stack.Screen name="(main)" />
        <Stack.Screen name="rooms" />
        <Stack.Screen name="modules" />
        <Stack.Screen name="sessions" />
        <Stack.Screen name="account" />
      </Stack.Protected>
    </Stack>
  );
}
export default function RootLayout(): React.JSX.Element {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });
  useEffect(() => {
    if (error) void SplashScreen.hideAsync();
  }, [error]);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {error ? (
        <View className="flex-1 justify-center bg-canvas p-6">
          <Notice tone="error">The app fonts could not load. Close and reopen Photometrix.</Notice>
        </View>
      ) : !loaded ? (
        <View className="flex-1 items-center justify-center bg-canvas">
          <Brand large />
        </View>
      ) : (
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      )}
    </SafeAreaProvider>
  );
}
