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

const HAZARD_START_SITE = 3;
const CYCLE_MS = 8000;
const WARNING_DURATION_MS = 1200;
const OFFLINE_DURATION_MS = 1800;
const INTRO_SAFE_MS = 2500;

export function createPadHazard(input: PadHazardInput): PadHazard {
  if (input.site < HAZARD_START_SITE) return { kind: 'stable' };

  const chance = hazardChance(input.multiplier, input.site);
  if (hazardRoll(input) >= chance) return { kind: 'stable' };

  const offlineStartsAtMs = CYCLE_MS - OFFLINE_DURATION_MS;
  return {
    kind: 'unstable',
    cycleMs: CYCLE_MS,
    warningStartsAtMs: offlineStartsAtMs - WARNING_DURATION_MS,
    offlineStartsAtMs,
    offlineDurationMs: OFFLINE_DURATION_MS,
    phaseOffsetMs: phaseOffset(input),
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

export function canLandOnPad(hazard: PadHazard, timeMs: number): boolean {
  return getPadHazardState(hazard, timeMs) !== 'offline';
}

function hazardChance(multiplier: number, site: number): number {
  const base = multiplier >= 10 ? 0.72 : multiplier >= 5 ? 0.4 : 0.2;
  return Math.min(0.9, base + Math.max(0, site - HAZARD_START_SITE) * 0.04);
}

function hazardRoll(input: PadHazardInput): number {
  return positiveModulo(input.seed + input.padIndex * 37 + input.multiplier * 17, 100) / 100;
}

function phaseOffset(input: PadHazardInput): number {
  const maxStartingOffset = CYCLE_MS - WARNING_DURATION_MS - OFFLINE_DURATION_MS - INTRO_SAFE_MS;
  return positiveModulo(input.seed * 97 + input.padIndex * 1300 + input.multiplier * 251, maxStartingOffset);
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}
