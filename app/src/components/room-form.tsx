import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Field, Icon, Label, NavButton, Notice, Screen, Small } from './ui';
import { ApiError, messageOf } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { decodePage, decodeRoom, roomTargets, type Category, type Room } from '@/lib/contract';

export function RoomForm({ room }: { room?: Room }): React.JSX.Element {
  const { api } = useAuth();
  const [name, setName] = useState(room?.name ?? '');
  const [category, setCategory] = useState<Category>(room?.category ?? 'Classroom');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [ambiguous, setAmbiguous] = useState(false);
  const busy = useRef(false);
  async function save(): Promise<void> {
    setAttempted(true);
    if (busy.current || ambiguous || !name.trim() || name.trim().length > 100) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await api(room ? `/rooms/${room.id}` : '/rooms', decodeRoom, {
        method: room ? 'PATCH' : 'POST',
        body: { name: name.trim(), category },
      });
      router.replace({ pathname: '/rooms/[id]', params: { id: result.id, saved: 'true' } });
    } catch (failure) {
      setError(messageOf(failure));
      if (!room && failure instanceof ApiError && failure.ambiguous) {
        setAmbiguous(true);
        await api('/rooms?limit=100', decodePage(decodeRoom)).catch(() => undefined);
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Screen
      title={room ? 'Edit room' : 'Create room'}
      subtitle="Room categories select the requested illuminance target."
      back
    >
      <Field
        label="Room name"
        placeholder="For example, EN 106"
        value={name}
        onChangeText={setName}
        maxLength={100}
        editable={!pending && !ambiguous}
        error={attempted && !name.trim() ? 'Enter a room name.' : undefined}
      />
      <View className="gap-3">
        <Label className="font-inter-semibold">Room category</Label>
        {(Object.entries(roomTargets) as [Category, number][]).map(([option, target]) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: category === option, disabled: pending || ambiguous }}
            accessibilityLabel={`${option}, target ${target} lux`}
            disabled={pending || ambiguous}
            onPress={() => setCategory(option)}
            className={`min-h-16 flex-row items-center gap-3 rounded-card border p-4 active:opacity-70 focus:border-link ${category === option ? 'border-amber bg-selected' : 'border-line bg-surface'}`}
          >
            <Icon
              name={category === option ? 'radiobox-marked' : 'radiobox-blank'}
              color={category === option ? '#855300' : '#3E4850'}
            />
            <View className="flex-1 gap-1">
              <Label className="font-inter-medium">{option}</Label>
              <Small className="font-mono">{target} lx target</Small>
            </View>
          </Pressable>
        ))}
      </View>
      <Card className="bg-subtle">
        <Small>Selected room target</Small>
        <Label className="font-mono-bold text-value">{roomTargets[category]} lx</Label>
        <Small>
          {room
            ? 'Changes apply to new sessions. Saved assessments keep their original room name and target.'
            : 'A session compares the measured illuminance with this target.'}
        </Small>
      </Card>
      {error && <Notice tone="error">{error}</Notice>}
      {ambiguous ? (
        <>
          <Notice>
            The room may have been created. Review the room list before creating another room with
            this name.
          </Notice>
          <NavButton label="Review rooms" href="/" icon="door-open" />
        </>
      ) : (
        <Button
          label={room ? 'Save changes' : 'Create room'}
          icon="check"
          busy={pending}
          onPress={() => void save()}
        />
      )}
    </Screen>
  );
}
