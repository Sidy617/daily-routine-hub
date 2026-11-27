import { describe, expect, it } from 'vitest';
import { PHASES, SUNRISE, SUNSET, skyAt } from './sky';

describe('sky', () => {
  it('is fully noon at 12:30, with the sun at the top of its arc', () => {
    const s = skyAt(12 * 60 + 30);
    expect(s.from).toBe('noon');
    expect(s.t).toBe(0);
    expect(s.body).toEqual({ x: 50, y: 6, sun: true });
  });

  it('rises at the left at sunrise and sets at the right', () => {
    expect(skyAt(SUNRISE).body).toEqual({ x: 4, y: 46, sun: true });
    const late = skyAt(SUNSET - 1).body;
    expect(late.sun).toBe(true);
    expect(late.x).toBeGreaterThan(95);
    expect(skyAt(SUNSET).body.sun).toBe(false);
  });

  it('is night at 03:00, with the moon up', () => {
    const s = skyAt(3 * 60);
    expect([s.from, s.to]).toEqual(['night', 'night']);
    expect(s.body.sun).toBe(false);
    expect(s.part).toBe('night');
  });

  it('blends sunset into dusk in the evening', () => {
    const s = skyAt(18 * 60 + 45);
    expect([s.from, s.to]).toEqual(['sunset', 'dusk']);
    expect(s.t).toBeCloseTo(1 / 3, 2);
  });

  it('wraps around midnight', () => {
    expect(skyAt(-60)).toEqual(skyAt(23 * 60));
    expect(skyAt(1440 + 30)).toEqual(skyAt(30));
  });

  it('gives a known phase, a share under 1 and a place on the arc for every minute of the day', () => {
    for (let m = 0; m < 1440; m++) {
      const s = skyAt(m);
      expect(PHASES).toContain(s.from);
      expect(PHASES).toContain(s.to);
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(1);
      expect(s.body.x).toBeGreaterThanOrEqual(4);
      expect(s.body.x).toBeLessThanOrEqual(96);
      expect(s.body.y).toBeGreaterThanOrEqual(6);
      expect(s.body.y).toBeLessThanOrEqual(46);
    }
  });
});
