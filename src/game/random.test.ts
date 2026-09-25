import { describe, expect, it } from 'vitest';
import { refillQueue } from './random';
import type { PieceKind } from './types';

const kinds: PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

describe('seven-bag queue', () => {
  it('is deterministic and contains all seven before repeating', () => {
    const first = refillQueue([], 12345, 14);
    expect(first).toEqual(refillQueue([], 12345, 14));
    expect(new Set(first.queue.slice(0, 7))).toEqual(new Set(kinds));
    expect(new Set(first.queue.slice(7, 14))).toEqual(new Set(kinds));
  });
  it('handles a zero seed and preserves queued pieces', () => {
    const result = refillQueue(['T'], 0, 8);
    expect(result.queue[0]).toBe('T');
    expect(result.queue).toHaveLength(8);
  });
});
