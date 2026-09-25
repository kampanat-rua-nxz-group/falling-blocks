import type { Action } from '../game/types';

type Gesture = { id: number; x: number; y: number; time: number; axis: 'horizontal' | 'vertical' | null; steps: number };

export function createGestureInterpreter(send: (action: Action) => void) {
  let gesture: Gesture | null = null;
  return {
    start(pointerId: number, x: number, y: number, timeMs: number) {
      if (gesture) { gesture = null; return; }
      gesture = { id: pointerId, x, y, time: timeMs, axis: null, steps: 0 };
    },
    move(pointerId: number, x: number, y: number, _timeMs: number) {
      if (!gesture || gesture.id !== pointerId) return;
      const dx = x - gesture.x;
      const dy = y - gesture.y;
      if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 12) {
        gesture.axis = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
      }
      if (gesture.axis === 'horizontal') {
        const steps = Math.trunc(dx / 24);
        const change = steps - gesture.steps;
        for (let i = 0; i < Math.abs(change); i++) send({ type: change > 0 ? 'right' : 'left' });
        gesture.steps = steps;
      } else if (gesture.axis === 'vertical') {
        const steps = Math.max(0, Math.floor(dy / 24));
        for (let i = gesture.steps; i < steps; i++) send({ type: 'softDrop' });
        gesture.steps = Math.max(gesture.steps, steps);
      }
    },
    end(pointerId: number, x: number, y: number, timeMs: number) {
      if (!gesture || gesture.id !== pointerId) return;
      const dx = x - gesture.x;
      const dy = y - gesture.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) send({ type: 'rotateCW' });
      else if (gesture.axis === 'vertical' && dy >= 64 && timeMs - gesture.time <= 250) send({ type: 'hardDrop' });
      gesture = null;
    },
    cancel() { gesture = null; },
  };
}
