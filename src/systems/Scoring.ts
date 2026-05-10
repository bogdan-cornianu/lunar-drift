import {
  OBJECTIVE_BONUS,
  PERFECT_ANGLE_DEG,
  PERFECT_VX,
  PERFECT_VY,
  SAFE_ANGLE_DEG,
  SAFE_VX,
  SAFE_VY,
  STREAK_BONUS,
} from '../config';
import {
  DEFAULT_DIFFICULTY,
  DifficultyLevel,
  getDifficultyProfile,
} from './Difficulty';

export interface LandingInput {
  multiplier: number;
  fuelRemaining: number;
  vx: number;
  vy: number;
  angleDeg: number;
  streak: number;
  objectiveMet: boolean;
}

export type LandingGrade = 'PERFECT' | 'GOOD' | 'ROUGH';

export interface LandingScore {
  total: number;
  grade: LandingGrade;
  base: number;
  fuelBonus: number;
  streakBonus: number;
  objectiveBonus: number;
}

export interface LandingLimits {
  safeVx: number;
  safeVy: number;
  safeAngleDeg: number;
}

export function getLandingLimits(
  difficulty: DifficultyLevel = DEFAULT_DIFFICULTY,
): LandingLimits {
  const scale = getDifficultyProfile(difficulty).landingLimitScale;
  return {
    safeVx: SAFE_VX * scale,
    safeVy: SAFE_VY * scale,
    safeAngleDeg: SAFE_ANGLE_DEG * scale,
  };
}

export function computeLandingScore(
  input: LandingInput,
  difficulty: DifficultyLevel = DEFAULT_DIFFICULTY,
): LandingScore {
  const absVx = Math.abs(input.vx);
  const absVy = Math.abs(input.vy);
  const absAngle = Math.abs(input.angleDeg);
  const grade = computeLandingGrade(absVx, absVy, absAngle, difficulty);
  const cleanliness = Math.max(0, 120 - absVx * 1.4 - absVy * 1.8 - absAngle * 2);
  const base = input.multiplier * Math.round(cleanliness);
  const fuelBonus = Math.round(input.fuelRemaining * (grade === 'PERFECT' ? 7 : 5));
  const streakBonus = input.streak > 0 ? input.streak * STREAK_BONUS : 0;
  const objectiveBonus = input.objectiveMet ? OBJECTIVE_BONUS : 0;

  return {
    total: base + fuelBonus + streakBonus + objectiveBonus,
    grade,
    base,
    fuelBonus,
    streakBonus,
    objectiveBonus,
  };
}

function computeLandingGrade(
  absVx: number,
  absVy: number,
  absAngle: number,
  difficulty: DifficultyLevel,
): LandingGrade {
  const scale = getDifficultyProfile(difficulty).gradeLimitScale;
  if (
    absVx <= PERFECT_VX * scale &&
    absVy <= PERFECT_VY * scale &&
    absAngle <= PERFECT_ANGLE_DEG * scale
  ) {
    return 'PERFECT';
  }
  if (absVx <= 16 * scale && absVy <= 24 * scale && absAngle <= 9 * scale) return 'GOOD';
  return 'ROUGH';
}
