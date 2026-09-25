export const BEST_SCORE_KEY = 'falling-blocks.best-score.v1';

export function createBestScoreStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null) {
  let best = 0;
  try {
    const saved = storage?.getItem(BEST_SCORE_KEY);
    const parsed = saved === null || saved === undefined ? 0 : Number(saved);
    if (Number.isSafeInteger(parsed) && parsed >= 0) best = parsed;
  } catch {
    best = 0;
  }
  return {
    get: () => best,
    consider(score: number): number {
      if (!Number.isSafeInteger(score) || score <= best) return best;
      best = score;
      try { storage?.setItem(BEST_SCORE_KEY, String(best)); } catch { /* keep memory value */ }
      return best;
    },
  };
}

export function browserStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}
