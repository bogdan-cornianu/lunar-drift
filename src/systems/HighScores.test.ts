import { describe, expect, it } from 'vitest';
import {
  clearHighScores,
  HIGH_SCORE_LIMIT,
  HIGH_SCORES_STORAGE_KEY,
  isHighScore,
  loadHighScores,
  normalizeHighScoreName,
  saveHighScore,
  StorageLike,
} from './HighScores';

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function entry(name: string, score: number, timestamp: number) {
  return { name, score, timestamp };
}

describe('HighScores', () => {
  it('falls back to an empty leaderboard for missing or malformed storage', () => {
    const storage = new MemoryStorage();
    expect(loadHighScores(storage)).toEqual([]);

    storage.setItem(HIGH_SCORES_STORAGE_KEY, '{bad json');
    expect(loadHighScores(storage)).toEqual([]);

    storage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify({ score: 100 }));
    expect(loadHighScores(storage)).toEqual([]);
  });

  it('normalizes names for display and storage', () => {
    expect(normalizeHighScoreName('  ace-1  ')).toBe('ACE1');
    expect(normalizeHighScoreName('')).toBe('PILOT');
    expect(normalizeHighScoreName('long pilot name')).toBe('LONG PIL');
  });

  it('qualifies scores while the table has fewer than ten entries', () => {
    const storage = new MemoryStorage();
    for (let i = 0; i < HIGH_SCORE_LIMIT - 1; i++) {
      saveHighScore(entry(`P${i}`, i, i), storage);
    }

    expect(isHighScore(0, storage)).toBe(true);
  });

  it('qualifies scores that beat or tie the final top-ten entry', () => {
    const storage = new MemoryStorage();
    for (let i = 0; i < HIGH_SCORE_LIMIT; i++) {
      saveHighScore(entry(`P${i}`, 100 - i, i), storage);
    }

    expect(isHighScore(91, storage)).toBe(true);
    expect(isHighScore(90, storage)).toBe(false);
  });

  it('sorts by score descending, breaks ties by newest first, and trims to ten', () => {
    const storage = new MemoryStorage();
    for (let i = 0; i < HIGH_SCORE_LIMIT; i++) {
      saveHighScore(entry(`P${i}`, 100 - i, i), storage);
    }
    const scores = saveHighScore(entry('NEW', 95, 99), storage);

    expect(scores).toHaveLength(HIGH_SCORE_LIMIT);
    expect(scores.map((score) => score.score)).toEqual([100, 99, 98, 97, 96, 95, 95, 94, 93, 92]);
    expect(scores[5].name).toBe('NEW');
  });

  it('clears stored high scores', () => {
    const storage = new MemoryStorage();
    saveHighScore(entry('ACE', 200, 1), storage);
    clearHighScores(storage);

    expect(loadHighScores(storage)).toEqual([]);
  });
});
