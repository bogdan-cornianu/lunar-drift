import { FUEL_MAX, GAME_WIDTH } from '../config';
import { mulberry32 } from '../utils/midpointDisplacement';
import {
  DEFAULT_DIFFICULTY,
  DifficultyLevel,
  getDifficultyProfile,
} from './Difficulty';

export type PowerUpKind = 'fuel' | 'stabilizer' | 'hazard-sync';
export type BadPowerUpKind = 'fuel-leak' | 'destabilizer' | 'pad-blackout';
export type PowerUpEffectKind = PowerUpKind | BadPowerUpKind;
export type PowerUpPolarity = 'good' | 'bad';

export interface PowerUpSpawn {
  kind: PowerUpEffectKind;
  polarity: PowerUpPolarity;
  x: number;
  y: number;
}

export interface PowerUpPad {
  x: number;
  y: number;
  width: number;
}

export interface PowerUpSpawnInput {
  seed: number;
  site: number;
  pads: readonly PowerUpPad[];
  surfaceYAt: (x: number) => number;
}

export interface StabilizerInput {
  vx: number;
  vy: number;
  rotationRad: number;
}

export interface StabilizerOutput extends StabilizerInput {
  angularVelocity: number;
}

interface SpawnRange {
  start: number;
  end: number;
}

export const FUEL_CELL_RESTORE = 25;
export const FUEL_LEAK_DRAIN = 25;
export const HAZARD_SYNC_DURATION_MS = 4000;

const FIRST_POWER_UP_SITE = 2;
const MIN_X = 60;
const MAX_X = GAME_WIDTH - 60;
const PAD_CLEARANCE = 24;
const DESCENT_CENTER_X = GAME_WIDTH / 2;
const DESCENT_CORRIDOR_HALF_WIDTH = 145;
const PAIR_MIN_DISTANCE = 64;
const PAIR_MAX_DISTANCE = 96;

export function createPowerUpSpawn(
  input: PowerUpSpawnInput,
  difficulty: DifficultyLevel = DEFAULT_DIFFICULTY,
): PowerUpSpawn | null {
  return createLegacyWidePowerUpSpawn(input, difficulty);
}

export function createPowerUpSpawns(
  input: PowerUpSpawnInput,
  difficulty: DifficultyLevel = DEFAULT_DIFFICULTY,
): PowerUpSpawn[] {
  if (input.site < FIRST_POWER_UP_SITE) return [];

  const profile = getDifficultyProfile(difficulty);
  const rand = mulberry32(input.seed ^ input.site ^ 0x5f3759df);
  const centerX = DESCENT_CENTER_X + (rand() - 0.5) * DESCENT_CORRIDOR_HALF_WIDTH * 1.1;
  const distance = PAIR_MIN_DISTANCE + rand() * (PAIR_MAX_DISTANCE - PAIR_MIN_DISTANCE);
  const goodFirst = rand() < 0.5;
  const altitude = 100 + rand() * 50;
  const y = Math.max(80, Math.round(input.surfaceYAt(centerX) - altitude));
  const leftX = clamp(
    Math.round(centerX - distance / 2),
    DESCENT_CENTER_X - DESCENT_CORRIDOR_HALF_WIDTH,
    DESCENT_CENTER_X + DESCENT_CORRIDOR_HALF_WIDTH,
  );
  const rightX = clamp(
    Math.round(centerX + distance / 2),
    DESCENT_CENTER_X - DESCENT_CORRIDOR_HALF_WIDTH,
    DESCENT_CENTER_X + DESCENT_CORRIDOR_HALF_WIDTH,
  );

  const good: PowerUpSpawn = {
    kind: choosePowerUpKind(input.site, rand(), difficulty),
    polarity: 'good',
    x: goodFirst ? leftX : rightX,
    y,
  };

  if (input.site < profile.badPickupStartSite) return [good];

  return [
    good,
    {
      kind: chooseBadPowerUpKind(input.site, rand(), difficulty),
      polarity: 'bad',
      x: goodFirst ? rightX : leftX,
      y: y + Math.round((rand() - 0.5) * 24),
    },
  ];
}

export function createLegacyWidePowerUpSpawn(
  input: PowerUpSpawnInput,
  difficulty: DifficultyLevel = DEFAULT_DIFFICULTY,
): PowerUpSpawn | null {
  if (input.site < FIRST_POWER_UP_SITE) return null;
  const rand = mulberry32(input.seed ^ input.site ^ 0x5f3759df);
  const range = chooseSpawnRange(input.pads, rand);
  if (!range) return null;

  const x = Math.round(range.start + rand() * (range.end - range.start));
  const altitude = 120 + rand() * 70;
  return {
    kind: choosePowerUpKind(input.site, rand(), difficulty),
    polarity: 'good',
    x,
    y: Math.max(80, Math.round(input.surfaceYAt(x) - altitude)),
  };
}

export function applyFuelCell(fuel: number): number {
  return Math.min(FUEL_MAX, Math.round(fuel + FUEL_CELL_RESTORE));
}

export function applyFuelLeak(fuel: number): number {
  return Math.max(0, Math.round(fuel - FUEL_LEAK_DRAIN));
}

export function applyStabilizerBurst(input: StabilizerInput): StabilizerOutput {
  return {
    vx: input.vx * 0.55,
    vy: input.vy * 0.65,
    rotationRad: input.rotationRad * 0.6,
    angularVelocity: 0,
  };
}

export function applyDestabilizer(input: StabilizerInput): StabilizerOutput {
  return {
    vx: input.vx * 1.25,
    vy: input.vy * 1.2,
    rotationRad: input.rotationRad * 1.4,
    angularVelocity: input.rotationRad < 0 ? 70 : -70,
  };
}

export function isHazardSyncActive(startTimeMs: number | null, nowMs: number): boolean {
  return (
    startTimeMs !== null &&
    nowMs >= startTimeMs &&
    nowMs - startTimeMs < HAZARD_SYNC_DURATION_MS
  );
}

function choosePowerUpKind(
  site: number,
  roll: number,
  difficulty: DifficultyLevel,
): PowerUpKind {
  const hazardStartSite = getDifficultyProfile(difficulty).hazardStartSite;
  if (site < hazardStartSite) return roll < 0.55 ? 'fuel' : 'stabilizer';
  if (roll < 0.42) return 'fuel';
  if (roll < 0.78) return 'stabilizer';
  return 'hazard-sync';
}

function chooseBadPowerUpKind(
  site: number,
  roll: number,
  difficulty: DifficultyLevel,
): BadPowerUpKind {
  const hazardStartSite = getDifficultyProfile(difficulty).hazardStartSite;
  if (site < hazardStartSite) return roll < 0.55 ? 'fuel-leak' : 'destabilizer';
  if (roll < 0.42) return 'fuel-leak';
  if (roll < 0.78) return 'destabilizer';
  return 'pad-blackout';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function chooseSpawnRange(pads: readonly PowerUpPad[], rand: () => number): SpawnRange | null {
  const ranges = availableRanges(pads);
  const totalWidth = ranges.reduce((sum, range) => sum + range.end - range.start, 0);
  if (totalWidth <= 0) return null;

  let cursor = rand() * totalWidth;
  for (const range of ranges) {
    cursor -= range.end - range.start;
    if (cursor <= 0) return range;
  }
  return ranges[ranges.length - 1];
}

function availableRanges(pads: readonly PowerUpPad[]): SpawnRange[] {
  const blocked = [...pads]
    .sort((a, b) => a.x - b.x)
    .map((pad) => ({
      start: Math.max(MIN_X, pad.x - PAD_CLEARANCE),
      end: Math.min(MAX_X, pad.x + pad.width + PAD_CLEARANCE),
    }));
  const ranges: SpawnRange[] = [];
  let cursor = MIN_X;

  for (const interval of blocked) {
    if (interval.start > cursor) ranges.push({ start: cursor, end: interval.start });
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < MAX_X) ranges.push({ start: cursor, end: MAX_X });

  return ranges.filter((range) => range.end - range.start >= 12);
}
