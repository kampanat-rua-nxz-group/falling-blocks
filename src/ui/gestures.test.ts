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

it('does not rotate when a drag returns to its starting point', () => {
  const actions: Action[] = [];
  const gesture = createGestureInterpreter(action => actions.push(action));
  gesture.start(1, 0, 0, 0);
  gesture.move(1, 48, 0, 40);
  gesture.move(1, 0, 0, 80);
  gesture.end(1, 0, 0, 100);
  expect(actions.map(action => action.type)).toEqual(['right', 'right', 'left', 'left']);
});

it('does not count a twelve-pixel excursion as a tap after returning', () => {
  const actions: Action[] = [];
  const gesture = createGestureInterpreter(action => actions.push(action));
  gesture.start(1, 0, 0, 0);
  gesture.move(1, 12, 0, 40);
  gesture.end(1, 0, 0, 80);
  expect(actions).toEqual([]);
});

it('recognizes a fast flick when most motion arrives at release', () => {
  const actions: Action[] = [];
  const gesture = createGestureInterpreter(action => actions.push(action));
  gesture.start(1, 0, 0, 0);
  gesture.move(1, 0, 10, 40);
  gesture.end(1, 0, 80, 100);
  expect(actions.map(action => action.type)).toEqual(['hardDrop']);
});

it('suppresses new gestures until all fingers in a cancelled multi-touch lift', () => {
  const actions: Action[] = [];
  const gesture = createGestureInterpreter(action => actions.push(action));
  gesture.start(1, 0, 0, 0);
  gesture.start(2, 0, 0, 0);
  gesture.start(3, 0, 0, 0);
  gesture.move(3, 0, 72, 100);
  gesture.end(3, 0, 80, 130);
  gesture.end(1, 0, 0, 140);
  gesture.end(2, 0, 0, 150);
  expect(actions).toEqual([]);
  gesture.start(4, 0, 0, 200);
  gesture.move(4, 0, 72, 250);
  gesture.end(4, 0, 80, 300);
  expect(actions.map(action => action.type)).toEqual(['softDrop', 'softDrop', 'softDrop', 'hardDrop']);
});
