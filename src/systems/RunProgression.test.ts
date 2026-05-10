import { describe, expect, it } from 'vitest';
import {
  CLEAN_LANDING_REFUEL,
  FUEL_MAX,
  MAX_TERRAIN_ROUGHNESS,
  MAX_WIND,
  MIN_PAD_WIDTH_SCALE,
  ROUGH_LANDING_REFUEL,
  STANDARD_LANDING_REFUEL,
} from '../config';
import { RunProgression } from './RunProgression';

describe('RunProgression', () => {
  it('starts on site 1 with a safe objective and no wind', () => {
    const progression = new RunProgression();
    progression.prepareSite(123);

    expect(progression.site).toBe(1);
    expect(progression.objective).toEqual({ kind: 'safe', label: 'LAND SAFELY' });
    expect(progression.getDifficulty().windX).toBe(0);
  });

  it('advances sites and scales difficulty within configured caps', () => {
    const progression = new RunProgression();
    const first = progression.getDifficulty();

    for (let i = 0; i < 20; i++) progression.advanceSite();

    const later = progression.getDifficulty();
    expect(later.site).toBe(21);
    expect(later.terrainRoughness).toBeGreaterThan(first.terrainRoughness);
    expect(later.terrainRoughness).toBeLessThanOrEqual(MAX_TERRAIN_ROUGHNESS);
    expect(later.padWidthScale).toBeLessThan(first.padWidthScale);
    expect(later.padWidthScale).toBeGreaterThanOrEqual(MIN_PAD_WIDTH_SCALE);
    expect(Math.abs(later.windX)).toBeLessThanOrEqual(MAX_WIND);
  });

  it('keeps Normal progression matching the existing baseline', () => {
    const progression = new RunProgression('normal');

    expect(progression.getDifficulty()).toEqual({
      site: 1,
      difficulty: 'normal',
      terrainRoughness: 0.56,
      padWidthScale: 1,
      windX: 0,
    });

    progression.advanceSite();
    progression.advanceSite();
    progression.advanceSite();

    expect(progression.getDifficulty().windX).toBe(8.8);
  });

  it('scales site pressure by difficulty while preserving the site number', () => {
    const easy = new RunProgression('easy');
    const normal = new RunProgression('normal');
    const hard = new RunProgression('hard');

    for (let i = 0; i < 5; i++) {
      easy.advanceSite();
      normal.advanceSite();
      hard.advanceSite();
    }

    const easyDifficulty = easy.getDifficulty();
    const normalDifficulty = normal.getDifficulty();
    const hardDifficulty = hard.getDifficulty();

    expect(easyDifficulty.site).toBe(normalDifficulty.site);
    expect(hardDifficulty.site).toBe(normalDifficulty.site);
    expect(easyDifficulty.terrainRoughness).toBeLessThan(normalDifficulty.terrainRoughness);
    expect(hardDifficulty.terrainRoughness).toBeGreaterThan(normalDifficulty.terrainRoughness);
    expect(easyDifficulty.padWidthScale).toBeGreaterThan(normalDifficulty.padWidthScale);
    expect(hardDifficulty.padWidthScale).toBeLessThan(normalDifficulty.padWidthScale);
    expect(Math.abs(easyDifficulty.windX)).toBeLessThan(Math.abs(normalDifficulty.windX));
    expect(Math.abs(hardDifficulty.windX)).toBeGreaterThan(Math.abs(normalDifficulty.windX));
  });

  it('increments streak for perfect and good landings', () => {
    const progression = new RunProgression();
    progression.resolveLanding({ grade: 'PERFECT', fuelRemaining: 80, multiplier: 2, vy: 8 });
    progression.resolveLanding({ grade: 'GOOD', fuelRemaining: 70, multiplier: 2, vy: 18 });

    expect(progression.streak).toBe(2);
  });

  it('resets streak for rough landings', () => {
    const progression = new RunProgression();
    progression.resolveLanding({ grade: 'PERFECT', fuelRemaining: 80, multiplier: 2, vy: 8 });
    progression.resolveLanding({ grade: 'ROUGH', fuelRemaining: 40, multiplier: 2, vy: 30 });

    expect(progression.streak).toBe(0);
  });

  it('evaluates fuel objectives', () => {
    const progression = new RunProgression();
    progression.advanceSite();
    progression.advanceSite();
    progression.prepareSite(0);

    expect(progression.objective.kind).toBe('fuel');
    expect(
      progression.resolveLanding({ grade: 'GOOD', fuelRemaining: 40, multiplier: 2, vy: 18 })
        .objectiveMet,
    ).toBe(true);
  });

  it('evaluates pad multiplier objectives', () => {
    const progression = new RunProgression();
    progression.advanceSite();
    progression.advanceSite();
    progression.prepareSite(1);

    expect(progression.objective.kind).toBe('pad');
    expect(
      progression.resolveLanding({ grade: 'GOOD', fuelRemaining: 20, multiplier: 5, vy: 18 })
        .objectiveMet,
    ).toBe(true);
  });

  it('evaluates gentle vertical speed objectives', () => {
    const progression = new RunProgression();
    progression.advanceSite();
    progression.advanceSite();
    progression.prepareSite(2);

    expect(progression.objective.kind).toBe('gentle');
    expect(
      progression.resolveLanding({ grade: 'GOOD', fuelRemaining: 20, multiplier: 2, vy: 20 })
        .objectiveMet,
    ).toBe(true);
  });

  it('computes refuel from landing grade and objective outcome', () => {
    const perfect = new RunProgression().resolveLanding({
      grade: 'PERFECT',
      fuelRemaining: 80,
      multiplier: 2,
      vy: 8,
    });
    expect(perfect.nextFuel).toBe(Math.round(FUEL_MAX * CLEAN_LANDING_REFUEL));

    const good = new RunProgression().resolveLanding({
      grade: 'GOOD',
      fuelRemaining: 80,
      multiplier: 2,
      vy: 18,
    });
    expect(good.nextFuel).toBe(Math.round(FUEL_MAX * (STANDARD_LANDING_REFUEL + 0.08)));

    const progression = new RunProgression();
    progression.advanceSite();
    progression.advanceSite();
    progression.prepareSite(0);
    const roughMissedObjective = progression.resolveLanding({
      grade: 'ROUGH',
      fuelRemaining: 10,
      multiplier: 2,
      vy: 30,
    });
    expect(roughMissedObjective.nextFuel).toBe(Math.round(FUEL_MAX * ROUGH_LANDING_REFUEL));
  });

  it('adjusts refuel generosity by difficulty', () => {
    const input = {
      grade: 'GOOD' as const,
      fuelRemaining: 80,
      multiplier: 2,
      vy: 18,
    };

    const easy = new RunProgression('easy').resolveLanding(input);
    const normal = new RunProgression('normal').resolveLanding(input);
    const hard = new RunProgression('hard').resolveLanding(input);

    expect(easy.nextFuel).toBeGreaterThan(normal.nextFuel);
    expect(hard.nextFuel).toBeLessThan(normal.nextFuel);
  });

  it('adjusts objective strictness by difficulty', () => {
    const easy = new RunProgression('easy');
    const hard = new RunProgression('hard');

    for (let i = 0; i < 6; i++) {
      easy.advanceSite();
      hard.advanceSite();
    }
    easy.prepareSite(2);
    hard.prepareSite(2);

    expect(easy.objective.kind).toBe('fuel');
    expect(hard.objective.kind).toBe('fuel');
    expect(easy.objective.label).toBe('LAND WITH 40+ FUEL');
    expect(hard.objective.label).toBe('LAND WITH 60+ FUEL');
  });
});
