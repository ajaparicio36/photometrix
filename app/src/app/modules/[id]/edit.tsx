import { useLocalSearchParams } from 'expo-router';
import { ModuleForm } from '@/components/module-form';
import { Busy, ErrorState, Notice, Screen } from '@/components/ui';
import { decodeModule } from '@/lib/contract';
import { useResource } from '@/lib/resources';
export default function EditModule(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resource = useResource(`/modules/${encodeURIComponent(id)}`, decodeModule);
  if (resource.data && !resource.data.archivedAt)
    return <ModuleForm key={resource.data.deviceId} module={resource.data} />;
  return (
    <Screen title="Edit module" back>
      {resource.pending && <Busy />}
      {resource.error && (
        <ErrorState error={resource.error} retry={() => void resource.refresh()} />
      )}
      {resource.data?.archivedAt && (
        <Notice>This module is archived. Its session history remains available.</Notice>
      )}
    </Screen>
  );
}
