// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { BEST_SCORE_KEY, browserStorage, createBestScoreStore } from './bestScore';

afterEach(() => vi.restoreAllMocks());

it('reads a valid saved score and stores a new best', () => {
  const saved: string[] = [];
  const store = createBestScoreStore({ getItem: key => key === BEST_SCORE_KEY ? '12' : null, setItem: (_key, value) => { saved.push(value); } });
  expect(store.get()).toBe(12);
  expect(store.consider(10)).toBe(12);
  expect(store.consider(20)).toBe(20);
  expect(saved).toEqual(['20']);
});

it.each(['-42', 'NaN', 'Infinity', '12.5', 'garbage'])('rejects invalid saved score %s', value => {
  expect(createBestScoreStore({ getItem: () => value, setItem: () => undefined }).get()).toBe(0);
});

it('keeps the best in memory when writing fails', () => {
  const store = createBestScoreStore({ getItem: () => '12', setItem: () => { throw Error('quota'); } });
  expect(store.consider(20)).toBe(20);
  expect(store.get()).toBe(20);
  expect(store.consider(10)).toBe(20);
});

it('recovers when reading fails and ignores invalid input', () => {
  const store = createBestScoreStore({ getItem: () => { throw Error('blocked'); }, setItem: () => undefined });
  expect(store.get()).toBe(0);
  expect(store.consider(Number.NaN)).toBe(0);
  expect(store.consider(-1)).toBe(0);
});

it('returns null if accessing browser storage throws', () => {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw Error('blocked'); });
  expect(browserStorage()).toBeNull();
});
