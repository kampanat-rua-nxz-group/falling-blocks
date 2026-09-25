import type { Action } from '../game/types';

const keyToAction: Record<string, Exclude<Action['type'], 'restart'> | undefined> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'softDrop',
  ArrowUp: 'rotateCW', x: 'rotateCW', z: 'rotateCCW',
  ' ': 'hardDrop', c: 'hold', p: 'pause', Escape: 'pause',
};

export function bindKeyboard(target: Window, send: (action: Action) => void): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const element = event.target instanceof Element ? event.target : null;
    if (element?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if ((event.key === ' ' || event.key === 'Enter') && element?.closest('button, a, [role="button"]')) return;
    const type = keyToAction[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (!type) return;
    event.preventDefault();
    send({ type });
  };
  target.addEventListener('keydown', onKeyDown);
  return () => target.removeEventListener('keydown', onKeyDown);
}
