import { useLocalSearchParams } from 'expo-router';
import {
  Busy,
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
import { SessionCard } from '@/components/session-card';
import { useAuth } from '@/lib/auth';
import { decodeRoom, decodeSession } from '@/lib/contract';
import { useCollection, useResource } from '@/lib/resources';
export default function RoomDetail(): React.JSX.Element {
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const { api } = useAuth();
  const room = useResource(`/rooms/${encodeURIComponent(id)}`, decodeRoom);
  const sessions = useCollection('/sessions', decodeSession, { roomId: id });
  const active = sessions.items.find((session) => session.status === 'active');
  return (
    <Screen title={room.data?.name ?? 'Room'} back>
      {saved === 'true' && <Notice tone="success">Room saved.</Notice>}
      {room.pending && !room.data && <Busy />}
      {room.error && <ErrorState error={room.error} retry={() => void room.refresh()} />}
      {room.data && (
        <>
          <Card>
            <Small>{room.data.category}</Small>
            <Label className="font-mono-bold text-value">{room.data.targetLux} lx</Label>
            <Small>Requested room target</Small>
            {room.data.archivedAt && <Status text="Archived" />}
          </Card>
          {!room.data.archivedAt && (
            <>
              {active ? (
                <NavButton
                  label="Resume live view"
                  kind="primary"
                  icon="chart-line"
                  href={{ pathname: '/sessions/[id]', params: { id: active.id } }}
                />
              ) : (
                <NavButton
                  label="Set up measurement"
                  kind="primary"
                  icon="play-outline"
                  href={{ pathname: '/sessions/new', params: { roomId: id } }}
                />
              )}
              <NavButton
                label="Edit room"
                icon="pencil-outline"
                href={{ pathname: '/rooms/[id]/edit', params: { id } }}
              />
              <ConfirmAction
                label="Archive room"
                title={`Archive ${room.data.name}?`}
                message="This permanently retires the room. Its saved sessions and reports stay available. An active session must be stopped first."
                action={async () => {
                  await api(`/rooms/${id}/archive`, decodeRoom, { method: 'POST' });
                  await room.refresh();
                }}
              />
            </>
          )}
          <Heading>Session history</Heading>
          {!sessions.pending && !sessions.error && sessions.items.length === 0 && (
            <Small>No sessions yet. Set up a measurement when your module is ready.</Small>
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
