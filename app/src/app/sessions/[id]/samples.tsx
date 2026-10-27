import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Button,
  Card,
  CollectionFooter,
  Empty,
  Label,
  Notice,
  Screen,
  Small,
  Status,
} from '@/components/ui';
import { decodeSample, formatLux, formatTime } from '@/lib/contract';
import { useCollection } from '@/lib/resources';
export default function SampleHistory(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quality, setQuality] = useState<'complete' | 'incomplete' | undefined>(undefined);
  const samples = useCollection(`/sessions/${encodeURIComponent(id)}/samples`, decodeSample, {
    quality,
    limit: '100',
  });
  return (
    <Screen
      title="Raw samples"
      subtitle="In receipt order. Historical sample assessments are separate from live freshness."
      back
    >
      <View className="flex-row flex-wrap gap-3">
        {(['all', 'complete', 'incomplete'] as const).map((filter) => (
          <Button
            key={filter}
            label={filter === 'all' ? 'All' : filter === 'complete' ? 'Complete' : 'Incomplete'}
            kind={(quality ?? 'all') === filter ? 'primary' : 'secondary'}
            onPress={() => setQuality(filter === 'all' ? undefined : filter)}
          />
        ))}
      </View>
      <Notice>
        Missing readings are unavailable, not zero. Only complete samples contribute to the saved
        session average.
      </Notice>
      {samples.items
        .filter((sample) => sample.sessionId === id)
        .map((sample) => (
          <Card key={sample.id}>
            <Status
              assessment={sample.assessment}
              text={sample.quality === 'incomplete' ? 'Incomplete sample' : undefined}
            />
            <Small>Acquired: {formatTime(sample.sampledAt)}</Small>
            <Small>Received: {formatTime(sample.receivedAt)}</Small>
            {[sample.sensor1Lux, sample.sensor2Lux, sample.sensor3Lux].map((value, index) => (
              <View key={index} className="flex-row flex-wrap justify-between gap-3">
                <Small>Sensor {index + 1}</Small>
                <Label className="font-mono">
                  {formatLux(value)}
                  {value !== null ? ' lx' : ''}
                </Label>
              </View>
            ))}
            <Small>
              Three-sensor average: {formatLux(sample.averageLux)}
              {sample.averageLux !== null ? ' lx' : ''}
            </Small>
            <Small selectable className="font-mono">
              Sample ID: {sample.sampleId}
            </Small>
          </Card>
        ))}
      {!samples.pending && !samples.error && samples.items.length === 0 && (
        <Empty
          title="No matching samples"
          message="Try another quality filter, or wait for the module during an active session."
        />
      )}
      <CollectionFooter {...samples} />
    </Screen>
  );
}
