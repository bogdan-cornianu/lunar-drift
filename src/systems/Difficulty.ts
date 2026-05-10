export const DIFFICULTY_LEVELS = ['easy', 'normal', 'hard'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const DEFAULT_DIFFICULTY: DifficultyLevel = 'normal';

export interface DifficultyProfile {
  label: string;
  lives: number;
  fuelBurnScale: number;
  landingLimitScale: number;
  gradeLimitScale: number;
  terrainRoughnessScale: number;
  padWidthScale: number;
  windStartSite: number;
  windScale: number;
  refuelAdjustment: number;
  objectiveFuelAdjustment: number;
  objectiveGentleVyAdjustment: number;
  hazardStartSite: number;
  hazardChanceScale: number;
  hazardCycleMs: number;
  hazardWarningMs: number;
  hazardOfflineMs: number;
  badPickupStartSite: number;
}

const PROFILES: Record<DifficultyLevel, DifficultyProfile> = {
  easy: {
    label: 'Easy',
    lives: 4,
    fuelBurnScale: 0.85,
    landingLimitScale: 1.18,
    gradeLimitScale: 1.18,
    terrainRoughnessScale: 0.9,
    padWidthScale: 1.08,
    windStartSite: 6,
    windScale: 0.65,
    refuelAdjustment: 0.08,
    objectiveFuelAdjustment: -10,
    objectiveGentleVyAdjustment: 4,
    hazardStartSite: 5,
    hazardChanceScale: 0.65,
    hazardCycleMs: 9000,
    hazardWarningMs: 1500,
    hazardOfflineMs: 1400,
    badPickupStartSite: 4,
  },
  normal: {
    label: 'Normal',
    lives: 3,
    fuelBurnScale: 1,
    landingLimitScale: 1,
    gradeLimitScale: 1,
    terrainRoughnessScale: 1,
    padWidthScale: 1,
    windStartSite: 4,
    windScale: 1,
    refuelAdjustment: 0,
    objectiveFuelAdjustment: 0,
    objectiveGentleVyAdjustment: 0,
    hazardStartSite: 3,
    hazardChanceScale: 1,
    hazardCycleMs: 8000,
    hazardWarningMs: 1200,
    hazardOfflineMs: 1800,
    badPickupStartSite: 2,
  },
  hard: {
    label: 'Hard',
    lives: 2,
    fuelBurnScale: 1.15,
    landingLimitScale: 0.88,
    gradeLimitScale: 0.9,
    terrainRoughnessScale: 1.08,
    padWidthScale: 0.92,
    windStartSite: 3,
    windScale: 1.2,
    refuelAdjustment: -0.08,
    objectiveFuelAdjustment: 10,
    objectiveGentleVyAdjustment: -3,
    hazardStartSite: 2,
    hazardChanceScale: 1.25,
    hazardCycleMs: 7000,
    hazardWarningMs: 900,
    hazardOfflineMs: 2200,
    badPickupStartSite: 2,
  },
};

export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return typeof value === 'string' && DIFFICULTY_LEVELS.includes(value as DifficultyLevel);
}

export function getDifficultyProfile(level: DifficultyLevel): DifficultyProfile {
  return PROFILES[level];
}

export function difficultyLabel(level: DifficultyLevel): string {
  return getDifficultyProfile(level).label;
}

export function nextDifficulty(level: DifficultyLevel): DifficultyLevel {
  const index = DIFFICULTY_LEVELS.indexOf(level);
  return DIFFICULTY_LEVELS[(index + 1) % DIFFICULTY_LEVELS.length];
}
