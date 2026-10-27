import { useRef, useState } from 'react';
import { View, type TextInputInstance } from 'react-native';
import { Brand, Button, Field, Notice, Screen, Small } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { messageOf } from '@/lib/api';

export default function LoginScreen(): React.JSX.Element {
  const { state, signIn } = useAuth();
  const [email, setEmail] = useState('photometrix@cpu.edu.ph');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const passwordInput = useRef<TextInputInstance>(null);
  const busy = useRef(false);
  async function submit(): Promise<void> {
    setAttempted(true);
    if (busy.current || !email.trim() || !password) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await signIn(email, password);
      setPassword('');
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Screen title="Sign in">
      <View className="mx-auto w-full max-w-md gap-6 py-8">
        <Brand large />
        <View className="items-center gap-2">
          <Small>Lighting illuminance assessment</Small>
          <Small>Sign in with your provisioned account.</Small>
        </View>
        {state.status === 'signed-out' && state.message && <Notice>{state.message}</Notice>}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordInput.current?.focus()}
          editable={!pending}
          error={attempted && !email.trim() ? 'Enter your email address.' : undefined}
        />
        <Field
          ref={passwordInput}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          editable={!pending}
          error={attempted && !password ? 'Enter your password.' : undefined}
        />
        <Button
          label={showPassword ? 'Hide password' : 'Show password'}
          icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
          kind="quiet"
          onPress={() => setShowPassword(!showPassword)}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <Button label="Sign in" icon="login" busy={pending} onPress={() => void submit()} />
      </View>
    </Screen>
  );
}
