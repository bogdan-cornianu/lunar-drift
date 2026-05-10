import { describe, expect, it } from 'vitest';
import { OBJECTIVE_BONUS, STREAK_BONUS } from '../config';
import { computeLandingScore, getLandingLimits } from './Scoring';

describe('computeLandingScore', () => {
  it('grades a clean touchdown as perfect and applies the higher fuel bonus', () => {
    const score = computeLandingScore({
      multiplier: 5,
      fuelRemaining: 80,
      vx: 4,
      vy: 8,
      angleDeg: 2,
      streak: 0,
      objectiveMet: false,
    });

    expect(score.grade).toBe('PERFECT');
    expect(score.fuelBonus).toBe(560);
    expect(score.objectiveBonus).toBe(0);
    expect(score.total).toBe(score.base + score.fuelBonus);
  });

  it('grades controlled but imperfect touchdowns as good', () => {
    const score = computeLandingScore({
      multiplier: 2,
      fuelRemaining: 25,
      vx: 14,
      vy: 22,
      angleDeg: 8,
      streak: 0,
      objectiveMet: false,
    });

    expect(score.grade).toBe('GOOD');
    expect(score.fuelBonus).toBe(125);
  });

  it('grades valid but less clean touchdowns as rough', () => {
    const score = computeLandingScore({
      multiplier: 2,
      fuelRemaining: 40,
      vx: 20,
      vy: 32,
      angleDeg: 11,
      streak: 0,
      objectiveMet: false,
    });

    expect(score.grade).toBe('ROUGH');
    expect(score.fuelBonus).toBe(200);
  });

  it('adds streak and objective bonuses when applicable', () => {
    const score = computeLandingScore({
      multiplier: 10,
      fuelRemaining: 50,
      vx: 6,
      vy: 10,
      angleDeg: 3,
      streak: 3,
      objectiveMet: true,
    });

    expect(score.streakBonus).toBe(3 * STREAK_BONUS);
    expect(score.objectiveBonus).toBe(OBJECTIVE_BONUS);
    expect(score.total).toBe(
      score.base + score.fuelBonus + score.streakBonus + score.objectiveBonus,
    );
  });

  it('scales landing grades by difficulty', () => {
    const input = {
      multiplier: 2,
      fuelRemaining: 30,
      vx: 18,
      vy: 27,
      angleDeg: 10,
      streak: 0,
      objectiveMet: false,
    };

    expect(computeLandingScore(input, 'easy').grade).toBe('GOOD');
    expect(computeLandingScore(input, 'normal').grade).toBe('ROUGH');
    expect(computeLandingScore({ ...input, vx: 15, vy: 23, angleDeg: 8 }, 'hard').grade).toBe(
      'ROUGH',
    );
  });

  it('scales safe touchdown limits by difficulty', () => {
    expect(getLandingLimits('easy').safeVy).toBeGreaterThan(getLandingLimits('normal').safeVy);
    expect(getLandingLimits('hard').safeVy).toBeLessThan(getLandingLimits('normal').safeVy);
  });
});
