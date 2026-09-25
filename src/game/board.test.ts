import { expect, it } from 'vitest';
import { canPlace, emptyBoard, landingY, lockAndClear, tryMove, tryRotate } from './board';
import { cellsFor } from './pieces';
import type { Board } from './types';

it('rejects walls and floor but permits hidden cells', () => {
  const board = emptyBoard();
  expect(canPlace(board, { kind: 'T', rotation: 0, x: 3, y: -1 })).toBe(true);
  expect(canPlace(board, { kind: 'O', rotation: 0, x: -2, y: 0 })).toBe(false);
  expect(canPlace(board, { kind: 'O', rotation: 0, x: 8, y: 0 })).toBe(false);
  expect(canPlace(board, { kind: 'O', rotation: 0, x: 3, y: 19 })).toBe(false);
});

it('blocks a visible spawn overlap', () => {
  const board = emptyBoard().map((row, y) => y === 0 ? row.map((cell, x) => x === 3 ? 'J' : cell) : row) as Board;
  expect(canPlace(board, { kind: 'T', rotation: 0, x: 3, y: -1 })).toBe(false);
});

it('moves only to legal cells and preserves the source piece', () => {
  const board = emptyBoard();
  const piece = { kind: 'O' as const, rotation: 0 as const, x: 0, y: 18 };
  expect(tryMove(board, piece, -2, 0)).toBeNull();
  expect(tryMove(board, piece, 0, 1)).toBeNull();
  expect(tryMove(board, piece, 1, 0)?.x).toBe(1);
  expect(piece.x).toBe(0);
});

it('kicks away from the right wall', () => {
  const board = emptyBoard();
  const rotated = tryRotate(board, { kind: 'I', rotation: 1, x: 7, y: 2 }, 1);
  expect(rotated?.x).toBe(6);
  expect(canPlace(board, rotated!)).toBe(true);
});

it('refuses a rotation when every kick is blocked', () => {
  const piece = { kind: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
  const activeCells = new Set(cellsFor(piece).map(({ x, y }) => `${x},${y}`));
  const packed: Board = emptyBoard().map((row, y) => row.map((_, x) => activeCells.has(`${x},${y}`) ? null : 'J' as const));
  expect(canPlace(packed, piece)).toBe(true);
  expect(tryRotate(packed, piece, 1)).toBeNull();
});

it('projects a ghost to the last legal row', () => {
  expect(landingY(emptyBoard(), { kind: 'O', rotation: 0, x: 3, y: -1 })).toBe(18);
});

it('clears four rows together without mutating the original board', () => {
  const source: Board = emptyBoard().map((row, y) => y >= 16 ? row.map((_, x) => x === 4 ? null : 'J') : row);
  const result = lockAndClear(source, { kind: 'I', rotation: 1, x: 2, y: 16 });
  expect(result.linesCleared).toBe(4);
  expect(result.board.every(row => row.every(cell => cell === null))).toBe(true);
  expect(source[19]?.[0]).toBe('J');
});

it('reports above-top locks', () => {
  expect(lockAndClear(emptyBoard(), { kind: 'T', rotation: 0, x: 3, y: -1 }).aboveTop).toBe(true);
});
