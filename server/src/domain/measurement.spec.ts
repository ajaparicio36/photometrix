import { assess, mean, summarize, targets } from './measurement';
import { assertTestDatabase } from '../config';
import { hashPassword, verifyPassword } from '../auth/password';

describe('measurement and trust boundaries', () => {
  it('uses requested targets, preserves zero, and never partially averages', () => {
    expect(targets.Classroom).toBe(500);
    expect(targets.Offices).toBe(300);
    expect(mean({ sensor1Lux: 0, sensor2Lux: 0, sensor3Lux: 0 })).toBe(0);
    expect(
      mean({ sensor1Lux: 500, sensor2Lux: 500, sensor3Lux: null }),
    ).toBeNull();
    expect(() =>
      mean({ sensor1Lux: Infinity, sensor2Lux: 1, sensor3Lux: 2 }),
    ).toThrow();
    expect(assess(499.999, 500)).toBe('below_target');
    expect(assess(500, 500)).toBe('meets_target');
  });
  it('summarizes complete sample means and honestly handles insufficient data', () => {
    const sampledAt = new Date('2026-10-27T00:00:00Z');
    expect(
      summarize(
        [
          { sampledAt, averageLux: 0 },
          { sampledAt, averageLux: 1000 },
          { sampledAt, averageLux: null },
        ],
        500,
      ),
    ).toMatchObject({
      completeSampleCount: 2,
      incompleteSampleCount: 1,
      sessionAverageLux: 500,
      assessment: 'meets_target',
    });
    expect(summarize([], 500)).toMatchObject({
      result: 'insufficient_data',
      totalSampleCount: 0,
      sessionAverageLux: null,
      assessment: null,
      firstSampledAt: null,
    });
  });
  it('refuses implicit cloud/developer test databases', () => {
    expect(() =>
      assertTestDatabase(
        'postgresql://user:secret@database.example/photometrix_test',
      ),
    ).toThrow();
    expect(() =>
      assertTestDatabase('postgresql://user:secret@localhost/photometrix'),
    ).toThrow();
    expect(() =>
      assertTestDatabase(
        'postgresql://user:secret@127.0.0.1:5433/photometrix_test',
      ),
    ).not.toThrow();
  });
  it('hashes passwords with independent salts and verifies safely', async () => {
    const password = 'test-only-strong-password';
    const encoded = await hashPassword(password);
    expect(encoded).not.toContain(password);
    expect(await verifyPassword(password, encoded)).toBe(true);
    expect(await verifyPassword('wrong', encoded)).toBe(false);
    expect(await verifyPassword(password, 'broken')).toBe(false);
    expect(await hashPassword(password)).not.toBe(encoded);
  });
});
