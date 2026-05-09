import { OBJECTIVE_BONUS, PERFECT_ANGLE_DEG, PERFECT_VX, PERFECT_VY, STREAK_BONUS } from '../config';

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

export function computeLandingScore(input: LandingInput): LandingScore {
  const absVx = Math.abs(input.vx);
  const absVy = Math.abs(input.vy);
  const absAngle = Math.abs(input.angleDeg);
  const grade = computeLandingGrade(absVx, absVy, absAngle);
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

function computeLandingGrade(absVx: number, absVy: number, absAngle: number): LandingGrade {
  if (absVx <= PERFECT_VX && absVy <= PERFECT_VY && absAngle <= PERFECT_ANGLE_DEG) return 'PERFECT';
  if (absVx <= 16 && absVy <= 24 && absAngle <= 9) return 'GOOD';
  return 'ROUGH';
}
