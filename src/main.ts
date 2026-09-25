import './styles.css';
import { advance, createGame, dispatch } from './game/game';
import type { Action, GameState } from './game/types';
import { browserStorage, createBestScoreStore } from './storage/bestScore';
import { createGestureInterpreter } from './ui/gestures';
import { bindKeyboard } from './ui/keyboard';
import { createView } from './ui/view';

export type FrameClock = {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
  now(): number;
};

const browserClock: FrameClock = {
  request: callback => requestAnimationFrame(callback),
  cancel: id => cancelAnimationFrame(id),
  now: () => performance.now(),
};

function newSeed(clock: FrameClock): number {
  try {
    if (typeof globalThis.crypto !== 'undefined') return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
  } catch { /* use time below */ }
  return Math.floor(clock.now() + Date.now()) >>> 0;
}

export function createApp(doc: Document, clock: FrameClock) {
  const root = doc.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('Missing #app');
  const view = createView(root);
  const best = createBestScoreStore(browserStorage());
  let state = createGame(newSeed(clock));
  let lastFrameTime: number | null = null;
  let frameId = 0;
  const cleanups: Array<() => void> = [];

  function update(next: GameState) {
    const previous = state;
    state = next;
    const bestScore = best.consider(state.score);
    view.render(state, bestScore);
    if (state.status === 'gameover' && previous.status !== 'gameover') view.announce(`Game over. Score ${state.score}.`);
    else if (state.status === 'paused' && previous.status !== 'paused') view.announce('Paused');
    else if (state.status === 'playing' && previous.status === 'paused') view.announce('Resumed');
    else if (state.level > previous.level) view.announce(`Level ${state.level}`);
    else if (state.lines > previous.lines) {
      const cleared = state.lines - previous.lines;
      view.announce(`${cleared} line${cleared === 1 ? '' : 's'} cleared`);
    }
  }

  function send(action: Action) {
    const effective: Action = action.type === 'pause' && state.status === 'paused' ? { type: 'resume' } : action;
    if (['pause', 'resume', 'start', 'restart'].includes(effective.type)) lastFrameTime = null;
    update(dispatch(state, effective));
  }

  function bindButton(id: string, action: () => Action) {
    const button = root!.querySelector<HTMLButtonElement>(id)!;
    const onClick = () => send(action());
    button.addEventListener('click', onClick);
    cleanups.push(() => button.removeEventListener('click', onClick));
  }
  bindButton('#start-button', () => ({ type: 'start' }));
  bindButton('#pause-button', () => ({ type: 'pause' }));
  bindButton('#resume-button', () => ({ type: 'resume' }));
  bindButton('#restart-button', () => ({ type: 'restart', seed: newSeed(clock) }));
  bindButton('#hold-button', () => ({ type: 'hold' }));
  bindButton('#rotate-left-button', () => ({ type: 'rotateCCW' }));

  const target = doc.defaultView;
  if (!target) throw new Error('Missing window');
  cleanups.push(bindKeyboard(target, send));
  const gesture = createGestureInterpreter(send);
  const board = root.querySelector<HTMLElement>('#board')!;
  const onPointerDown = (event: PointerEvent) => {
    if (state.status !== 'playing') return;
    gesture.start(event.pointerId, event.clientX, event.clientY, event.timeStamp);
    board.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => gesture.move(event.pointerId, event.clientX, event.clientY, event.timeStamp);
  const onPointerUp = (event: PointerEvent) => gesture.end(event.pointerId, event.clientX, event.clientY, event.timeStamp);
  const onPointerCancel = () => gesture.cancel();
  board.addEventListener('pointerdown', onPointerDown);
  board.addEventListener('pointermove', onPointerMove);
  board.addEventListener('pointerup', onPointerUp);
  board.addEventListener('pointercancel', onPointerCancel);
  cleanups.push(() => {
    board.removeEventListener('pointerdown', onPointerDown);
    board.removeEventListener('pointermove', onPointerMove);
    board.removeEventListener('pointerup', onPointerUp);
    board.removeEventListener('pointercancel', onPointerCancel);
  });

  const onVisibilityChange = () => {
    if (doc.hidden) {
      if (state.status === 'playing') send({ type: 'pause' });
      lastFrameTime = null;
      gesture.cancel();
    }
  };
  doc.addEventListener('visibilitychange', onVisibilityChange);
  cleanups.push(() => doc.removeEventListener('visibilitychange', onVisibilityChange));

  const onFrame: FrameRequestCallback = time => {
    if (lastFrameTime !== null) update(advance(state, time - lastFrameTime));
    lastFrameTime = time;
    frameId = clock.request(onFrame);
  };
  view.render(state, best.get());
  frameId = clock.request(onFrame);
  return {
    getState: () => state,
    send,
    destroy() { clock.cancel(frameId); cleanups.forEach(cleanup => cleanup()); },
  };
}

if (typeof document !== 'undefined' && document.querySelector('#app')) createApp(document, browserClock);
