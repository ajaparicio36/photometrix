import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Busy,
  Button,
  Card,
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
import { Gauge, SensorRows } from '@/components/measurement';
import { useAuth } from '@/lib/auth';
import { messageOf } from '@/lib/api';
import {
  decodeLatest,
  decodeSession,
  formatTime,
  visibleLive,
  type LatestSample,
  type Session,
} from '@/lib/contract';
import { saveReport } from '@/lib/export-report';

const stateLabels = {
  waiting: 'Waiting for the first sample',
  fresh: 'Recent complete sample',
  incomplete: 'Incomplete sample',
  stale: 'Stale readings',
  completed: 'Completed session',
} as const;
interface LoadedSession {
  session: Session;
  latest: LatestSample;
  fetchedAt: number;
}
export default function SessionDetail(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, pdf } = useAuth();
  const [loaded, setLoaded] = useState<LoadedSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportBusy = useRef(false);
  const mounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      let running = false;
      let cancelled = false;
      let complete = false;
      async function poll(): Promise<void> {
        if (
          running ||
          cancelled ||
          complete ||
          (AppState.currentState !== 'active' && AppState.currentState !== null)
        )
          return;
        running = true;
        const requestedAt = performance.now();
        try {
          const [session, latest] = await Promise.all([
            api(`/sessions/${encodeURIComponent(id)}`, decodeSession),
            api(`/sessions/${encodeURIComponent(id)}/latest`, decodeLatest),
          ]);
          if (!cancelled) {
            setNow(performance.now());
            setLoaded((previous) =>
              previous?.session.id === id &&
              previous.session.status === 'completed' &&
              session.status === 'active'
                ? previous
                : { session, latest, fetchedAt: requestedAt },
            );
            setError(null);
            complete = session.status === 'completed';
          }
        } catch (failure) {
          if (!cancelled) setError(messageOf(failure));
        } finally {
          running = false;
        }
      }
      void poll();
      const timer = setInterval(() => void poll(), 5000);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') void poll();
      });
      return () => {
        cancelled = true;
        mounted.current = false;
        clearInterval(timer);
        subscription.remove();
      };
    }, [api, id]),
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const current = loaded?.session.id === id ? loaded : null;
  async function refresh(): Promise<void> {
    const requestedAt = performance.now();
    try {
      const [session, latest] = await Promise.all([
        api(`/sessions/${id}`, decodeSession),
        api(`/sessions/${id}/latest`, decodeLatest),
      ]);
      if (mounted.current) {
        setNow(performance.now());
        setLoaded((previous) =>
          previous?.session.id === id &&
          previous.session.status === 'completed' &&
          session.status === 'active'
            ? previous
            : { session, latest, fetchedAt: requestedAt },
        );
        setError(null);
      }
    } catch (failure) {
      if (mounted.current) setError(messageOf(failure));
    }
  }
  async function exportPdf(): Promise<void> {
    if (exportBusy.current) return;
    exportBusy.current = true;
    setExporting(true);
    setExportMessage(null);
    setExportError(null);
    try {
      const bytes = await pdf(`/sessions/${id}/report.pdf`);
      setExportMessage(await saveReport(bytes, id));
    } catch (failure) {
      setExportError(messageOf(failure));
    } finally {
      exportBusy.current = false;
      setExporting(false);
    }
  }
  const session = current?.session;
  const live = current ? visibleLive(current.latest, id, now - current.fetchedAt) : null;
  const summary = session?.summary;
  const historical = session?.status === 'completed';
  const sample = current?.latest.sample?.sessionId === id ? current.latest.sample : null;
  return (
    <Screen
      title={historical ? 'Saved assessment' : 'Live measurement'}
      subtitle={session?.roomSnapshot.name}
      back
    >
      {!current && !error && <Busy label="Opening session…" />}
      {error && <ErrorState error={error} retry={() => void refresh()} />}
      {session && live && (
        <>
          <Card>
            <Label className="font-inter-semibold">{session.roomSnapshot.name}</Label>
            <Small>
              {session.roomSnapshot.category} · {session.roomSnapshot.targetLux} lx target
            </Small>
            <Small>{session.moduleSnapshot.name}</Small>
            <Small selectable className="font-mono">
              {session.moduleId}
            </Small>
            <Status text={historical ? 'Saved historical result' : stateLabels[live.state]} />
          </Card>
          {!historical && live.state !== 'fresh' && (
            <Notice>
              {live.state === 'waiting'
                ? 'The session is active. Waiting for the module to upload its first sample.'
                : live.state === 'incomplete'
                  ? 'One or more sensors is unavailable. A current assessment requires all three readings.'
                  : live.state === 'stale'
                    ? 'These readings are older than 30 seconds. The last sample remains visible with its timestamps, but it is not a current assessment.'
                    : 'This session is completed. Refresh to see the saved result.'}
            </Notice>
          )}
          <Gauge
            value={historical ? (summary?.sessionAverageLux ?? null) : live.averageLux}
            target={session.roomSnapshot.targetLux}
            assessment={historical ? (summary?.assessment ?? null) : live.assessment}
            label={historical ? 'Complete-sample session average' : 'Current three-sensor average'}
          />
          {historical && summary && (
            <Card>
              <Heading>Collection summary</Heading>
              <View className="flex-row flex-wrap gap-6">
                <View>
                  <Label className="font-mono-bold text-section">
                    {summary.completeSampleCount}
                  </Label>
                  <Small>Complete samples</Small>
                </View>
                <View>
                  <Label className="font-mono-bold text-section">
                    {summary.incompleteSampleCount}
                  </Label>
                  <Small>Incomplete samples</Small>
                </View>
                <View>
                  <Label className="font-mono-bold text-section">{summary.totalSampleCount}</Label>
                  <Small>Total samples</Small>
                </View>
              </View>
              <Small>First acquisition: {formatTime(summary.firstSampledAt)}</Small>
              <Small>Last acquisition: {formatTime(summary.lastSampledAt)}</Small>
              <Small>
                The saved average is the equally weighted mean of complete three-sensor sample
                means. Incomplete samples are excluded. Missed intervals are not filled.
              </Small>
              {summary.result === 'insufficient_data' && (
                <Notice>
                  No complete samples were collected. This session has no below-target or
                  meets-target result.
                </Notice>
              )}
            </Card>
          )}
          <SensorRows
            sample={sample}
            target={session.roomSnapshot.targetLux}
            historical={historical}
          />
          <Card>
            <Heading>Operator guidance</Heading>
            {(historical ? (summary?.recommendations ?? []) : live.recommendations).map(
              (recommendation) => (
                <Label key={recommendation}>{recommendation}</Label>
              ),
            )}
            <Small>
              This compares measured illuminance with the requested target. It does not establish
              full-room coverage or standards certification.
            </Small>
          </Card>
          <Card>
            <Heading>Session details</Heading>
            <Small>Started: {formatTime(session.startedAt)}</Small>
            {historical && <Small>Stopped: {formatTime(session.stoppedAt)}</Small>}
            <Small>Measurement-point notes</Small>
            <Label>{session.placementNotes ?? 'No placement notes recorded.'}</Label>
          </Card>
          <NavButton
            label="View raw samples"
            icon="table"
            href={{ pathname: '/sessions/[id]/samples', params: { id } }}
          />
          {historical ? (
            <>
              <Button
                label="Download PDF report"
                icon="file-pdf-box"
                busy={exporting}
                onPress={() => void exportPdf()}
              />
              {exportMessage && <Notice tone="success">{exportMessage}</Notice>}
              {exportError && <Notice tone="error">{exportError}</Notice>}
            </>
          ) : (
            <ConfirmAction
              label="Stop and save session"
              title="Finish this measurement?"
              message="Stopping saves the session’s complete-sample assessment and closes collection. This session cannot be resumed. A new measurement starts a new session."
              action={async () => {
                const completed = await api(`/sessions/${id}/stop`, decodeSession, {
                  method: 'POST',
                });
                setLoaded((previous) =>
                  previous && previous.session.id === id
                    ? { ...previous, session: completed }
                    : previous,
                );
                await refresh();
              }}
            />
          )}
        </>
      )}
    </Screen>
  );
}
