import { useRef, useState, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { assessmentLabel, type Assessment } from '@/lib/contract';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export function Icon({
  name,
  color = '#131B2E',
  size = 22,
}: {
  name: IconName;
  color?: string;
  size?: number;
}): React.JSX.Element {
  return (
    <MaterialCommunityIcons name={name} color={color ?? '#131B2E'} size={size} accessible={false} />
  );
}
export function Label({ children, className = '', ...props }: TextProps): React.JSX.Element {
  return (
    <Text className={`font-sans text-body text-ink ${className}`} {...props}>
      {children}
    </Text>
  );
}
export function Small({ children, className = '', ...props }: TextProps): React.JSX.Element {
  return (
    <Text className={`font-sans text-small text-muted ${className}`} {...props}>
      {children}
    </Text>
  );
}
export function Heading({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <Text accessibilityRole="header" className="font-inter-semibold text-section text-ink">
      {children}
    </Text>
  );
}
export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <View className={`gap-3 rounded-card border border-line bg-surface p-4 ${className}`}>
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  icon,
  kind = 'primary',
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  kind?: 'primary' | 'secondary' | 'danger' | 'quiet';
  busy?: boolean;
  disabled?: boolean;
}): React.JSX.Element {
  const light = kind === 'primary';
  const color = light ? '#FFFFFF' : kind === 'danger' ? '#BA1A1A' : '#283044';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-control border px-4 py-3 active:opacity-70 focus:border-link focus:ring-2 focus:ring-link ${light ? 'border-action bg-action' : kind === 'danger' ? 'border-error bg-error-bg' : kind === 'quiet' ? 'border-transparent bg-transparent' : 'border-line bg-surface'} ${disabled || busy ? 'opacity-50' : ''}`}
    >
      {busy ? (
        <ActivityIndicator color={color} size="small" />
      ) : icon ? (
        <Icon name={icon} color={color} size={20} />
      ) : null}
      <Text
        className={`shrink font-inter-semibold text-body ${light ? 'text-white' : kind === 'danger' ? 'text-error' : 'text-action'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-12 w-12 items-center justify-center rounded-control active:bg-selected focus:bg-selected"
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Field({
  label,
  hint,
  error,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  ref?: Ref<TextInputInstance>;
}): React.JSX.Element {
  return (
    <View className="gap-2">
      <Label className="font-inter-medium">{label}</Label>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor="#626A73"
        selectionColor="#006591"
        className={`min-h-12 rounded-control border bg-surface px-4 py-3 font-sans text-body text-ink focus:border-2 focus:border-link ${error ? 'border-error' : 'border-line'}`}
        {...props}
      />
      {error ? (
        <Small className="text-error" accessibilityRole="alert">
          {error}
        </Small>
      ) : hint ? (
        <Small>{hint}</Small>
      ) : null}
    </View>
  );
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'error' | 'success';
}): React.JSX.Element {
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      className={`flex-row items-start gap-3 rounded-control p-4 ${tone === 'error' ? 'bg-error-bg' : tone === 'success' ? 'bg-pass-bg' : 'bg-subtle'}`}
    >
      <Icon
        name={
          tone === 'error'
            ? 'alert-circle-outline'
            : tone === 'success'
              ? 'check-circle-outline'
              : 'information-outline'
        }
        color={tone === 'error' ? '#BA1A1A' : tone === 'success' ? '#006C49' : '#3E4850'}
        size={20}
      />
      <Small
        className={`flex-1 ${tone === 'error' ? 'text-error' : tone === 'success' ? 'text-pass' : ''}`}
      >
        {children}
      </Small>
    </View>
  );
}
export function Status({
  assessment,
  text,
}: {
  assessment?: Assessment | null;
  text?: string;
}): React.JSX.Element {
  const pass = assessment === 'meets_target';
  const warning = assessment === 'below_target';
  return (
    <View
      className={`self-start flex-row flex-wrap items-center gap-1 rounded-control px-2 py-1 ${pass ? 'bg-pass-bg' : warning ? 'bg-warning-bg' : 'bg-subtle'}`}
    >
      <Icon
        name={pass ? 'check-circle-outline' : warning ? 'alert-outline' : 'information-outline'}
        color={pass ? '#006C49' : warning ? '#9A3412' : '#3E4850'}
        size={16}
      />
      <Small className={pass ? 'text-pass' : warning ? 'text-warning' : ''}>
        {text ?? assessmentLabel(assessment ?? null)}
      </Small>
    </View>
  );
}
export function Brand({ large = false }: { large?: boolean }): React.JSX.Element {
  return (
    <View className={large ? 'items-center gap-4' : 'flex-row items-center gap-3'}>
      <Image
        source={require('../../assets/images/photometrix-logo.png')}
        accessibilityLabel="Photometrix logo"
        resizeMode="contain"
        style={{ width: large ? 104 : 36, height: large ? 104 : 36 }}
      />
      <Text className={`${large ? 'text-title' : 'text-section'} font-inter-bold text-ink`}>
        Photometrix
      </Text>
    </View>
  );
}
export function Screen({
  title,
  subtitle,
  children,
  back = false,
  action,
  brand = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  back?: boolean;
  action?: ReactNode;
  brand?: boolean;
}): React.JSX.Element {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8FF' }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="mx-auto w-full max-w-3xl flex-row items-center gap-2 px-4 py-2">
          {back && (
            <IconButton
              name="arrow-left"
              label="Back"
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/');
              }}
            />
          )}
          <View className="flex-1">
            {brand ? (
              <Brand />
            ) : (
              <Text
                accessibilityRole="header"
                className="font-inter-semibold text-section text-ink"
              >
                {title}
              </Text>
            )}
          </View>
          {action}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="mx-auto w-full max-w-3xl gap-6 px-4 pb-12 pt-4">
            {brand && (
              <View className="gap-1">
                <Text accessibilityRole="header" className="font-inter-bold text-title text-ink">
                  {title}
                </Text>
                {subtitle && <Small>{subtitle}</Small>}
              </View>
            )}
            {!brand && subtitle && <Small>{subtitle}</Small>}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Busy({ label = 'Loading…' }: { label?: string }): React.JSX.Element {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} className="gap-3 py-4">
      <Small>{label}</Small>
      <View className="h-6 w-2/3 rounded bg-selected" />
      <View className="h-20 rounded-card bg-subtle" />
    </View>
  );
}
export function Empty({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}): React.JSX.Element {
  return (
    <Card>
      <Heading>{title}</Heading>
      <Label>{message}</Label>
      {action}
    </Card>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}): React.JSX.Element {
  return (
    <View className="gap-3">
      <Notice tone="error">{error}</Notice>
      {retry && <Button label="Try again" kind="secondary" icon="refresh" onPress={retry} />}
    </View>
  );
}
export function NavButton({
  label,
  href,
  icon,
  kind = 'secondary',
}: {
  label: string;
  href: Href;
  icon?: IconName;
  kind?: 'primary' | 'secondary' | 'quiet';
}): React.JSX.Element {
  return <Button label={label} icon={icon} kind={kind} onPress={() => router.push(href)} />;
}
export function ConfirmAction({
  label,
  title,
  message,
  action,
  disabled = false,
  kind = 'danger',
}: {
  label: string;
  title: string;
  message: string;
  action: () => Promise<void>;
  disabled?: boolean;
  kind?: 'danger' | 'secondary';
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  async function confirm(): Promise<void> {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      setOpen(false);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Could not finish this action. Please retry.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  if (!open)
    return <Button label={label} kind={kind} disabled={disabled} onPress={() => setOpen(true)} />;
  return (
    <Card>
      <Heading>{title}</Heading>
      <Label>{message}</Label>
      {error && <Notice tone="error">{error}</Notice>}
      <Button label={label} kind={kind} busy={busy} onPress={() => void confirm()} />
      <Button label="Cancel" kind="quiet" disabled={busy} onPress={() => setOpen(false)} />
    </Card>
  );
}
export function CollectionFooter({
  pending,
  error,
  hasMore,
  more,
  refresh,
}: {
  pending: boolean;
  error: string | null;
  hasMore: boolean;
  more: () => Promise<void>;
  refresh: () => Promise<void>;
}): React.JSX.Element {
  return (
    <View className="gap-3">
      {pending && <Busy label="Loading records…" />}
      {error && <ErrorState error={error} retry={() => void refresh()} />}
      {hasMore && (
        <Button label="Load more" kind="secondary" busy={pending} onPress={() => void more()} />
      )}
    </View>
  );
}
