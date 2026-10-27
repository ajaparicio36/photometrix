export const categories = [
  'Classroom',
  'Computer Lab',
  'Offices',
  'Lecture hall/Auditorium',
  'CAD Workstation',
] as const;
export type Category = (typeof categories)[number];
export const targets = {
  Classroom: 500,
  'Computer Lab': 300,
  Offices: 300,
  'Lecture hall/Auditorium': 500,
  'CAD Workstation': 500,
} satisfies Record<Category, number>;
export type Assessment = 'below_target' | 'meets_target';
export interface ReadingValues {
  sensor1Lux: number | null;
  sensor2Lux: number | null;
  sensor3Lux: number | null;
}
export interface Summary {
  totalSampleCount: number;
  completeSampleCount: number;
  incompleteSampleCount: number;
  firstSampledAt: string | null;
  lastSampledAt: string | null;
  sessionAverageLux: number | null;
  assessment: Assessment | null;
  result: 'assessed' | 'insufficient_data';
  recommendations: string[];
}
export function assess(average: number, target: number): Assessment {
  return average < target ? 'below_target' : 'meets_target';
}
export function mean(readings: ReadingValues): number | null {
  const values = [
    readings.sensor1Lux,
    readings.sensor2Lux,
    readings.sensor3Lux,
  ];
  if (values.some((value) => value === null)) return null;
  if (
    !values.every(
      (value) =>
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 65535,
    )
  )
    throw new Error('Invalid illuminance');
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0) / 3;
}
export function recommendations(assessment: Assessment | null): string[] {
  if (assessment === null)
    return ['Check the sensors and collect complete readings.'];
  if (assessment === 'below_target')
    return [
      'Review lamp operation, cleanliness, daylight, obstructions, and representative sensor placement.',
    ];
  return [
    'No illuminance correction is required by this room target comparison.',
  ];
}
export function summarize(
  samples: { averageLux: number | null; sampledAt: Date }[],
  target: number,
): Summary {
  const complete = samples.filter((sample) => sample.averageLux !== null);
  const average = complete.length
    ? complete.reduce((sum, sample) => sum + (sample.averageLux ?? 0), 0) /
      complete.length
    : null;
  const assessment = average === null ? null : assess(average, target);
  const first = samples.reduce(
    (time, sample) => Math.min(time, sample.sampledAt.getTime()),
    Infinity,
  );
  const last = samples.reduce(
    (time, sample) => Math.max(time, sample.sampledAt.getTime()),
    -Infinity,
  );
  return {
    totalSampleCount: samples.length,
    completeSampleCount: complete.length,
    incompleteSampleCount: samples.length - complete.length,
    firstSampledAt: samples.length ? new Date(first).toISOString() : null,
    lastSampledAt: samples.length ? new Date(last).toISOString() : null,
    sessionAverageLux: average,
    assessment,
    result: average === null ? 'insufficient_data' : 'assessed',
    recommendations: recommendations(assessment),
  };
}
