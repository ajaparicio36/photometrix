import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  Busy,
  Button,
  Card,
  CollectionFooter,
  ConfirmAction,
  ErrorState,
  Heading,
  Label,
  NavButton,
  Notice,
  Screen,
  Small,
  Status,
} from '@/components/ui';
import { TokenCard } from '@/components/module-form';
import { SessionCard } from '@/components/session-card';
import { useAuth } from '@/lib/auth';
import { messageOf } from '@/lib/api';
import {
  decodeIssuance,
  decodeModule,
  decodeSession,
  formatTime,
  type Issuance,
} from '@/lib/contract';
import { useCollection, useResource } from '@/lib/resources';
export default function ModuleDetail(): React.JSX.Element {
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const { api } = useAuth();
  const module = useResource(`/modules/${encodeURIComponent(id)}`, decodeModule);
  const sessions = useCollection('/sessions', decodeSession, { moduleId: id });
  const [issuance, setIssuance] = useState<Issuance | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  if (issuance)
    return (
      <Screen title="Save replacement credential" back>
        <TokenCard
          issuance={issuance}
          done={() => {
            setIssuance(null);
            void module.refresh();
          }}
        />
      </Screen>
    );
  return (
    <Screen title={module.data?.name ?? 'Module'} back>
      {saved === 'true' && <Notice tone="success">Module saved.</Notice>}
      {module.pending && !module.data && <Busy />}
      {module.error && <ErrorState error={module.error} retry={() => void module.refresh()} />}
      {module.data && (
        <>
          <Card>
            <Small>Immutable device ID</Small>
            <Label selectable className="font-mono">
              {module.data.deviceId}
            </Label>
            <Button
              label="Copy device ID"
              icon="content-copy"
              kind="secondary"
              onPress={() => {
                void Clipboard.setStringAsync(id)
                  .then((success) => {
                    setCopyMessage(
                      success
                        ? 'Device ID copied.'
                        : 'Clipboard access was denied. Select and copy the ID manually.',
                    );
                  })
                  .catch((error: unknown) => setCopyMessage(messageOf(error)));
              }}
            />
            {copyMessage && <Notice>{copyMessage}</Notice>}
            <Small>Last upload received: {formatTime(module.data.lastReceivedAt)}</Small>
            {module.data.archivedAt && <Status text="Archived · credential revoked" />}
          </Card>
          <Card>
            <Heading>Three measurement channels</Heading>
            <Small>Sensor 1 · channel 0</Small>
            <Small>Sensor 2 · channel 1</Small>
            <Small>Sensor 3 · channel 2</Small>
            <Small>
              Readings are collected only during an active session. A last-upload timestamp does not
              establish current connectivity.
            </Small>
          </Card>
          {!module.data.archivedAt && (
            <>
              <NavButton
                label="Edit module name"
                icon="pencil-outline"
                href={{ pathname: '/modules/[id]/edit', params: { id } }}
              />
              <ConfirmAction
                label="Rotate credential"
                kind="secondary"
                title="Replace this device token?"
                message="The previous token will stop working immediately. Save the replacement token and update the firmware. If a response is lost, another explicit rotation replaces it again."
                action={async () => {
                  setIssuance(
                    await api(`/modules/${id}/credentials/rotate`, decodeIssuance, {
                      method: 'POST',
                    }),
                  );
                }}
              />
              <ConfirmAction
                label="Archive module"
                title={`Archive ${module.data.name}?`}
                message="This permanently retires the module and revokes its token. Saved sessions and reports remain available. Stop any active session first."
                action={async () => {
                  await api(`/modules/${id}/archive`, decodeModule, { method: 'POST' });
                  await module.refresh();
                }}
              />
            </>
          )}
          <Heading>Session history</Heading>
          {!sessions.pending && !sessions.error && sessions.items.length === 0 && (
            <Small>No sessions recorded with this module.</Small>
          )}
          {sessions.items.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
          <CollectionFooter {...sessions} />
        </>
      )}
    </Screen>
  );
}
