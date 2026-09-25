// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { createApp } from './main';
import type { FrameClock } from './main';
import { tryMove } from './game/board';

it('pauses when hidden and discards hidden elapsed time after resume', () => {
  document.body.innerHTML = '<main id="app"></main>';
  let frame: FrameRequestCallback | null = null;
  const clock: FrameClock = { request: callback => { frame = callback; return 1; }, cancel: () => undefined, now: () => 0 };
  const app = createApp(document, clock);
  app.send({ type: 'start' });
  const firstFrame = frame! as FrameRequestCallback;
  firstFrame(0);
  const before = app.getState();
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  document.dispatchEvent(new Event('visibilitychange'));
  expect(app.getState().status).toBe('paused');
  document.dispatchEvent(new Event('visibilitychange'));
  expect(app.getState().status).toBe('paused');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  app.send({ type: 'resume' });
  const resumedFrame = frame! as FrameRequestCallback;
  resumedFrame(30_000);
  expect(app.getState().active).toEqual(before.active);
  expect(app.getState().gravityMs).toBe(before.gravityMs);
  expect(app.getState().lockMs).toBe(before.lockMs);
  app.destroy();
});

it('preserves a running grounded lock timer across a hidden tab', () => {
  document.body.innerHTML = '<main id="app"></main>';
  let frame: FrameRequestCallback | null = null;
  const clock: FrameClock = { request: callback => { frame = callback; return 1; }, cancel: () => undefined, now: () => 0 };
  const app = createApp(document, clock);
  app.send({ type: 'start' });
  (frame! as FrameRequestCallback)(0);
  for (let i = 0; i < 22 && tryMove(app.getState().board, app.getState().active, 0, 1); i++) {
    app.send({ type: 'softDrop' });
  }
  expect(tryMove(app.getState().board, app.getState().active, 0, 1)).toBeNull();
  (frame! as FrameRequestCallback)(100);
  expect(app.getState().lockMs).toBe(100);
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  document.dispatchEvent(new Event('visibilitychange'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  app.send({ type: 'resume' });
  (frame! as FrameRequestCallback)(30_000);
  expect(app.getState().lockMs).toBe(100);
  app.destroy();
});
