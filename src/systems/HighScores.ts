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

export function loadHighScores(storage = browserStorage()): HighScoreEntry[] {
  if (!storage) return [];

  try {
    const raw = storage.getItem(HIGH_SCORES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return rankHighScores(parsed.filter(isHighScoreEntry));
  } catch {
    return [];
  }
}

export function isHighScore(score: number, storage = browserStorage()): boolean {
  const scores = loadHighScores(storage);
  if (scores.length < HIGH_SCORE_LIMIT) return true;
  return score >= scores[scores.length - 1].score;
}

export function saveHighScore(
  entry: HighScoreEntry,
  storage = browserStorage(),
): HighScoreEntry[] {
  const scores = rankHighScores([...loadHighScores(storage), normalizeEntry(entry)]);
  if (storage) storage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify(scores));
  return scores;
}

export function clearHighScores(storage = browserStorage()): void {
  storage?.removeItem(HIGH_SCORES_STORAGE_KEY);
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
