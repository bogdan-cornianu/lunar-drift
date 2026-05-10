import { describe, expect, it } from 'vitest';
import {
  DIFFICULTY_LEVELS,
  difficultyLabel,
  getDifficultyProfile,
  nextDifficulty,
} from './Difficulty';

describe('difficulty profiles', () => {
  it('defines easy, normal, and hard in cycling order', () => {
    expect(DIFFICULTY_LEVELS).toEqual(['easy', 'normal', 'hard']);
    expect(nextDifficulty('easy')).toBe('normal');
    expect(nextDifficulty('normal')).toBe('hard');
    expect(nextDifficulty('hard')).toBe('easy');
  });

  it('keeps Normal as the baseline profile', () => {
    const normal = getDifficultyProfile('normal');

    expect(normal.lives).toBe(3);
    expect(normal.fuelBurnScale).toBe(1);
    expect(normal.landingLimitScale).toBe(1);
    expect(normal.padWidthScale).toBe(1);
    expect(normal.windScale).toBe(1);
    expect(normal.hazardStartSite).toBe(3);
    expect(normal.badPickupStartSite).toBe(2);
  });

  it('makes Easy more forgiving and Hard more pressuring', () => {
    const easy = getDifficultyProfile('easy');
    const hard = getDifficultyProfile('hard');

    expect(easy.lives).toBeGreaterThan(3);
    expect(easy.fuelBurnScale).toBeLessThan(1);
    expect(easy.landingLimitScale).toBeGreaterThan(1);
    expect(easy.badPickupStartSite).toBeGreaterThan(2);

    expect(hard.lives).toBeLessThan(3);
    expect(hard.fuelBurnScale).toBeGreaterThan(1);
    expect(hard.landingLimitScale).toBeLessThan(1);
    expect(hard.hazardStartSite).toBeLessThan(3);
  });

  it('labels difficulty for UI text', () => {
    expect(difficultyLabel('easy')).toBe('Easy');
    expect(difficultyLabel('normal')).toBe('Normal');
    expect(difficultyLabel('hard')).toBe('Hard');
  });
});
