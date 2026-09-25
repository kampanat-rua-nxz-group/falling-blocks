import { expect, it } from 'vitest';
import { emptyBoard } from '../game/board';
import { describeBoard } from './boardDescription';
import type { Board } from '../game/types';

it('describes only occupied rows from top to bottom', () => {
  const board: Board = emptyBoard().map((row, y) => y === 0 ? row.map((cell, x) => x === 0 || x === 9 ? 'I' : cell)
    : y === 1 ? row.map((cell, x) => x === 3 ? 'T' : cell) : row);
  expect(describeBoard(board)).toBe('Row 1: columns 1 and 10 occupied; Row 2: column 4 occupied');
});

it('describes an empty board', () => {
  expect(describeBoard(emptyBoard())).toBe('Board empty');
});
