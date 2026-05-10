import {
  DEFAULT_DIFFICULTY,
  DifficultyLevel,
  getDifficultyProfile,
} from './Difficulty';

export type PadHazardState = 'online' | 'warning' | 'offline';

export type PadHazard =
  | { kind: 'stable' }
  | {
      kind: 'unstable';
      cycleMs: number;
      warningStartsAtMs: number;
      offlineStartsAtMs: number;
      offlineDurationMs: number;
      phaseOffsetMs: number;
    };

export interface PadHazardInput {
  seed: number;
  site: number;
  multiplier: number;
  padIndex: number;
}

const INTRO_SAFE_MS = 2500;

export function createPadHazard(
  input: PadHazardInput,
  difficulty: DifficultyLevel = DEFAULT_DIFFICULTY,
): PadHazard {
  const profile = getDifficultyProfile(difficulty);
  if (input.site < profile.hazardStartSite) return { kind: 'stable' };

  const chance = hazardChance(input.multiplier, input.site, difficulty);
  if (hazardRoll(input) >= chance) return { kind: 'stable' };

  const offlineStartsAtMs = profile.hazardCycleMs - profile.hazardOfflineMs;
  return {
    kind: 'unstable',
    cycleMs: profile.hazardCycleMs,
    warningStartsAtMs: offlineStartsAtMs - profile.hazardWarningMs,
    offlineStartsAtMs,
    offlineDurationMs: profile.hazardOfflineMs,
    phaseOffsetMs: phaseOffset(input, difficulty),
  };
}

export function getPadHazardState(hazard: PadHazard, timeMs: number): PadHazardState {
  if (hazard.kind === 'stable') return 'online';

  const cycleTime = positiveModulo(timeMs + hazard.phaseOffsetMs, hazard.cycleMs);
  if (
    cycleTime >= hazard.offlineStartsAtMs &&
    cycleTime < hazard.offlineStartsAtMs + hazard.offlineDurationMs
  ) {
    return 'offline';
  }
  if (cycleTime >= hazard.warningStartsAtMs && cycleTime < hazard.offlineStartsAtMs) {
    return 'warning';
  }
  return 'online';
}

export function canLandOnPad(
  hazard: PadHazard,
  timeMs: number,
  forceOnline = false,
  forceOffline = false,
): boolean {
  if (forceOffline) return false;
  if (forceOnline) return true;
  return getPadHazardState(hazard, timeMs) !== 'offline';
}

function hazardChance(multiplier: number, site: number, difficulty: DifficultyLevel): number {
  const profile = getDifficultyProfile(difficulty);
  const base = multiplier >= 10 ? 0.72 : multiplier >= 5 ? 0.4 : 0.2;
  const pressure = base + Math.max(0, site - profile.hazardStartSite) * 0.04;
  return Math.min(0.95, pressure * profile.hazardChanceScale);
}

function hazardRoll(input: PadHazardInput): number {
  return positiveModulo(input.seed + input.padIndex * 37 + input.multiplier * 17, 100) / 100;
}

function phaseOffset(input: PadHazardInput, difficulty: DifficultyLevel): number {
  const profile = getDifficultyProfile(difficulty);
  const maxStartingOffset =
    profile.hazardCycleMs - profile.hazardWarningMs - profile.hazardOfflineMs - INTRO_SAFE_MS;
  return positiveModulo(input.seed * 97 + input.padIndex * 1300 + input.multiplier * 251, maxStartingOffset);
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}
