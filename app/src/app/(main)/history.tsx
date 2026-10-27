import { useState } from 'react';
import { View } from 'react-native';
import { Button, CollectionFooter, Empty, Screen } from '@/components/ui';
import { SessionCard } from '@/components/session-card';
import { decodeSession } from '@/lib/contract';
import { useCollection } from '@/lib/resources';
export default function HistoryScreen(): React.JSX.Element {
  const [status, setStatus] = useState<'completed' | 'active'>('completed');
  const sessions = useCollection('/sessions', decodeSession, { status });
  return (
    <Screen
      title="Session history"
      subtitle="Saved room targets and readings remain available after edits or archival."
      brand
    >
      <View className="flex-row flex-wrap gap-3">
        <Button
          label="Completed"
          kind={status === 'completed' ? 'primary' : 'secondary'}
          onPress={() => setStatus('completed')}
        />
        <Button
          label="Active"
          kind={status === 'active' ? 'primary' : 'secondary'}
          onPress={() => setStatus('active')}
        />
      </View>
      {sessions.items.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
      {!sessions.pending && !sessions.error && sessions.items.length === 0 && (
        <Empty
          title={status === 'active' ? 'No active sessions' : 'No saved sessions yet'}
          message={
            status === 'active'
              ? 'Start a measurement from a room when your module is ready.'
              : 'Stop a measurement session to save its assessment and PDF report.'
          }
        />
      )}
      <CollectionFooter {...sessions} />
    </Screen>
  );
}
