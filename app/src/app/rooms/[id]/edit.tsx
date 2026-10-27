import { useLocalSearchParams } from 'expo-router';
import { RoomForm } from '@/components/room-form';
import { Busy, ErrorState, Notice, Screen } from '@/components/ui';
import { decodeRoom } from '@/lib/contract';
import { useResource } from '@/lib/resources';
export default function EditRoom(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resource = useResource(`/rooms/${encodeURIComponent(id)}`, decodeRoom);
  if (resource.data && !resource.data.archivedAt)
    return <RoomForm key={resource.data.id} room={resource.data} />;
  return (
    <Screen title="Edit room" back>
      {resource.pending && <Busy />}
      {resource.error && (
        <ErrorState error={resource.error} retry={() => void resource.refresh()} />
      )}
      {resource.data?.archivedAt && (
        <Notice>This room is archived. Its session history remains available.</Notice>
      )}
    </Screen>
  );
}
