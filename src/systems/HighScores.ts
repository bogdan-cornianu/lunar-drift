import {
  DEFAULT_DIFFICULTY,
  DifficultyLevel,
  DIFFICULTY_LEVELS,
} from './Difficulty';

export interface HighScoreEntry {
  name: string;
  score: number;
  timestamp: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const HIGH_SCORES_STORAGE_KEY = 'lunar-drift-high-scores';
export const HIGH_SCORE_LIMIT = 10;
export const HIGH_SCORE_NAME_MAX_LENGTH = 8;

type HighScoreTables = Partial<Record<DifficultyLevel, HighScoreEntry[]>>;

export function loadHighScores(
  difficulty: DifficultyLevel = DEFAULT_DIFFICULTY,
  storage = browserStorage(),
): HighScoreEntry[] {
  if (!storage) return [];

  try {
    const raw = storage.getItem(HIGH_SCORES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return difficulty === 'normal' ? rankHighScores(parsed.filter(isHighScoreEntry)) : [];
    }
    return rankHighScores(readTables(parsed)[difficulty] ?? []);
  } catch {
    return [];
  }
}

export function isHighScore(
  score: number,
  difficulty: DifficultyLevel = DEFAULT_DIFFICULTY,
  storage = browserStorage(),
): boolean {
  const scores = loadHighScores(difficulty, storage);
  if (scores.length < HIGH_SCORE_LIMIT) return true;
  return score >= scores[scores.length - 1].score;
}

export function saveHighScore(
  entry: HighScoreEntry,
  difficulty: DifficultyLevel = DEFAULT_DIFFICULTY,
  storage = browserStorage(),
): HighScoreEntry[] {
  const tables = loadHighScoreTables(storage);
  const scores = rankHighScores([...(tables[difficulty] ?? []), normalizeEntry(entry)]);
  tables[difficulty] = scores;
  if (storage) storage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify(tables));
  return scores;
}

export function clearHighScores(
  difficulty: DifficultyLevel = DEFAULT_DIFFICULTY,
  storage = browserStorage(),
): void {
  if (!storage) return;
  const tables = loadHighScoreTables(storage);
  delete tables[difficulty];
  if (hasAnyScores(tables)) {
    storage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify(tables));
    return;
  }
  storage.removeItem(HIGH_SCORES_STORAGE_KEY);
}

export function normalizeHighScoreName(name: string): string {
  const normalized = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, HIGH_SCORE_NAME_MAX_LENGTH);
  return normalized || 'PILOT';
}

function rankHighScores(scores: HighScoreEntry[]): HighScoreEntry[] {
  return scores
    .map(normalizeEntry)
    .sort((a, b) => b.score - a.score || b.timestamp - a.timestamp)
    .slice(0, HIGH_SCORE_LIMIT);
}

function loadHighScoreTables(storage: StorageLike | undefined): HighScoreTables {
  if (!storage) return {};

  try {
    const raw = storage.getItem(HIGH_SCORES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { normal: rankHighScores(parsed.filter(isHighScoreEntry)) };
    }
    return readTables(parsed);
  } catch {
    return {};
  }
}

function readTables(value: unknown): HighScoreTables {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const input = value as Partial<Record<DifficultyLevel, unknown>>;
  const tables: HighScoreTables = {};
  for (const difficulty of DIFFICULTY_LEVELS) {
    const scores = input[difficulty];
    if (Array.isArray(scores)) {
      tables[difficulty] = rankHighScores(scores.filter(isHighScoreEntry));
    }
  }
  return tables;
}

function hasAnyScores(tables: HighScoreTables): boolean {
  return DIFFICULTY_LEVELS.some((difficulty) => (tables[difficulty]?.length ?? 0) > 0);
}

function normalizeEntry(entry: HighScoreEntry): HighScoreEntry {
  return {
    name: normalizeHighScoreName(entry.name),
    score: Math.max(0, Math.floor(entry.score)),
    timestamp: Math.max(0, Math.floor(entry.timestamp)),
  };
}

function isHighScoreEntry(value: unknown): value is HighScoreEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<HighScoreEntry>;
  return (
    typeof entry.name === 'string' &&
    typeof entry.score === 'number' &&
    Number.isFinite(entry.score) &&
    typeof entry.timestamp === 'number' &&
    Number.isFinite(entry.timestamp)
  );
}

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}
