import { describe, expect, it } from 'vitest';
import { DEFAULT_DIFFICULTY, DifficultyLevel } from './Difficulty';
import {
  DEFAULT_SETTINGS,
  GameSettings,
  loadSettings,
  saveSettings,
  SETTINGS_STORAGE_KEY,
  StorageLike,
  updateSetting,
} from './Settings';

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('settings storage', () => {
  it('loads defaults when storage is empty', () => {
    expect(loadSettings(new MemoryStorage())).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults when stored JSON is invalid', () => {
    const storage = new MemoryStorage();
    storage.setItem(SETTINGS_STORAGE_KEY, '{broken');

    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it('normalizes partial stored settings', () => {
    const storage = new MemoryStorage();
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ screenShake: false }));

    expect(loadSettings(storage)).toEqual({
      ...DEFAULT_SETTINGS,
      screenShake: false,
    });
  });

  it('saves and loads settings', () => {
    const storage = new MemoryStorage();
    const settings: GameSettings = {
      difficulty: 'hard',
      screenShake: false,
      reducedMotion: true,
      exhaustParticles: false,
    };

    saveSettings(settings, storage);

    expect(loadSettings(storage)).toEqual(settings);
  });

  it('updates one setting without mutating the source object', () => {
    const next = updateSetting(DEFAULT_SETTINGS, 'reducedMotion', true);

    expect(next.reducedMotion).toBe(true);
    expect(DEFAULT_SETTINGS.reducedMotion).toBe(false);
  });

  it('defaults difficulty to normal for old saved settings', () => {
    const storage = new MemoryStorage();
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ screenShake: false }));

    expect(loadSettings(storage).difficulty).toBe(DEFAULT_DIFFICULTY);
  });

  it('normalizes invalid difficulty values', () => {
    const storage = new MemoryStorage();
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ difficulty: 'nightmare' }));

    expect(loadSettings(storage).difficulty).toBe(DEFAULT_DIFFICULTY);
  });

  it('updates difficulty without mutating the source object', () => {
    const next = updateSetting(DEFAULT_SETTINGS, 'difficulty', 'easy' satisfies DifficultyLevel);

    expect(next.difficulty).toBe('easy');
    expect(DEFAULT_SETTINGS.difficulty).toBe('normal');
  });
});
