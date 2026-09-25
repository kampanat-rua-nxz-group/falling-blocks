import type { Action } from '../game/types';

type Gesture = { id: number; x: number; y: number; time: number; axis: 'horizontal' | 'vertical' | null; steps: number; maxTravel: number };

export function createGestureInterpreter(send: (action: Action) => void) {
  let gesture: Gesture | null = null;
  const pointers = new Set<number>();
  let blocked = false;
  return {
    start(pointerId: number, x: number, y: number, timeMs: number) {
      if (pointers.has(pointerId)) return;
      pointers.add(pointerId);
      if (pointers.size > 1) { gesture = null; blocked = true; return; }
      if (blocked) return;
      gesture = { id: pointerId, x, y, time: timeMs, axis: null, steps: 0, maxTravel: 0 };
    },
    move(pointerId: number, x: number, y: number, _timeMs: number) {
      if (blocked || !gesture || gesture.id !== pointerId) return;
      const dx = x - gesture.x;
      const dy = y - gesture.y;
      gesture.maxTravel = Math.max(gesture.maxTravel, Math.abs(dx), Math.abs(dy));
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
      if (!pointers.delete(pointerId)) return;
      if (blocked) { if (pointers.size === 0) blocked = false; return; }
      if (!gesture || gesture.id !== pointerId) return;
      const dx = x - gesture.x;
      const dy = y - gesture.y;
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      const axis = gesture.axis ?? (distance > 12 ? Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical' : null);
      if (!gesture.axis && Math.max(gesture.maxTravel, distance) < 12) send({ type: 'rotateCW' });
      else if (axis === 'vertical' && dy >= 64 && timeMs - gesture.time <= 250) send({ type: 'hardDrop' });
      gesture = null;
    },
    cancel(pointerId?: number) {
      gesture = null;
      if (pointerId === undefined) pointers.clear();
      else pointers.delete(pointerId);
      blocked = pointers.size > 0;
    },
  };
}
