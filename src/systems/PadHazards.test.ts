import { describe, expect, it } from 'vitest';
import {
  canLandOnPad,
  createPadHazard,
  getPadHazardState,
  PadHazard,
} from './PadHazards';

describe('createPadHazard', () => {
  it('keeps early sites stable so players learn core landing rules first', () => {
    expect(createPadHazard({ seed: 99, site: 1, multiplier: 10, padIndex: 0 })).toEqual({
      kind: 'stable',
    });
    expect(createPadHazard({ seed: 99, site: 2, multiplier: 10, padIndex: 0 })).toEqual({
      kind: 'stable',
    });
  });

  it('assigns deterministic unstable hazards with high-value pads favored', () => {
    const lowValue = createPadHazard({ seed: 7, site: 3, multiplier: 2, padIndex: 0 });
    const highValue = createPadHazard({ seed: 7, site: 3, multiplier: 10, padIndex: 2 });

    expect(lowValue.kind).toBe('stable');
    expect(highValue.kind).toBe('unstable');
    expect(highValue).toEqual(createPadHazard({ seed: 7, site: 3, multiplier: 10, padIndex: 2 }));
  });

  it('starts new unstable pads online with time to read the route', () => {
    const hazard = createPadHazard({ seed: 999, site: 8, multiplier: 10, padIndex: 3 });

    expect(hazard.kind).toBe('unstable');
    expect(getPadHazardState(hazard, 0)).toBe('online');
    expect(getPadHazardState(hazard, 2000)).toBe('online');
  });
});

describe('getPadHazardState', () => {
  const unstable: PadHazard = {
    kind: 'unstable',
    cycleMs: 8000,
    warningStartsAtMs: 5000,
    offlineStartsAtMs: 6200,
    offlineDurationMs: 1800,
    phaseOffsetMs: 0,
  };

  it('moves from online to warning to offline on a predictable loop', () => {
    expect(getPadHazardState(unstable, 4999)).toBe('online');
    expect(getPadHazardState(unstable, 5000)).toBe('warning');
    expect(getPadHazardState(unstable, 6199)).toBe('warning');
    expect(getPadHazardState(unstable, 6200)).toBe('offline');
    expect(getPadHazardState(unstable, 7999)).toBe('offline');
    expect(getPadHazardState(unstable, 8000)).toBe('online');
  });

  it('only blocks touchdown while the pad is offline red', () => {
    expect(canLandOnPad(unstable, 5000)).toBe(true);
    expect(canLandOnPad(unstable, 6200)).toBe(false);
    expect(canLandOnPad({ kind: 'stable' }, 6200)).toBe(true);
  });
});
