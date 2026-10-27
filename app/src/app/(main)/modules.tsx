import { useState } from 'react';
import {
  Button,
  Card,
  CollectionFooter,
  Empty,
  Label,
  NavButton,
  Screen,
  Small,
  Status,
} from '@/components/ui';
import { decodeModule, formatTime } from '@/lib/contract';
import { useCollection } from '@/lib/resources';
export default function ModulesScreen(): React.JSX.Element {
  const [archives, setArchives] = useState(false);
  const modules = useCollection('/modules', decodeModule, { includeArchived: String(archives) });
  return (
    <Screen title="Modules" subtitle="Portable lighting modules with three sensor channels." brand>
      <NavButton label="Register module" icon="plus" kind="primary" href="/modules/new" />
      <Button
        label={archives ? 'Hide archived modules' : 'Include archived modules'}
        kind="quiet"
        onPress={() => setArchives(!archives)}
      />
      {modules.items.map((module) => (
        <Card key={module.deviceId}>
          <Label className="font-inter-semibold text-section">{module.name}</Label>
          <Small selectable className="font-mono">
            {module.deviceId}
          </Small>
          {module.archivedAt && <Status text="Archived · credential revoked" />}
          <Small>Last upload received: {formatTime(module.lastReceivedAt)}</Small>
          <NavButton
            label="Module details"
            href={{ pathname: '/modules/[id]', params: { id: module.deviceId } }}
            icon="arrow-right"
          />
        </Card>
      ))}
      {!modules.pending && !modules.error && modules.items.length === 0 && (
        <Empty
          title="Register a lighting module"
          message="Create its device ID and one-time token here, then copy them into your ESP32 firmware."
        />
      )}
      <CollectionFooter {...modules} />
    </Screen>
  );
}
