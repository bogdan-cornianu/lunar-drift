import { SAFE_ANGLE_DEG, SAFE_VX, SAFE_VY } from '../config';
import type { DifficultyLevel } from './Difficulty';
import type { Objective } from './RunProgression';
import { getLandingLimits } from './Scoring';

export type LandingCueLevel = 'safe' | 'warning' | 'unsafe';
export type LandingCueCause = 'lateral' | 'descent' | 'tilt';

export interface LandingCueMetric {
  level: LandingCueLevel;
  ratio: number;
}

export interface LandingCue {
  level: LandingCueLevel;
  label: string;
  unsafeCauses: LandingCueCause[];
  lateral: LandingCueMetric;
  descent: LandingCueMetric;
  tilt: LandingCueMetric;
}

export interface LandingCueInput {
  vx: number;
  vy: number;
  angleDeg: number;
}

export interface LandingCueLimits {
  lateral: number;
  descent: number;
  tilt: number;
}

export interface ObjectiveStatusInput {
  fuel: number;
  fuelMax: number;
  vy: number;
  multiplier: number;
}

const WARNING_RATIO = 0.9;

export function computeLandingCue(
  input: LandingCueInput,
  limits: LandingCueLimits = LANDING_CUE_LIMITS,
): LandingCue {
  const lateral = metric(Math.abs(input.vx), limits.lateral);
  const descent = metric(Math.abs(input.vy), limits.descent);
  const tilt = metric(Math.abs(input.angleDeg), limits.tilt);
  const metrics: Array<[LandingCueCause, LandingCueMetric]> = [
    ['lateral', lateral],
    ['descent', descent],
    ['tilt', tilt],
  ];
  const unsafeCauses = metrics
    .filter(([, cue]) => cue.level === 'unsafe')
    .map(([cause]) => cause);

  const hasWarning = [lateral, descent, tilt].some((cue) => cue.level === 'warning');
  const level: LandingCueLevel =
    unsafeCauses.length > 0 ? 'unsafe' : hasWarning ? 'warning' : 'safe';

  return {
    level,
    label: labelFor(level, unsafeCauses),
    unsafeCauses,
    lateral,
    descent,
    tilt,
  };
}

export function formatObjectiveStatus(
  objective: Objective,
  input: ObjectiveStatusInput,
): string {
  if (objective.kind === 'fuel') {
    return `FUEL ${Math.max(0, Math.round(input.fuel))}/${objective.fuelMin}`;
  }
  if (objective.kind === 'gentle') {
    return `VY ${Math.round(Math.abs(input.vy))}/${objective.vyMax}`;
  }
  if (objective.kind === 'pad') return `${objective.multiplierMin}X PAD`;
  return objective.label;
}

export const LANDING_CUE_LIMITS = {
  lateral: SAFE_VX,
  descent: SAFE_VY,
  tilt: SAFE_ANGLE_DEG,
} as const;

export function getLandingCueLimits(difficulty: DifficultyLevel): LandingCueLimits {
  const limits = getLandingLimits(difficulty);
  return {
    lateral: limits.safeVx,
    descent: limits.safeVy,
    tilt: limits.safeAngleDeg,
  };
}

function metric(value: number, limit: number): LandingCueMetric {
  const ratio = limit <= 0 ? 1 : value / limit;
  const level: LandingCueLevel =
    ratio > 1 ? 'unsafe' : ratio >= WARNING_RATIO ? 'warning' : 'safe';
  return { level, ratio };
}

function labelFor(level: LandingCueLevel, unsafeCauses: LandingCueCause[]): string {
  if (level === 'safe') return 'SAFE';
  if (level === 'warning') return 'CHECK';
  if (unsafeCauses.length !== 1) return 'UNSAFE';
  if (unsafeCauses[0] === 'lateral') return 'DRIFT';
  if (unsafeCauses[0] === 'descent') return 'FAST';
  return 'TILT';
}
