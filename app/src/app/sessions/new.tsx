import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import {
  Busy,
  Button,
  Card,
  CollectionFooter,
  Empty,
  ErrorState,
  Field,
  Icon,
  Label,
  NavButton,
  Notice,
  Screen,
  Small,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ApiError, messageOf } from '@/lib/api';
import { decodeModule, decodePage, decodeRoom, decodeSession } from '@/lib/contract';
import { useCollection, useResource } from '@/lib/resources';
import { startAttempt, type StartAttempt } from '@/lib/session-state';

export default function SessionSetup(): React.JSX.Element {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { api } = useAuth();
  const room = useResource(`/rooms/${encodeURIComponent(roomId ?? '')}`, decodeRoom);
  const modules = useCollection('/modules', decodeModule);
  const [moduleId, setModuleId] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<StartAttempt | null>(null);
  const [conflictSession, setConflictSession] = useState<string | null>(null);
  const busy = useRef(false);
  async function start(): Promise<void> {
    if (busy.current || !moduleId || !room.data || room.data.archivedAt) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setConflictSession(null);
    const current = attempt ?? startAttempt(roomId, moduleId, notes, Crypto.randomUUID());
    setAttempt(current);
    try {
      const session = await api('/sessions', decodeSession, {
        method: 'POST',
        body: current.input,
        idempotencyKey: current.key,
      });
      router.replace({ pathname: '/sessions/[id]', params: { id: session.id } });
    } catch (failure) {
      setError(messageOf(failure));
      if (failure instanceof ApiError && !failure.ambiguous) setAttempt(null);
      if (failure instanceof ApiError && failure.code === 'RESOURCE_ACTIVE') {
        const page = await api(
          `/sessions?status=active&roomId=${encodeURIComponent(roomId)}&limit=1`,
          decodePage(decodeSession),
        ).catch(() => null);
        if (page?.items[0]) setConflictSession(page.items[0].id);
        else {
          const modulePage = await api(
            `/sessions?status=active&moduleId=${encodeURIComponent(moduleId)}&limit=1`,
            decodePage(decodeSession),
          ).catch(() => null);
          if (modulePage?.items[0]) setConflictSession(modulePage.items[0].id);
        }
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Screen title="Set up measurement" back>
      {room.pending && !room.data && <Busy />}
      {room.error && <ErrorState error={room.error} retry={() => void room.refresh()} />}
      {room.data && (
        <>
          <Card>
            <Label className="font-inter-semibold text-section">{room.data.name}</Label>
            <Small>{room.data.category}</Small>
            <Label className="font-mono-bold text-value">{room.data.targetLux} lx</Label>
            <Small>Target saved when you start this session.</Small>
          </Card>
          {room.data.archivedAt ? (
            <Notice>This room is archived. Select an active room to start a session.</Notice>
          ) : (
            <>
              <View className="gap-3">
                <Label className="font-inter-semibold">Select a portable module</Label>
                <Small>
                  Only one session can use a room or module at a time. Availability is checked when
                  you start.
                </Small>
                {modules.items.map((module) => (
                  <Pressable
                    key={module.deviceId}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: moduleId === module.deviceId,
                      disabled: pending || !!attempt,
                    }}
                    disabled={pending || !!attempt}
                    onPress={() => setModuleId(module.deviceId)}
                    className={`min-h-16 flex-row items-center gap-3 rounded-card border p-4 focus:border-link active:opacity-70 ${moduleId === module.deviceId ? 'border-amber bg-selected' : 'border-line bg-surface'}`}
                  >
                    <Icon
                      name={moduleId === module.deviceId ? 'radiobox-marked' : 'radiobox-blank'}
                    />
                    <View className="flex-1 gap-1">
                      <Label className="font-inter-medium">{module.name}</Label>
                      <Small className="font-mono">{module.deviceId}</Small>
                    </View>
                  </Pressable>
                ))}
              </View>
              {!modules.pending && !modules.error && modules.items.length === 0 && (
                <Empty
                  title="No module configured"
                  message="Register a module, copy its ID and token into the firmware, and then return here."
                  action={<NavButton label="Register module" href="/modules/new" icon="plus" />}
                />
              )}
              <CollectionFooter {...modules} />
              <Field
                label="Measurement-point notes"
                hint="Describe all three positions, working-plane height, and lighting or daylight conditions. Optional, up to 1,000 characters."
                value={notes}
                onChangeText={setNotes}
                maxLength={1000}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!pending && !attempt}
              />
              {error && <Notice tone="error">{error}</Notice>}
              {attempt && !pending && (
                <Notice>
                  The start response was not confirmed. Retry uses the same session request and will
                  not create another session. Keep these inputs until the outcome is resolved.
                </Notice>
              )}
              {conflictSession && (
                <NavButton
                  label="Open active session"
                  href={{ pathname: '/sessions/[id]', params: { id: conflictSession } }}
                />
              )}
              <Button
                label={attempt && !pending ? 'Retry same start' : 'Start measurement'}
                icon="play-outline"
                busy={pending}
                disabled={!moduleId}
                onPress={() => void start()}
              />
              <Small>
                Start the session when all three sensors are in place. Stop it manually to save the
                assessment.
              </Small>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
