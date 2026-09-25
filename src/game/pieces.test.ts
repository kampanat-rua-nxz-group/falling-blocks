import { describe, expect, it } from 'vitest';
import { cellsFor, kickOffsets } from './pieces';
import type { PieceKind } from './types';

const kinds: PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

describe('pieces', () => {
  it.each(kinds)('%s has four unique cells in every orientation', kind => {
    for (const rotation of [0, 1, 2, 3] as const) {
      const cells = cellsFor({ kind, rotation, x: 0, y: 0 });
      expect(cells).toHaveLength(4);
      expect(new Set(cells.map(({ x, y }) => `${x},${y}`)).size).toBe(4);
    }
  });
  it('keeps O in the same cells when rotated', () => {
    expect(cellsFor({ kind: 'O', rotation: 1, x: 0, y: 0 }))
      .toEqual(cellsFor({ kind: 'O', rotation: 0, x: 0, y: 0 }));
  });
  it('offers ordered lateral and upward kicks', () => {
    expect(kickOffsets('T').slice(0, 3)).toEqual([{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }]);
    expect(kickOffsets('I').at(-1)).toEqual({ x: 0, y: -2 });
  });
});
