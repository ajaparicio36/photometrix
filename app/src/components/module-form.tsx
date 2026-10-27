import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router, usePreventRemove } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Button, Card, Field, Heading, Label, NavButton, Notice, Screen, Small } from './ui';
import { ApiError, messageOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  decodeIssuance,
  decodeModule,
  decodePage,
  type Issuance,
  type LightingModule,
} from '@/lib/contract';

export function TokenCard({
  issuance,
  done,
}: {
  issuance: Issuance;
  done: () => void;
}): React.JSX.Element {
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const disable = usePreventRemove(true, () => {
    setBlocked(true);
  });
  async function copy(value: string, label: string, sensitive = false): Promise<void> {
    setError(null);
    try {
      const success = await Clipboard.setStringAsync(value, {
        android: { isSensitive: sensitive },
      });
      if (!success)
        throw new Error('Clipboard access was denied. Select and copy the value manually.');
      setCopied(label);
    } catch (failure) {
      setError(messageOf(failure));
    }
  }
  return (
    <View className="gap-6">
      <Notice tone="success">
        Device credential created. Copy both values into this module’s firmware.
      </Notice>
      <Card>
        <Heading>Device ID</Heading>
        <Label selectable className="font-mono">
          {issuance.module.deviceId}
        </Label>
        <Button
          label="Copy device ID"
          kind="secondary"
          icon="content-copy"
          onPress={() => void copy(issuance.module.deviceId, 'Device ID copied.')}
        />
      </Card>
      <Card>
        <Heading>One-time device token</Heading>
        <Small>
          This token is visible only now. Keep it private. If it is lost, rotate the credential and
          update the firmware.
        </Small>
        <Label selectable className="font-mono">
          {issuance.deviceToken}
        </Label>
        <Button
          label="Copy device token"
          kind="secondary"
          icon="content-copy"
          onPress={() => void copy(issuance.deviceToken, 'Device token copied.', true)}
        />
      </Card>
      {copied && <Notice tone="success">{copied}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {blocked && (
        <Notice>Save both values and acknowledge below before leaving this screen.</Notice>
      )}
      <Button
        label={acknowledged ? 'Saved for firmware' : 'I saved the ID and token'}
        icon={acknowledged ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
        kind="secondary"
        onPress={() => setAcknowledged(!acknowledged)}
      />
      <Button
        label="Done"
        disabled={!acknowledged}
        onPress={() => {
          disable();
          done();
        }}
      />
    </View>
  );
}
export function ModuleForm({ module }: { module?: LightingModule }): React.JSX.Element {
  const { api } = useAuth();
  const [name, setName] = useState(module?.name ?? '');
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuance, setIssuance] = useState<Issuance | null>(null);
  const [ambiguous, setAmbiguous] = useState(false);
  const busy = useRef(false);
  async function save(): Promise<void> {
    setAttempted(true);
    if (busy.current || ambiguous || !name.trim()) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      if (module) {
        const result = await api(`/modules/${module.deviceId}`, decodeModule, {
          method: 'PATCH',
          body: { name: name.trim() },
        });
        router.replace({
          pathname: '/modules/[id]',
          params: { id: result.deviceId, saved: 'true' },
        });
      } else
        setIssuance(
          await api('/modules', decodeIssuance, { method: 'POST', body: { name: name.trim() } }),
        );
    } catch (failure) {
      setError(messageOf(failure));
      if (!module && failure instanceof ApiError && failure.ambiguous) {
        setAmbiguous(true);
        await api('/modules?limit=100', decodePage(decodeModule)).catch(() => undefined);
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Screen
      title={issuance ? 'Save device credential' : module ? 'Edit module' : 'Register module'}
      back
    >
      {issuance ? (
        <TokenCard
          issuance={issuance}
          done={() => {
            router.replace({ pathname: '/modules/[id]', params: { id: issuance.module.deviceId } });
            setIssuance(null);
          }}
        />
      ) : (
        <>
          <Card>
            <Heading>Portable lighting module</Heading>
            <Small>
              One ESP32 with three sensor channels. Select its room each time you start a
              measurement session.
            </Small>
          </Card>
          {module && (
            <Card>
              <Small>Immutable device ID</Small>
              <Label selectable className="font-mono">
                {module.deviceId}
              </Label>
            </Card>
          )}
          <Field
            label="Module name"
            placeholder="For example, Portable lighting module"
            value={name}
            onChangeText={setName}
            maxLength={100}
            editable={!pending && !ambiguous}
            error={attempted && !name.trim() ? 'Enter a module name.' : undefined}
          />
          <Small>
            {module
              ? 'Renaming changes future sessions. Existing session names are preserved.'
              : 'Registration generates the device ID and a one-time upload token. You will copy them into the firmware.'}
          </Small>
          {error && <Notice tone="error">{error}</Notice>}
          {ambiguous ? (
            <>
              <Notice>
                The module may have been registered. Review the module list, open the matching
                module, and explicitly rotate its credential if you did not receive the token.
              </Notice>
              <NavButton label="Review modules" href="/modules" />
            </>
          ) : (
            <Button
              label={module ? 'Save changes' : 'Register module'}
              icon={module ? 'check' : 'plus'}
              busy={pending}
              onPress={() => void save()}
            />
          )}
        </>
      )}
    </Screen>
  );
}
