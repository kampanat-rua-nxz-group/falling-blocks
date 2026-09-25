import { expect, it } from 'vitest';
import { advance, createGame, dispatch, gravityInterval } from './game';
import { emptyBoard } from './board';
import type { Board, GameState } from './types';

it('starts with five previews and restarts from a fresh seed', () => {
  const ready = createGame(7);
  expect(ready.status).toBe('ready');
  expect(ready.queue.length).toBeGreaterThanOrEqual(5);
  expect(dispatch(ready, { type: 'start' }).status).toBe('playing');
  const restarted = dispatch(dispatch(ready, { type: 'start' }), { type: 'restart', seed: 7 });
  expect(restarted).toEqual({ ...ready, status: 'playing' });
});

it('awards manual drop rows and does not score a blocked soft drop', () => {
  const base = dispatch(createGame(2), { type: 'start' });
  const state = { ...base, active: { kind: 'O' as const, rotation: 0 as const, x: 3, y: 17 } };
  expect(dispatch(state, { type: 'softDrop' }).score).toBe(1);
  expect(dispatch({ ...state, active: { ...state.active, y: 18 } }, { type: 'softDrop' }).score).toBe(0);
});

it('uses the level before a four-line clear for scoring', () => {
  const base = dispatch(createGame(7), { type: 'start' });
  const board: Board = emptyBoard().map((row, y) => y >= 16 ? row.map((_, x) => x === 4 ? null : 'J' as const) : row);
  const ready: GameState = { ...base, board, lines: 9, level: 1,
    active: { kind: 'I', rotation: 1, x: 2, y: 15 } };
  const result = dispatch(ready, { type: 'hardDrop' });
  expect(result.lines).toBe(13);
  expect(result.level).toBe(2);
  expect(result.score).toBe(802);
});

it('allows one hold per piece and restores it after locking', () => {
  const base = dispatch(createGame(5), { type: 'start' });
  const held = dispatch(base, { type: 'hold' });
  expect(held.held).toBe(base.active.kind);
  expect(held.holdUsed).toBe(true);
  expect(dispatch(held, { type: 'hold' })).toEqual(held);
  const locked = dispatch(held, { type: 'hardDrop' });
  expect(locked.holdUsed).toBe(false);
  expect(dispatch(locked, { type: 'hold' }).active.kind).toBe(base.active.kind);
});

it('does not advance a paused game', () => {
  const paused = dispatch(dispatch(createGame(4), { type: 'start' }), { type: 'pause' });
  expect(advance(paused, 10_000)).toEqual(paused);
  expect(dispatch(paused, { type: 'resume' }).status).toBe('playing');
});

it('locks a grounded piece after 500 ms', () => {
  const base = dispatch(createGame(9), { type: 'start' });
  const grounded: GameState = { ...base, active: { kind: 'O', rotation: 0, x: 3, y: 18 } };
  const at400 = Array.from({ length: 4 }).reduce<GameState>(state => advance(state, 100), grounded);
  expect(at400.active).toEqual(grounded.active);
  expect(advance(at400, 100).active).not.toEqual(grounded.active);
});

it('stops resetting lock delay after fifteen grounded moves', () => {
  const base = dispatch(createGame(9), { type: 'start' });
  let state: GameState = { ...base, active: { kind: 'O', rotation: 0, x: 3, y: 18 } };
  for (let i = 0; i < 15; i++) {
    state = advance(state, 100);
    state = dispatch(state, { type: i % 2 ? 'left' : 'right' });
  }
  expect(state.lockResets).toBe(15);
  const elapsed = advance(state, 100);
  expect(dispatch(elapsed, { type: 'left' }).lockMs).toBe(100);
});

it('counts leaving a ledge as a lock reset and locks after the fifteenth reset', () => {
  const base = dispatch(createGame(9), { type: 'start' });
  const board: Board = emptyBoard().map((row, y) => y === 18 ? row.map((cell, x) => x === 4 ? 'J' : cell) : row);
  let state: GameState = { ...base, board, active: { kind: 'O', rotation: 0, x: 3, y: 16 } };
  for (let i = 0; i < 15; i++) {
    for (let tick = 0; tick < 4; tick++) state = advance(state, 100);
    state = dispatch(state, { type: 'right' });
    state = dispatch(state, { type: 'left' });
  }
  expect(state.lockResets).toBe(15);
  for (let tick = 0; tick < 4; tick++) state = advance(state, 100);
  state = dispatch(dispatch(state, { type: 'right' }), { type: 'left' });
  expect(advance(state, 100).active).not.toEqual(state.active);
});

it('does not erase exhausted lock time during soft drop or gravity', () => {
  const base = dispatch(createGame(9), { type: 'start' });
  const board: Board = emptyBoard().map((row, y) => y === 18 ? row.map((cell, x) => x === 4 ? 'J' : cell) : row);
  const grounded: GameState = { ...base, board, active: { kind: 'O', rotation: 0, x: 3, y: 16 }, lockMs: 400, lockResets: 15 };
  const airborne = dispatch(grounded, { type: 'right' });
  expect(airborne.lockMs).toBe(400);
  expect(dispatch(airborne, { type: 'softDrop' }).lockMs).toBe(400);
  expect(advance({ ...airborne, gravityMs: 950 }, 100).lockMs).toBe(400);
});

it('ends if a locked piece still has a cell above the board', () => {
  const base = dispatch(createGame(3), { type: 'start' });
  const board: Board = emptyBoard().map((row, y) => y === 1 ? row.map(() => 'J' as const) : row);
  const state: GameState = { ...base, board, active: { kind: 'T', rotation: 0, x: 3, y: -1 } };
  expect(dispatch(state, { type: 'hardDrop' }).status).toBe('gameover');
});

it('ends when the next piece cannot spawn', () => {
  const base = dispatch(createGame(3), { type: 'start' });
  const board: Board = emptyBoard().map((row, y) => y === 0 ? row.map((cell, x) => x >= 3 && x <= 6 ? 'J' as const : cell) : row);
  const state: GameState = { ...base, board, active: { kind: 'O', rotation: 0, x: 3, y: 17 } };
  expect(dispatch(state, { type: 'hardDrop' }).status).toBe('gameover');
});

it('caps gravity and clamps a large elapsed step', () => {
  expect(gravityInterval(1)).toBe(1000);
  expect(gravityInterval(100)).toBe(80);
  const state = dispatch(createGame(1), { type: 'start' });
  expect(advance(state, 10_000).gravityMs).toBe(100);
});
