// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { bindKeyboard } from './keyboard';
import type { Action } from '../game/types';

it('maps every game key and prevents browser defaults', () => {
  const actions: Action[] = [];
  const unbind = bindKeyboard(window, action => actions.push(action));
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'X', 'z', ' ', 'C', 'p', 'Escape']) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  }
  expect(actions.map(action => action.type)).toEqual([
    'left', 'right', 'softDrop', 'rotateCW', 'rotateCW', 'rotateCCW', 'hardDrop', 'hold', 'pause', 'pause',
  ]);
  unbind();
});

it('leaves modified shortcuts, input editing, and focused button activation alone', () => {
  document.body.innerHTML = '<input><button>Start</button>';
  const actions: Action[] = [];
  const unbind = bindKeyboard(window, action => actions.push(action));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, cancelable: true }));
  const input = document.querySelector('input')!;
  input.focus();
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true }));
  const button = document.querySelector('button')!;
  button.focus();
  const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  button.dispatchEvent(space);
  expect(space.defaultPrevented).toBe(false);
  expect(actions).toEqual([]);
  unbind();
});
