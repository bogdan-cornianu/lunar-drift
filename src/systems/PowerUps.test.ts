import { describe, expect, it } from 'vitest';
import { FUEL_MAX } from '../config';
import {
  applyDestabilizer,
  applyFuelCell,
  applyFuelLeak,
  applyStabilizerBurst,
  createPowerUpSpawn,
  createPowerUpSpawns,
  HAZARD_SYNC_DURATION_MS,
  isHazardSyncActive,
} from './PowerUps';

const pads = [
  { x: 100, y: 420, width: 120 },
  { x: 340, y: 390, width: 70 },
  { x: 560, y: 450, width: 38 },
];

const surfaceYAt = (x: number): number => 460 - Math.sin(x / 90) * 30;

describe('createPowerUpSpawn', () => {
  it('does not spawn power-ups on the first site', () => {
    expect(createPowerUpSpawn({ seed: 123, site: 1, pads, surfaceYAt })).toBeNull();
  });

  it('deterministically spawns one pickup above terrain and away from pad surfaces', () => {
    const spawn = createPowerUpSpawn({ seed: 123, site: 2, pads, surfaceYAt });

    expect(spawn).toEqual(createPowerUpSpawn({ seed: 123, site: 2, pads, surfaceYAt }));
    expect(spawn).not.toBeNull();
    expect(spawn?.y).toBeLessThan(surfaceYAt(spawn?.x ?? 0) - 70);
    expect(pads.some((pad) => spawn && spawn.x >= pad.x && spawn.x <= pad.x + pad.width)).toBe(
      false,
    );
  });

  it('excludes hazard sync before unstable landing pads can appear', () => {
    for (let seed = 1; seed <= 80; seed++) {
      expect(createPowerUpSpawn({ seed, site: 2, pads, surfaceYAt })?.kind).not.toBe(
        'hazard-sync',
      );
    }
  });

  it('can choose hazard sync on hazard-enabled sites', () => {
    const kinds = new Set(
      Array.from({ length: 120 }, (_, index) =>
        createPowerUpSpawn({ seed: index + 1, site: 3, pads, surfaceYAt })?.kind,
      ),
    );

    expect(kinds.has('hazard-sync')).toBe(true);
  });
});

describe('createPowerUpSpawns', () => {
  it('spawns one good and one bad pickup per eligible site near the descent corridor', () => {
    const spawns = createPowerUpSpawns({ seed: 123, site: 2, pads, surfaceYAt });

    expect(spawns).toHaveLength(2);
    expect(spawns.map((spawn) => spawn.polarity).sort()).toEqual(['bad', 'good']);
    for (const spawn of spawns) {
      expect(Math.abs(spawn.x - 400)).toBeLessThanOrEqual(170);
      expect(spawn.y).toBeLessThan(surfaceYAt(spawn.x) - 70);
    }
  });

  it('keeps paired pickups close enough to read as a choice but separated enough to dodge', () => {
    const [first, second] = createPowerUpSpawns({ seed: 456, site: 3, pads, surfaceYAt });
    const distance = Math.hypot(first.x - second.x, first.y - second.y);

    expect(distance).toBeGreaterThanOrEqual(64);
    expect(distance).toBeLessThanOrEqual(120);
  });

  it('keeps bad pad blackout out of early non-hazard sites', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const bad = createPowerUpSpawns({ seed, site: 2, pads, surfaceYAt }).find(
        (spawn) => spawn.polarity === 'bad',
      );

      expect(bad?.kind).not.toBe('pad-blackout');
    }
  });
});

describe('power-up effects', () => {
  it('restores fuel without exceeding the tank maximum', () => {
    expect(applyFuelCell(50)).toBe(75);
    expect(applyFuelCell(90)).toBe(FUEL_MAX);
  });

  it('drains fuel without going below empty', () => {
    expect(applyFuelLeak(60)).toBe(35);
    expect(applyFuelLeak(10)).toBe(0);
  });

  it('dampens velocity and nudges rotation toward upright without snapping fully safe', () => {
    const stabilized = applyStabilizerBurst({
      vx: 40,
      vy: -30,
      rotationRad: 1,
    });

    expect(stabilized.vx).toBeCloseTo(22);
    expect(stabilized.vy).toBeCloseTo(-19.5);
    expect(stabilized.rotationRad).toBeCloseTo(0.6);
    expect(stabilized.angularVelocity).toBe(0);
  });

  it('destabilizes velocity and rotation without changing their direction', () => {
    const destabilized = applyDestabilizer({
      vx: -24,
      vy: 30,
      rotationRad: -0.5,
    });

    expect(destabilized.vx).toBeCloseTo(-30);
    expect(destabilized.vy).toBeCloseTo(36);
    expect(destabilized.rotationRad).toBeCloseTo(-0.7);
    expect(destabilized.angularVelocity).toBe(70);
  });

  it('keeps hazard sync active only inside the sync window', () => {
    expect(HAZARD_SYNC_DURATION_MS).toBe(4000);
    expect(isHazardSyncActive(1000, 4999)).toBe(true);
    expect(isHazardSyncActive(1000, 5000)).toBe(false);
    expect(isHazardSyncActive(null, 3000)).toBe(false);
  });
});
