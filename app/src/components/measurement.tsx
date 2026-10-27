import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Card, Label, Small, Status } from './ui';
import { formatLux, formatTime, type Assessment, type Sample } from '@/lib/contract';

export function Gauge({
  value,
  target,
  assessment,
  label,
}: {
  value: number | null;
  target: number;
  assessment: Assessment | null;
  label: string;
}): React.JSX.Element {
  const { fontScale } = useWindowDimensions();
  const scale = target * 2;
  const progress = value === null ? 0 : Math.max(0, Math.min(1, value / scale));
  const circumference = 2 * Math.PI * 94;
  return (
    <Card>
      <View className="items-center gap-3">
        <Small>{label}</Small>
        <View
          className="w-full items-center justify-center"
          style={{ minHeight: fontScale > 1.3 ? undefined : 236, paddingVertical: 20 }}
        >
          {fontScale <= 1.3 && (
            <View
              pointerEvents="none"
              accessible={false}
              style={{ position: 'absolute', alignSelf: 'center' }}
            >
              <Svg width={236} height={236} viewBox="0 0 236 236">
                <Circle cx={118} cy={118} r={94} fill="none" stroke="#F2F3FF" strokeWidth={14} />
                <Circle
                  cx={118}
                  cy={118}
                  r={94}
                  fill="none"
                  stroke="#FEA619"
                  strokeWidth={14}
                  strokeDasharray={`${circumference * progress} ${circumference}`}
                  rotation={-90}
                  origin="118, 118"
                />
                <Line x1={118} y1={205} x2={118} y2={224} stroke="#283044" strokeWidth={3} />
              </Svg>
            </View>
          )}
          <View className="max-w-full items-center gap-1 px-3">
            <Label
              className={`${value === null ? 'text-section' : 'text-value'} text-center font-mono-bold`}
            >
              {formatLux(value)}
            </Label>
            {value !== null && <Small className="font-mono">lx</Small>}
          </View>
        </View>
        <Status
          assessment={assessment}
          text={value === null ? 'No assessment available' : undefined}
        />
        <Small>
          Scale 0–{scale} lx · marker at {target} lx
        </Small>
        {value !== null && value > scale && (
          <Small>Reading exceeds the displayed gauge scale.</Small>
        )}
      </View>
      <View className="flex-row flex-wrap justify-between gap-3 border-t border-line pt-3">
        <Small>Room target: {target} lx</Small>
        {value !== null && (
          <Small className="font-mono">
            {value >= target ? '+' : ''}
            {(value - target).toLocaleString(undefined, { maximumFractionDigits: 1 })} lx from
            target
          </Small>
        )}
      </View>
    </Card>
  );
}
export function SensorRows({
  sample,
  target,
  historical = false,
}: {
  sample: Sample | null;
  target: number;
  historical?: boolean;
}): React.JSX.Element {
  const readings = sample
    ? [sample.sensor1Lux, sample.sensor2Lux, sample.sensor3Lux]
    : [null, null, null];
  return (
    <Card>
      <Label className="font-inter-semibold">
        {historical ? 'Last collected sample' : 'Three sensor readings'}
      </Label>
      {readings.map((reading, index) => (
        <View key={index} className="gap-2 rounded-control bg-subtle p-3">
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <View className="gap-1">
              <Label className="font-inter-medium">Sensor {index + 1}</Label>
              <Small className="font-mono">Channel {index}</Small>
            </View>
            <Label className="font-mono text-section">
              {formatLux(reading)}
              {reading !== null ? ' lx' : ''}
            </Label>
          </View>
          <View accessible={false} className="flex-row gap-1">
            {Array.from({ length: 20 }, (_, segment) => (
              <View
                key={segment}
                className={`h-3 flex-1 rounded-sm ${reading !== null && segment < Math.min(20, Math.round((reading / (target * 2)) * 20)) ? 'bg-lighting' : 'bg-selected'}`}
              />
            ))}
          </View>
        </View>
      ))}
      <Small>
        Meter scale: 0–{target * 2} lx. Individual readings are shown separately from the
        three-sensor average.
      </Small>
      {sample && (
        <>
          <Small>Acquired: {formatTime(sample.sampledAt)}</Small>
          <Small>Received: {formatTime(sample.receivedAt)}</Small>
        </>
      )}
    </Card>
  );
}
