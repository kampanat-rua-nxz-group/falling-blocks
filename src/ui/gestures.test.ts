import { expect, it } from 'vitest';
import { createGestureInterpreter } from './gestures';
import type { Action } from '../game/types';

it('flicks down into one hard drop after soft-drop steps', () => {
  const actions: Action[] = [];
  const gesture = createGestureInterpreter(action => actions.push(action));
  gesture.start(1, 100, 100, 0);
  gesture.move(1, 100, 172, 100);
  gesture.end(1, 100, 180, 130);
  expect(actions.filter(action => action.type === 'softDrop')).toHaveLength(3);
  expect(actions.filter(action => action.type === 'hardDrop')).toHaveLength(1);
});

it('steps horizontally and taps to rotate', () => {
  const actions: Action[] = [];
  const gesture = createGestureInterpreter(action => actions.push(action));
  gesture.start(1, 0, 0, 0);
  gesture.move(1, 50, 2, 50);
  gesture.end(1, 50, 2, 60);
  gesture.start(2, 10, 10, 100);
  gesture.end(2, 14, 14, 180);
  expect(actions.map(action => action.type)).toEqual(['right', 'right', 'rotateCW']);
});

it('cancels a gesture when a second pointer appears', () => {
  const actions: Action[] = [];
  const gesture = createGestureInterpreter(action => actions.push(action));
  gesture.start(1, 0, 0, 0);
  gesture.start(2, 0, 0, 0);
  gesture.end(1, 0, 100, 100);
  expect(actions).toEqual([]);
});
