import { canPlace, emptyBoard, landingY, lockAndClear, tryMove, tryRotate } from './board';
import { refillQueue } from './random';
import type { Action, ActivePiece, GameState, PieceKind } from './types';

const linePoints = [0, 100, 300, 500, 800] as const;

export function gravityInterval(level: number): number {
  return Math.max(80, 1000 * 0.82 ** (Math.max(1, level) - 1));
}

function spawn(kind: PieceKind): ActivePiece {
  return { kind, rotation: 0, x: 3, y: -1 };
}

function draw(queue: readonly PieceKind[], seed: number) {
  const filled = refillQueue(queue, seed, 6);
  return { active: spawn(filled.queue[0]!), queue: filled.queue.slice(1), seed: filled.seed };
}

export function createGame(seed: number): GameState {
  const next = draw([], seed);
  return {
    board: emptyBoard(), ...next, held: null, holdUsed: false,
    score: 0, lines: 0, level: 1, status: 'ready',
    gravityMs: 0, lockMs: 0, lockResets: 0,
  };
}

function lock(state: GameState, active = state.active): GameState {
  const result = lockAndClear(state.board, active);
  const lines = state.lines + result.linesCleared;
  const next = draw(state.queue, state.seed);
  const score = state.score + (linePoints[result.linesCleared] ?? 0) * state.level;
  return {
    ...state, ...next, board: result.board, score, lines,
    level: 1 + Math.floor(lines / 10), holdUsed: false,
    gravityMs: 0, lockMs: 0, lockResets: 0,
    status: result.aboveTop || !canPlace(result.board, next.active) ? 'gameover' : 'playing',
  };
}

function moveActive(state: GameState, active: ActivePiece | null): GameState {
  if (!active) return state;
  const wasGrounded = !tryMove(state.board, state.active, 0, 1);
  if (wasGrounded && state.lockResets < 15) {
    return { ...state, active, lockMs: 0, lockResets: state.lockResets + 1 };
  }
  return { ...state, active };
}

export function dispatch(state: GameState, action: Action): GameState {
  if (action.type === 'restart') return { ...createGame(action.seed), status: 'playing' };
  if (action.type === 'start') return state.status === 'ready' ? { ...state, status: 'playing' } : state;
  if (action.type === 'pause') return state.status === 'playing' ? { ...state, status: 'paused' } : state;
  if (action.type === 'resume') return state.status === 'paused' ? { ...state, status: 'playing' } : state;
  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'left': return moveActive(state, tryMove(state.board, state.active, -1, 0));
    case 'right': return moveActive(state, tryMove(state.board, state.active, 1, 0));
    case 'rotateCW': return moveActive(state, tryRotate(state.board, state.active, 1));
    case 'rotateCCW': return moveActive(state, tryRotate(state.board, state.active, -1));
    case 'softDrop': {
      const active = tryMove(state.board, state.active, 0, 1);
      return active ? { ...state, active, score: state.score + 1, gravityMs: 0 } : state;
    }
    case 'hardDrop': {
      const y = landingY(state.board, state.active);
      return lock({ ...state, score: state.score + 2 * (y - state.active.y) }, { ...state.active, y });
    }
    case 'hold': {
      if (state.holdUsed) return state;
      const next = state.held === null ? draw(state.queue, state.seed) : {
        active: spawn(state.held), queue: state.queue, seed: state.seed,
      };
      return {
        ...state, ...next, held: state.active.kind, holdUsed: true,
        gravityMs: 0, lockMs: 0, lockResets: 0,
        status: canPlace(state.board, next.active) ? 'playing' : 'gameover',
      };
    }
  }
}

export function advance(state: GameState, elapsedMs: number): GameState {
  if (state.status !== 'playing') return state;
  let remaining = Math.max(0, Math.min(100, Number.isFinite(elapsedMs) ? elapsedMs : 0));
  let current = state;
  while (remaining > 0) {
    if (!tryMove(current.board, current.active, 0, 1)) {
      const step = Math.min(remaining, 500 - current.lockMs);
      remaining -= step;
      current = { ...current, lockMs: current.lockMs + step };
      if (current.lockMs >= 500) return lock(current);
    } else {
      const interval = gravityInterval(current.level);
      const step = Math.min(remaining, interval - current.gravityMs);
      remaining -= step;
      const gravityMs = current.gravityMs + step;
      if (gravityMs >= interval) {
        current = { ...current, active: tryMove(current.board, current.active, 0, 1)!, gravityMs: 0 };
      } else {
        current = { ...current, gravityMs };
      }
    }
  }
  return current;
}
