export interface GameSettings {
  screenShake: boolean;
  reducedMotion: boolean;
  exhaustParticles: boolean;
}

export type SettingKey = keyof GameSettings;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SETTINGS_STORAGE_KEY = 'lunar-drift-settings';

export const DEFAULT_SETTINGS: GameSettings = {
  screenShake: true,
  reducedMotion: false,
  exhaustParticles: true,
};

export function loadSettings(storage = browserStorage()): GameSettings {
  if (!storage) return { ...DEFAULT_SETTINGS };

  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return normalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings, storage = browserStorage()): void {
  if (!storage) return;
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
}

export function updateSetting(
  settings: GameSettings,
  key: SettingKey,
  value: boolean,
): GameSettings {
  return { ...settings, [key]: value };
}

function normalizeSettings(input: Partial<GameSettings>): GameSettings {
  return {
    screenShake: typeof input.screenShake === 'boolean' ? input.screenShake : DEFAULT_SETTINGS.screenShake,
    reducedMotion:
      typeof input.reducedMotion === 'boolean' ? input.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    exhaustParticles:
      typeof input.exhaustParticles === 'boolean'
        ? input.exhaustParticles
        : DEFAULT_SETTINGS.exhaustParticles,
  };
}

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}
