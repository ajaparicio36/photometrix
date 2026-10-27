import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import {
  Button,
  Card,
  CollectionFooter,
  Empty,
  IconButton,
  Label,
  NavButton,
  Screen,
  Small,
  Status,
} from '@/components/ui';
import { decodePage, decodeRoom, decodeSession, formatLux, type Room } from '@/lib/contract';
import { useCollection, useResource } from '@/lib/resources';

const sessionPage = decodePage(decodeSession);
function RoomCard({ room }: { room: Room }): React.JSX.Element {
  const result = useResource(
    `/sessions?roomId=${encodeURIComponent(room.id)}&limit=1`,
    sessionPage,
  );
  const recent = result.data?.items[0];
  return (
    <Card>
      <View className="gap-1">
        <Label className="font-inter-semibold text-section">{room.name}</Label>
        <Small>{room.category}</Small>
      </View>
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <Small>Room target</Small>
        <Label className="font-mono-bold text-section">{room.targetLux} lx</Label>
      </View>
      {room.archivedAt ? (
        <Status text="Archived" />
      ) : recent?.status === 'active' ? (
        <Status text="Session active" />
      ) : recent?.summary ? (
        <View className="gap-2 rounded-control bg-subtle p-3">
          <Small>Last saved assessment</Small>
          <Label className="font-mono-bold text-value">
            {formatLux(recent.summary.sessionAverageLux)}
            {recent.summary.sessionAverageLux !== null ? ' lx' : ''}
          </Label>
          <Status assessment={recent.summary.assessment} />
        </View>
      ) : (
        <Small>
          {result.pending
            ? 'Checking session history…'
            : result.error
              ? 'Session history unavailable. Open room to retry.'
              : 'No saved assessment yet.'}
        </Small>
      )}
      <NavButton
        label="Open room"
        icon="arrow-right"
        href={{ pathname: '/rooms/[id]', params: { id: room.id } }}
      />
    </Card>
  );
}
export default function RoomsScreen(): React.JSX.Element {
  const [archives, setArchives] = useState(false);
  const rooms = useCollection('/rooms', decodeRoom, { includeArchived: String(archives) });
  return (
    <Screen
      title="Rooms"
      subtitle="Choose a room to measure its illuminance."
      brand
      action={
        <IconButton
          name="account-circle-outline"
          label="Account"
          onPress={() => router.push('/account')}
        />
      }
    >
      <NavButton label="Create room" href="/rooms/new" kind="primary" icon="plus" />
      <Button
        label={archives ? 'Hide archived rooms' : 'Include archived rooms'}
        kind="quiet"
        onPress={() => setArchives(!archives)}
      />
      {rooms.items.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
      {!rooms.pending && !rooms.error && rooms.items.length === 0 && (
        <Empty
          title="Set up your first room"
          message="Name the room and select its category. Its target is selected automatically."
        />
      )}
      <CollectionFooter {...rooms} />
    </Screen>
  );
}
