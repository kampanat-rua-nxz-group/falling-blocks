import { landingY } from '../game/board';
import { cellsFor } from '../game/pieces';
import type { GameState, PieceKind } from '../game/types';
import { describeBoard } from './boardDescription';

function preview(kind: PieceKind | null): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'mini-piece';
  wrapper.setAttribute('aria-label', kind ? `${kind} piece` : 'Empty');
  const cells = kind ? new Set(cellsFor({ kind, rotation: 0, x: 0, y: 0 }).map(({ x, y }) => `${x},${y}`)) : new Set<string>();
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const cell = document.createElement('span');
    cell.className = cells.has(`${x},${y}`) ? `mini-cell cell--${kind}` : 'mini-cell';
    wrapper.append(cell);
  }
  return wrapper;
}

export function createView(root: HTMLElement): { render(state: GameState, best: number): void; announce(text: string): void } {
  root.innerHTML = `
    <div class="cabinet">
      <header class="masthead"><p class="eyebrow">ARCADE / 001</p><h1>Falling Blocks</h1><p class="subtitle">Stack smart. Clear lines. Keep going.</p></header>
      <section class="game-layout" aria-label="Falling Blocks game">
        <div class="play-area">
          <div class="board-frame">
            <div id="board" role="group" aria-label="Game board" aria-describedby="board-description"></div>
            <div id="start-overlay" class="overlay"><div class="overlay-card"><p class="eyebrow">READY PLAYER ONE</p><h2>Make your move</h2><p>Move with arrows. Up or X rotates. Space drops. C holds. P pauses.</p><p>On a phone, drag the board to move or drop. Tap to rotate. Flick down to hard drop.</p><button id="start-button" type="button">Start game</button></div></div>
            <div id="pause-overlay" class="overlay" hidden><div class="overlay-card"><p class="eyebrow">BREAK TIME</p><h2>Paused</h2><button id="resume-button" type="button">Resume game</button></div></div>
            <div id="gameover-overlay" class="overlay" hidden><div class="overlay-card"><p class="eyebrow">GAME OVER</p><h2>Stack complete</h2><p>Final score <strong id="gameover-score">0</strong></p><button id="restart-button" type="button">Play again</button></div></div>
          </div>
          <div class="utility-controls"><button id="hold-button" type="button">Hold <span class="keycap">C</span></button><button id="rotate-left-button" type="button">Rotate left <span class="keycap">Z</span></button><button id="pause-button" type="button">Pause <span class="keycap">P</span></button></div>
          <p id="board-description" class="sr-only"></p><p id="live-status" class="sr-only" aria-live="polite"></p>
        </div>
        <aside class="hud" aria-label="Game status">
          <div class="score-panel"><p class="stat-label">SCORE</p><strong id="score">0</strong><p class="stat-label">BEST</p><strong id="best">0</strong></div>
          <div class="metric-row"><div><p class="stat-label">LINES</p><strong id="lines">0</strong></div><div><p class="stat-label">LEVEL</p><strong id="level">1</strong></div></div>
          <div class="preview-panels"><div class="preview-panel"><h2>HOLD</h2><div id="hold-preview"></div></div><div class="preview-panel"><h2>NEXT</h2><div id="next-preview"></div></div></div>
          <p class="controls-hint">← → move · ↓ soft drop · ↑ / X rotate · Z reverse · Space hard drop · C hold · P pause</p>
        </aside>
      </section>
    </div>`;
  const boardElement = root.querySelector<HTMLElement>('#board')!;
  const cells = Array.from({ length: 200 }, () => {
    const cell = document.createElement('span');
    cell.className = 'cell';
    boardElement.append(cell);
    return cell;
  });
  const setText = (id: string, value: string) => { root.querySelector<HTMLElement>(id)!.textContent = value; };
  const setHidden = (id: string, hidden: boolean) => { root.querySelector<HTMLElement>(id)!.hidden = hidden; };
  return {
    render(state, best) {
      const active = new Set(cellsFor(state.active).filter(({ y }) => y >= 0).map(({ x, y }) => y * 10 + x));
      const ghost = new Set(cellsFor({ ...state.active, y: landingY(state.board, state.active) })
        .filter(({ y }) => y >= 0).map(({ x, y }) => y * 10 + x));
      cells.forEach((cell, index) => {
        const settled = state.board[Math.floor(index / 10)]?.[index % 10];
        cell.className = 'cell';
        if (settled) cell.classList.add(`cell--${settled}`);
        else if (active.has(index)) cell.classList.add(`cell--${state.active.kind}`);
        else if (ghost.has(index)) cell.classList.add('cell--ghost');
      });
      setText('#score', String(state.score));
      setText('#best', String(best));
      setText('#lines', String(state.lines));
      setText('#level', String(state.level));
      setText('#gameover-score', String(state.score));
      setText('#board-description', describeBoard(state.board));
      const hold = root.querySelector<HTMLElement>('#hold-preview')!;
      hold.replaceChildren(preview(state.held));
      const next = root.querySelector<HTMLElement>('#next-preview')!;
      next.replaceChildren(...state.queue.slice(0, 5).map(preview));
      setHidden('#start-overlay', state.status !== 'ready');
      setHidden('#pause-overlay', state.status !== 'paused');
      setHidden('#gameover-overlay', state.status !== 'gameover');
      root.querySelector<HTMLButtonElement>('#hold-button')!.disabled = state.status !== 'playing' || state.holdUsed;
      root.querySelector<HTMLButtonElement>('#rotate-left-button')!.disabled = state.status !== 'playing';
      root.querySelector<HTMLButtonElement>('#pause-button')!.disabled = state.status !== 'playing';
    },
    announce(text) { setText('#live-status', text); },
  };
}
