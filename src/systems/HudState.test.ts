import { describe, expect, it } from 'vitest';
import { FUEL_MAX, SAFE_ANGLE_DEG, SAFE_VX, SAFE_VY } from '../config';
import { computeLandingCue, formatObjectiveStatus } from './HudState';

describe('HudState', () => {
  it('marks landings safe when drift, descent, and tilt are within limits', () => {
    const cue = computeLandingCue({
      vx: SAFE_VX - 4,
      vy: SAFE_VY - 6,
      angleDeg: SAFE_ANGLE_DEG - 3,
    });

    expect(cue.level).toBe('safe');
    expect(cue.label).toBe('SAFE');
    expect(cue.lateral.level).toBe('safe');
    expect(cue.descent.level).toBe('safe');
    expect(cue.tilt.level).toBe('safe');
  });

  it('highlights fast descent before touchdown', () => {
    const cue = computeLandingCue({
      vx: SAFE_VX - 8,
      vy: SAFE_VY + 1,
      angleDeg: 0,
    });

    expect(cue.level).toBe('unsafe');
    expect(cue.label).toBe('FAST');
    expect(cue.descent.level).toBe('unsafe');
  });

  it('warns when landing metrics are near the safety limit', () => {
    const cue = computeLandingCue({
      vx: 0,
      vy: SAFE_VY - 2,
      angleDeg: 0,
    });

    expect(cue.level).toBe('warning');
    expect(cue.label).toBe('CHECK');
    expect(cue.descent.level).toBe('warning');
  });

  it('highlights lateral drift separately from vertical speed', () => {
    const cue = computeLandingCue({
      vx: -(SAFE_VX + 1),
      vy: SAFE_VY - 10,
      angleDeg: 0,
    });

    expect(cue.level).toBe('unsafe');
    expect(cue.label).toBe('DRIFT');
    expect(cue.lateral.level).toBe('unsafe');
  });

  it('highlights unsafe tilt separately from speed', () => {
    const cue = computeLandingCue({
      vx: 0,
      vy: SAFE_VY - 10,
      angleDeg: SAFE_ANGLE_DEG + 1,
    });

    expect(cue.level).toBe('unsafe');
    expect(cue.label).toBe('TILT');
    expect(cue.tilt.level).toBe('unsafe');
  });

  it('uses a combined label when multiple landing causes are unsafe', () => {
    const cue = computeLandingCue({
      vx: SAFE_VX + 1,
      vy: SAFE_VY + 1,
      angleDeg: SAFE_ANGLE_DEG + 1,
    });

    expect(cue.level).toBe('unsafe');
    expect(cue.label).toBe('UNSAFE');
    expect(cue.unsafeCauses).toEqual(['lateral', 'descent', 'tilt']);
  });

  it('formats compact objective progress for the live HUD', () => {
    expect(
      formatObjectiveStatus(
        { kind: 'safe', label: 'LAND SAFELY' },
        { fuel: 52, fuelMax: FUEL_MAX, vy: 18, multiplier: 2 },
      ),
    ).toBe('LAND SAFELY');
    expect(
      formatObjectiveStatus(
        { kind: 'fuel', label: 'LAND WITH 40+ FUEL', fuelMin: 40 },
        { fuel: 37.4, fuelMax: FUEL_MAX, vy: 18, multiplier: 2 },
      ),
    ).toBe('FUEL 37/40');
    expect(
      formatObjectiveStatus(
        { kind: 'gentle', label: 'TOUCH DOWN VY <= 20', vyMax: 20 },
        { fuel: 60, fuelMax: FUEL_MAX, vy: -18.2, multiplier: 2 },
      ),
    ).toBe('VY 18/20');
    expect(
      formatObjectiveStatus(
        { kind: 'pad', label: 'LAND ON 5X PAD', multiplierMin: 5 },
        { fuel: 60, fuelMax: FUEL_MAX, vy: 18, multiplier: 2 },
      ),
    ).toBe('5X PAD');
  });
});
