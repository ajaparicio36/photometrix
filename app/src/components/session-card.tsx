import { View } from 'react-native';
import { Card, Label, NavButton, Small, Status } from './ui';
import { formatLux, formatTime, type Session } from '@/lib/contract';
export function SessionCard({ session }: { session: Session }): React.JSX.Element {
  return (
    <Card>
      <View className="gap-1">
        <Label className="font-inter-semibold">{session.roomSnapshot.name}</Label>
        <Small>
          {session.roomSnapshot.category} · {session.roomSnapshot.targetLux} lx target
        </Small>
      </View>
      <Status
        assessment={session.summary?.assessment}
        text={session.status === 'active' ? 'Session active' : undefined}
      />
      {session.summary && (
        <Label className="font-mono-bold text-value">
          {formatLux(session.summary.sessionAverageLux)}
          {session.summary.sessionAverageLux !== null ? ' lx' : ''}
        </Label>
      )}
      <Small>{formatTime(session.startedAt)}</Small>
      <Small>{session.moduleSnapshot.name}</Small>
      <NavButton
        label={session.status === 'active' ? 'Open live session' : 'View assessment'}
        href={{ pathname: '/sessions/[id]', params: { id: session.id } }}
        icon="arrow-right"
      />
    </Card>
  );
}
