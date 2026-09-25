// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { emptyBoard } from '../game/board';
import { createGame, dispatch } from '../game/game';
import { createView } from './view';
import type { Board } from '../game/types';

it('renders a ready board and changes to the playing view', () => {
  document.body.innerHTML = '<main id="app"></main>';
  const view = createView(document.querySelector('#app')!);
  const ready = createGame(1);
  view.render(ready, 42);
  expect(document.querySelectorAll('#board .cell')).toHaveLength(200);
  expect(document.querySelectorAll('#next-preview .mini-piece')).toHaveLength(5);
  expect(document.querySelectorAll('#next-preview [role="img"]')).toHaveLength(5);
  expect(document.querySelector('#best')?.textContent).toBe('42');
  expect(document.querySelector('#score')?.textContent).toBe('0');
  expect(document.querySelector('#level')?.textContent).toBe('1');
  expect(document.querySelector('#start-overlay')?.hasAttribute('hidden')).toBe(false);
  view.render(dispatch(ready, { type: 'start' }), 42);
  expect(document.querySelector('#start-overlay')?.hasAttribute('hidden')).toBe(true);
  view.announce('Level 2');
  expect(document.querySelector('#live-status')?.textContent).toBe('Level 2');
});

it('keeps settled blocks visible above ghost cells and switches overlays', () => {
  document.body.innerHTML = '<main id="app"></main>';
  const view = createView(document.querySelector('#app')!);
  const base = dispatch(createGame(2), { type: 'start' });
  const board: Board = emptyBoard().map((row, y) => y === 19 ? row.map((cell, x) => x === 4 ? 'J' : cell) : row);
  view.render({ ...base, board, active: { kind: 'O', rotation: 0, x: 3, y: 0 } }, 3);
  const occupied = document.querySelectorAll('#board .cell')[194];
  expect(occupied?.classList.contains('cell--J')).toBe(true);
  expect(occupied?.classList.contains('cell--ghost')).toBe(false);
  expect(document.querySelector('#board-description')?.textContent).toContain('Row 20: column 5 occupied');
  view.render({ ...base, status: 'paused' }, 3);
  expect(document.querySelector('#pause-overlay')?.hasAttribute('hidden')).toBe(false);
  view.render({ ...base, status: 'gameover' }, 3);
  expect(document.querySelector('#gameover-overlay')?.hasAttribute('hidden')).toBe(false);
});
