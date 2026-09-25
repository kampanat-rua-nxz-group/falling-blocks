# Falling Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a polished, accessible, single-player falling-block puzzle game at `kampanat-rua-nxz-group.github.io/falling-blocks/`.

**Architecture:** A pure immutable TypeScript game core owns rules and time-based state transitions. A small browser shell translates keyboard and pointer input into actions, renders a 200-cell DOM board and HUD, and saves only the best score. Vite builds the static site for GitHub Pages.

**Tech Stack:** Node 24, TypeScript 7.0.2, Vite 8.3.0, Vitest 5.0.1, jsdom 30.1.0, HTML/CSS; no runtime dependencies.

**Spec:** `DESIGN.md` in this repository.

## Global Constraints

- Public title and repository name: **Falling Blocks** / `falling-blocks`. Use original art and no Tetris branding, logo, music, or assets.
- One continuous mode; 10×20 board; seven pieces; shuffled bag; five-piece preview; hold, ghost, soft and hard drop, wall kicks, pause, restart, and game over.
- Score: `([100, 300, 500, 800][linesCleared - 1] * level)` for a clear, plus 1 per manual soft-drop row and 2 per hard-drop row. Level is `1 + floor(totalLines / 10)`.
- Gravity: `max(80, 1000 * 0.82 ** (level - 1))` ms/row. Grounded lock delay: 500 ms and at most 15 reset opportunities per active piece.
- Persist only best score in browser storage. A reload starts a new game; storage failures must not stop play.
- Retro dark arcade pixel style, portrait-first responsive layout, landscape support, no audio, no bot, no theme picker, no backend, no 2048 crosslink.
- Every action has a keyboard path. Provide readable contrast, visible focus, useful assistive text, and reduced-motion behavior.
- The pure game core cannot import DOM, timers, or storage. Use strict TypeScript with `noUncheckedIndexedAccess`; keep focused files at or below roughly 300 lines.
- CI uses Node 24 and gates deployment on tests and type checking. The GitHub Pages base is `/falling-blocks/` in `ghpages` mode and `/` locally.
- Add an MIT license with `Copyright (c) 2026 kampanat-rua-nxz-group`.

## File Map

| Path | Responsibility |
| --- | --- |
| `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts` | Tooling, strict types, tests, Pages base |
| `src/game/types.ts` | Board, piece, state, and action contracts |
| `src/game/pieces.ts` | Seven shapes, rotation geometry, wall-kick candidates |
| `src/game/random.ts` | Deterministic seeded seven-bag generator |
| `src/game/board.ts` | Collision, movement, rotation, ghost landing, locking, row clearing |
| `src/game/game.ts` | Game lifecycle, hold/preview, gravity/lock clock, scoring |
| `src/storage/bestScore.ts` | Best-score storage with in-memory fallback |
| `src/ui/view.ts`, `src/ui/boardDescription.ts`, `index.html` | DOM board, previews, HUD, overlays, assistive text |
| `src/ui/keyboard.ts`, `src/ui/gestures.ts` | Keyboard and touch-to-action translation |
| `src/main.ts` | Timers, visibility, state-to-view wiring |
| `src/styles.css` | Pixel art, phone layouts, focus, reduced motion |
| `README.md`, `LICENSE`, `.github/workflows/pages.yml` | Usage, reuse terms, deployment |

Each source module gets an adjacent `*.test.ts` where a meaningful behavior can be tested. `src/main.test.ts` exercises browser wiring in jsdom.

## Review Focus

The tests within the tasks below must pin down these five high-risk conditions:

1. A piece partly above the board can move, but locking above row 0 or spawning into occupied cells ends the game (Tasks 2–3).
2. A rotation adjacent to a wall or stack succeeds only through a valid kick and never overlaps a cell (Task 2).
3. Four rows clear simultaneously, compact in the right order, and score at the level before the clear (Tasks 2–3).
4. A fast downward phone flick issues exactly one hard drop, even after incremental soft-drop events (Task 6).
5. Hiding the tab pauses play; returning does not apply the hidden time as gravity or lock delay (Task 6).

---

### Task 1: Bootstrap and deterministic piece stream

**Files:** Create `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `src/game/types.ts`, `src/game/pieces.ts`, `src/game/pieces.test.ts`, `src/game/random.ts`, `src/game/random.test.ts`; replace the starter `README.md` only in Task 8.

**Interfaces:** Produce `PieceKind`, `Rotation`, `Point`, `ActivePiece`, `Board`, `GameState`, and `Action` from `types.ts`; `cellsFor(piece)` and `kickOffsets(kind)` from `pieces.ts`; `refillQueue(queue, seed, minimum)` from `random.ts`. Later tasks import these exact names.

- [ ] **Step 1: Define the project scripts and strict compiler settings.** Use the 2048 project's dependency versions except Three.js. `package.json` must contain `dev`, `build`, `preview`, `typecheck`, `test`, `test:watch`, and `coverage` scripts; `build` runs `tsc --noEmit && vite build`. Pin `typescript@7.0.2`, `vite@8.3.0`, `vitest@5.0.1`, `@vitest/coverage-v8@5.0.1`, and `jsdom@30.1.0`. Use the 2048 `tsconfig.json` settings, including `strict`, `noUncheckedIndexedAccess`, and `noUnusedLocals`. In `vite.config.ts`, set `base: mode === 'ghpages' ? '/falling-blocks/' : '/'`, Vitest's default environment to `node`, and coverage on `src/game/**/*.ts`, `src/storage/**/*.ts`, and `src/ui/gestures.ts` with 80% thresholds. Run `npm install` to produce the lockfile.

- [ ] **Step 2: Write failing geometry and bag tests.** In `pieces.test.ts` and `random.test.ts`, include these cases before implementation:

  ```ts
  import { describe, expect, it } from 'vitest';
  import { cellsFor } from './pieces';
  import { refillQueue } from './random';
  import type { PieceKind } from './types';

  const kinds: PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  describe('pieces', () => {
    it.each(kinds)('%s has four unique cells in every orientation', kind => {
      for (const rotation of [0, 1, 2, 3] as const) {
        const cells = cellsFor({ kind, rotation, x: 0, y: 0 });
        expect(cells).toHaveLength(4);
        expect(new Set(cells.map(({ x, y }) => `${x},${y}`)).size).toBe(4);
      }
    });
    it('keeps O in the same cells when rotated', () => {
      expect(cellsFor({ kind: 'O', rotation: 1, x: 0, y: 0 }))
        .toEqual(cellsFor({ kind: 'O', rotation: 0, x: 0, y: 0 }));
    });
  });
  describe('seven-bag queue', () => {
    it('is deterministic and contains all seven before repeating', () => {
      const first = refillQueue([], 12345, 14);
      expect(first).toEqual(refillQueue([], 12345, 14));
      expect(new Set(first.queue.slice(0, 7))).toEqual(new Set(kinds));
      expect(new Set(first.queue.slice(7, 14))).toEqual(new Set(kinds));
    });
    it('handles a zero seed and preserves queued pieces', () => {
      const result = refillQueue(['T'], 0, 8);
      expect(result.queue[0]).toBe('T');
      expect(result.queue).toHaveLength(8);
    });
  });
  ```

- [ ] **Step 3: Run `npm test -- --run src/game/pieces.test.ts src/game/random.test.ts`.** Confirm the missing modules/functions fail the tests.

- [ ] **Step 4: Implement the contracts, shapes, and seeded bag.** Define these exact public types in `types.ts` so later tasks compile against them:

  ```ts
  export type PieceKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
  export type Rotation = 0 | 1 | 2 | 3;
  export type Point = Readonly<{ x: number; y: number }>;
  export type ActivePiece = Readonly<{ kind: PieceKind; rotation: Rotation; x: number; y: number }>;
  export type Board = ReadonlyArray<ReadonlyArray<PieceKind | null>>;
  export type Status = 'ready' | 'playing' | 'paused' | 'gameover';
  export type Action = { type: 'start' | 'left' | 'right' | 'softDrop' | 'hardDrop'
    | 'rotateCW' | 'rotateCCW' | 'hold' | 'pause' | 'resume' }
    | { type: 'restart'; seed: number };
  export type GameState = Readonly<{
    board: Board; active: ActivePiece; queue: readonly PieceKind[]; seed: number;
    held: PieceKind | null; holdUsed: boolean; score: number; lines: number;
    level: number; status: Status; gravityMs: number; lockMs: number;
    lockResets: number;
  }>;
  ```

  Use these base local cells: `I: (0,1)(1,1)(2,1)(3,1)`; `O: (1,0)(2,0)(1,1)(2,1)`; `T: (1,0)(0,1)(1,1)(2,1)`; `S: (1,0)(2,0)(0,1)(1,1)`; `Z: (0,0)(1,0)(1,1)(2,1)`; `J: (0,0)(0,1)(1,1)(2,1)`; `L: (2,0)(0,1)(1,1)(2,1)`. Rotate non-O shapes clockwise with `(x,y) → (size - 1 - y,x)`, where `size=4` for I and `size=3` otherwise. Translate by the piece origin. `kickOffsets` returns `(0,0),(-1,0),(1,0),(-2,0),(2,0),(0,-1),(-1,-1),(1,-1)` in that order. For I, append `(0,-2)`. Use xorshift32 with zero-seed fallback `0x6d2b79f5`; normalize every generated seed with `>>> 0` before dividing by `2 ** 32` for Fisher–Yates. Append complete shuffled bags until the queue reaches `minimum`. Keep both the queue and next seed in the return value.

- [ ] **Step 5: Run `npm test -- --run src/game/pieces.test.ts src/game/random.test.ts` and `npm run typecheck`; fix any failure.** Commit with `git add package.json package-lock.json tsconfig.json vite.config.ts src/game && git commit -m "feat: scaffold deterministic piece stream"`.

### Task 2: Board physics and line clearing

**Files:** Create `src/game/board.ts` and `src/game/board.test.ts`; extend `src/game/types.ts` only if a type is missing.

**Interfaces:** Consume `Board`, `ActivePiece`, `cellsFor`, and `kickOffsets`. Produce `emptyBoard(): Board`, `canPlace(board, piece): boolean`, `tryMove(board, piece, dx, dy): ActivePiece | null`, `tryRotate(board, piece, direction: 1 | -1): ActivePiece | null`, `landingY(board, piece): number`, and `lockAndClear(board, piece): { board: Board; linesCleared: number; aboveTop: boolean }`.

- [ ] **Step 1: Write failing board tests.** Cover left/right/bottom collision, hidden spawn cells, occupied-cell collision, a kick near the right wall, a rotation blocked by every kick, ghost landing, four-row compaction, and nonmutation of the input board. For example:

  ```ts
  import { describe, expect, it } from 'vitest';
  import { canPlace, emptyBoard, landingY, lockAndClear, tryRotate } from './board';
  import { cellsFor } from './pieces';
  import type { Board } from './types';

  it('permits hidden spawn cells but rejects a blocked visible spawn', () => {
    const board = emptyBoard();
    expect(canPlace(board, { kind: 'T', rotation: 0, x: 3, y: -1 })).toBe(true);
    const blocked: Board = board.map((row, y) =>
      y === 0 ? row.map((cell, x) => x === 3 ? 'J' : cell) : row);
    expect(canPlace(blocked, { kind: 'T', rotation: 0, x: 3, y: -1 })).toBe(false);
  });
  it('kicks away from a wall without overlapping the board edge', () => {
    const board = emptyBoard();
    const rotated = tryRotate(board, { kind: 'I', rotation: 1, x: 7, y: 2 }, 1);
    expect(rotated).not.toBeNull();
    expect(canPlace(board, rotated!)).toBe(true);
  });
  it('refuses a rotation when every kick is blocked', () => {
    const piece = { kind: 'T' as const, rotation: 0 as const, x: 3, y: 5 };
    const activeCells = new Set(cellsFor(piece).map(({ x, y }) => `${x},${y}`));
    const packed: Board = emptyBoard().map((row, y) => row.map((_, x) =>
      activeCells.has(`${x},${y}`) ? null : 'J' as const));
    expect(canPlace(packed, piece)).toBe(true);
    expect(tryRotate(packed, piece, 1)).toBeNull();
  });
  it('projects the ghost to the last legal row', () => {
    expect(landingY(emptyBoard(), { kind: 'O', rotation: 0, x: 3, y: -1 })).toBe(18);
  });
  it('clears four rows at once and leaves the source board unchanged', () => {
    const source = emptyBoard().map((row, y) =>
      y >= 16 ? row.map((_, x) => x === 4 ? null : 'J') : row) as Board;
    const result = lockAndClear(source, { kind: 'I', rotation: 1, x: 2, y: 16 });
    expect(result.linesCleared).toBe(4);
    expect(result.board.every(row => row.every(cell => cell === null))).toBe(true);
    expect(source[19]?.[0]).toBe('J');
  });
  ```

- [ ] **Step 2: Run `npm test -- --run src/game/board.test.ts`.** Confirm failures are from the missing board behavior.

- [ ] **Step 3: Implement board operations.** `canPlace` rejects x outside `[0,9]`, y at or below 20, and overlap with non-null visible cells; negative y is permitted. `tryMove`/`tryRotate` return a new piece or `null` and never mutate arguments. `tryRotate` checks each ordered kick on the next rotation; O returns the original position with the next rotation. `landingY` repeatedly tests one row lower. `lockAndClear` copies all rows, writes visible active cells, records `aboveTop` if any cell has y<0, filters full rows, then prepends exactly `linesCleared` empty rows. It returns the new board even when `aboveTop` is true; Task 3 turns that flag into game over.

  ```ts
  export function canPlace(board: Board, piece: ActivePiece): boolean {
    return cellsFor(piece).every(({ x, y }) =>
      x >= 0 && x < 10 && y < 20 && (y < 0 || board[y]?.[x] === null));
  }
  export function tryRotate(board: Board, piece: ActivePiece, direction: 1 | -1): ActivePiece | null {
    const rotation = ((piece.rotation + direction + 4) % 4) as Rotation;
    for (const { x, y } of kickOffsets(piece.kind)) {
      const candidate = { ...piece, rotation, x: piece.x + x, y: piece.y + y };
      if (canPlace(board, candidate)) return candidate;
    }
    return null;
  }
  ```

- [ ] **Step 4: Run the board test and `npm run typecheck`.** Commit with `git add src/game && git commit -m "feat: add board collision and row clearing"`.

### Task 3: Pure game lifecycle, scoring, and timing

**Files:** Create `src/game/game.ts`, `src/game/game.test.ts`; complete `src/game/types.ts`.

**Interfaces:** Consume Task 1's queue/geometry and Task 2's board functions. Produce `createGame(seed: number): GameState`, `dispatch(state: GameState, action: Action): GameState`, `advance(state: GameState, elapsedMs: number): GameState`, and `gravityInterval(level: number): number`. `Action` and `GameState` use the exact contracts established in Task 1.

- [ ] **Step 1: Write failing lifecycle tests.** Build test states with immutable object spreads from `createGame(seed)` and cover start/restart, five previews, soft/hard-drop points, hold once per piece and re-enable after lock, line scores at the *pre-clear* level, level at ten lines, lock after 500 ms with only 15 resets, spawn collision, top-out, and pause. Include these precise examples:

  ```ts
  import { expect, it } from 'vitest';
  import { createGame, dispatch, advance, gravityInterval } from './game';
  import { emptyBoard } from './board';
  import type { Board, GameState } from './types';

  it('uses the level before a four-line clear for scoring', () => {
    const base = dispatch(createGame(7), { type: 'start' });
    const board: Board = emptyBoard().map((row, y) =>
      y >= 16 ? row.map((_, x) => x === 4 ? null : 'J' as const) : row);
    const ready: GameState = { ...base, board, lines: 9, level: 1,
      active: { kind: 'I', rotation: 1, x: 2, y: 15 } };
    const result = dispatch(ready, { type: 'hardDrop' });
    expect(result.lines).toBe(13);
    expect(result.level).toBe(2);
    expect(result.score).toBe(802); // 800 at level 1 + 2 for one dropped row
  });
  it('does not advance a paused game', () => {
    const paused = dispatch(dispatch(createGame(4), { type: 'start' }), { type: 'pause' });
    expect(advance(paused, 10_000)).toEqual(paused);
  });
  it('locks a grounded piece after 500 ms', () => {
    const base = dispatch(createGame(9), { type: 'start' });
    const grounded: GameState = { ...base,
      active: { kind: 'O', rotation: 0, x: 3, y: 18 } };
    const at400 = Array.from({ length: 4 }).reduce<GameState>(
      state => advance(state, 100), grounded);
    expect(at400.active).toEqual(grounded.active);
    expect(advance(at400, 100).active).not.toEqual(grounded.active);
  });
  it('ends if a locked piece still has a cell above the board', () => {
    const base = dispatch(createGame(3), { type: 'start' });
    const board: Board = emptyBoard().map((row, y) =>
      y === 1 ? row.map(() => 'J' as const) : row);
    const state: GameState = { ...base, board,
      active: { kind: 'T', rotation: 0, x: 3, y: -1 } };
    expect(dispatch(state, { type: 'hardDrop' }).status).toBe('gameover');
  });
  it('never lets gravity get faster than 80 ms', () => {
    expect(gravityInterval(1)).toBe(1000);
    expect(gravityInterval(100)).toBe(80);
  });
  ```

- [ ] **Step 2: Run `npm test -- --run src/game/game.test.ts`.** Confirm the tests fail for missing lifecycle behavior.

- [ ] **Step 3: Implement the state machine.** `createGame` refills a queue to six, draws its first item as the active piece at `(x:3,y:-1,rotation:0)`, retains at least five previews, and returns `status:'ready'`. `start` enters play. Only playing states accept movement/drop/hold. `restart` creates a fresh state from its provided seed and enters play. `pause` and `resume` preserve board and timers. `softDrop` adds one point only if movement succeeds. `hardDrop` computes `distance = landingY - active.y`, adds `2 * distance`, and locks immediately. Locking uses `lockAndClear`, adds line points using the old level, updates lines/level, draws and spawns the next piece, resets hold eligibility and clocks, and sets `gameover` for `aboveTop` or blocked spawn. A hold swaps with the held piece or consumes the queue when empty, resets the active origin/rotation, and checks spawn collision; repeated hold before lock is ignored. Successful grounded moves/rotations reset `lockMs` only while `lockResets < 15`; leaving the ground clears `lockMs` but does not restore reset opportunities. `advance` ignores non-playing states, clamps each call to 0–100 ms, accumulates gravity and grounded lock time, moves down for each elapsed gravity interval, and locks at 500 ms. Return new objects; never mutate the old state or board.

  ```ts
  export function gravityInterval(level: number): number {
    return Math.max(80, 1000 * 0.82 ** (Math.max(1, level) - 1));
  }
  const linePoints = [0, 100, 300, 500, 800] as const;
  function scoreAfterClear(score: number, level: number, cleared: number): number {
    return score + (linePoints[cleared] ?? 0) * level;
  }
  // In the lock branch, call scoreAfterClear with the previous level,
  // then set level to 1 + Math.floor((state.lines + cleared) / 10).
  ```

- [ ] **Step 4: Run `npm test -- --run src/game/game.test.ts`, `npm run coverage`, and `npm run typecheck`.** Add targeted tests for any uncovered collision, hold, or timing branch until the 80% core coverage gate passes. Commit with `git add src/game && git commit -m "feat: implement falling-block game rules"`.

### Task 4: Best-score persistence

**Files:** Create `src/storage/bestScore.ts` and `src/storage/bestScore.test.ts`.

**Interfaces:** Produce `createBestScoreStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null): { get(): number; consider(score: number): number }` and `browserStorage(): Storage | null`. The store uses `falling-blocks.best-score.v1`. `consider` returns the current best, including when persistence fails.

- [ ] **Step 1: Write failing storage tests.** Cover an empty store, a valid saved value, malformed/negative/nonfinite values, lower-score no-op, setter throwing, getter throwing, and the `window.localStorage` property throwing. For example:

  ```ts
  import { expect, it } from 'vitest';
  import { createBestScoreStore } from './bestScore';

  it('keeps the best score in memory if writing fails', () => {
    const storage = { getItem: () => '12', setItem: () => { throw Error('quota'); } };
    const best = createBestScoreStore(storage);
    expect(best.consider(20)).toBe(20);
    expect(best.get()).toBe(20);
    expect(best.consider(10)).toBe(20);
  });
  it('rejects corrupt stored values', () => {
    const storage = { getItem: () => '-42', setItem: () => undefined };
    expect(createBestScoreStore(storage).get()).toBe(0);
  });
  ```

- [ ] **Step 2: Run `npm test -- --run src/storage/bestScore.test.ts`.** Confirm it fails because the store is missing.

- [ ] **Step 3: Implement the store.** Read the key once; accept only finite, nonnegative integers. Keep an in-memory `best` regardless of whether writes work. `consider` ignores invalid inputs, updates only when the new score is larger, and catches `setItem` errors. `browserStorage` must catch failure while reading the `window.localStorage` property itself. The core never imports this module.

  ```ts
  export const BEST_SCORE_KEY = 'falling-blocks.best-score.v1';
  export function createBestScoreStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null) {
    let best = 0;
    try {
      const parsed = Number(storage?.getItem(BEST_SCORE_KEY));
      if (Number.isSafeInteger(parsed) && parsed >= 0) best = parsed;
    } catch { best = 0; }
    return {
      get: () => best,
      consider(score: number) {
        if (!Number.isSafeInteger(score) || score <= best) return best;
        best = score;
        try { storage?.setItem(BEST_SCORE_KEY, String(best)); } catch { /* memory fallback */ }
        return best;
      },
    };
  }
  export function browserStorage(): Storage | null {
    try { return window.localStorage; } catch { return null; }
  }
  ```

- [ ] **Step 4: Run the storage tests, `npm run coverage`, and `npm run typecheck`.** Commit with `git add src/storage && git commit -m "feat: persist best score safely"`.

### Task 5: Board, HUD, overlays, and assistive text

**Files:** Create `index.html`, `src/ui/view.ts`, `src/ui/view.test.ts`, `src/ui/boardDescription.ts`, `src/ui/boardDescription.test.ts`; create minimal `src/styles.css` so the DOM is usable before Task 7.

**Interfaces:** Consume `GameState`, `Board`, `cellsFor`, and `landingY`. Produce `createView(root: HTMLElement): { render(state: GameState, best: number): void; announce(text: string): void }` and `describeBoard(board: Board): string`. `createView` owns `#board`, `#score`, `#best`, `#lines`, `#level`, `#hold-preview`, `#next-preview`, `#start-overlay`, `#pause-overlay`, `#gameover-overlay`, `#live-status`, `#start-button`, `#pause-button`, `#resume-button`, `#restart-button`, `#hold-button`, and `#rotate-left-button`. Task 6 binds those buttons.

- [ ] **Step 1: Write failing DOM and description tests.** Use a `// @vitest-environment jsdom` pragma in UI tests. Assert exactly 200 board cells, five next previews, correct score/best/level text, a ghost cell that never replaces an occupied block, the right overlay per status, a concise occupied-row description, and a live announcement. Example:

  ```ts
  // @vitest-environment jsdom
  import { expect, it } from 'vitest';
  import { createGame, dispatch } from '../game/game';
  import { createView } from './view';

  it('renders a ready board and changes to the playing view', () => {
    document.body.innerHTML = '<main id="app"></main>';
    const view = createView(document.querySelector('#app')!);
    const ready = createGame(1);
    view.render(ready, 42);
    expect(document.querySelectorAll('#board .cell')).toHaveLength(200);
    expect(document.querySelectorAll('#next-preview .mini-piece')).toHaveLength(5);
    expect(document.querySelector('#best')?.textContent).toBe('42');
    expect(document.querySelector('#start-overlay')?.hasAttribute('hidden')).toBe(false);
    view.render(dispatch(ready, { type: 'start' }), 42);
    expect(document.querySelector('#start-overlay')?.hasAttribute('hidden')).toBe(true);
    view.announce('Level 2');
    expect(document.querySelector('#live-status')?.textContent).toBe('Level 2');
  });
  ```

- [ ] **Step 2: Run `npm test -- --run src/ui/view.test.ts src/ui/boardDescription.test.ts`.** Confirm the UI modules are missing.

- [ ] **Step 3: Build the DOM view.** `index.html` contains `<main id="app"></main>` and a viewport meta tag; import `src/main.ts` as a module. `createView` builds the static shell once, creates 200 `.cell` nodes, and renders settled cells, the active piece, then ghost cells only where neither settled nor active cells are present. Use classes `cell--I` through `cell--L` and `cell--ghost`, with no text inside individual cells. Render the five queued kinds and held kind as small grids. Toggle overlays with the native `hidden` attribute; reflect status in button disabled states. `describeBoard` names only occupied rows from top to bottom, for example `Row 1: columns 1 and 10 occupied; Row 2: column 4 occupied`; the board group references this text through `aria-describedby`. Put line-clear, pause, level, and game-over announcements in `#live-status[aria-live="polite"]` without announcing each frame. Make the two phone utility buttons real labeled buttons.

  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <main id="app"></main>
  <script type="module" src="/src/main.ts"></script>
  ```

- [ ] **Step 4: Run UI tests and `npm run typecheck`.** Manually open the start screen to confirm the board and labels are visible even before final styling. Commit with `git add index.html src/ui src/styles.css && git commit -m "feat: render board and game status"`.

### Task 6: Keyboard, gestures, animation clock, and visibility

**Files:** Create `src/ui/keyboard.ts`, `src/ui/keyboard.test.ts`, `src/ui/gestures.ts`, `src/ui/gestures.test.ts`, `src/main.ts`, `src/main.test.ts`.

**Interfaces:** Consume Tasks 3–5. Produce `bindKeyboard(target: Window, send: (action: Action) => void): () => void` and `createGestureInterpreter(send: (action: Action) => void)` with `start(pointerId, x, y, timeMs)`, `move(pointerId, x, y, timeMs)`, `end(pointerId, x, y, timeMs)`, and `cancel()`. `main.ts` creates the app, binds DOM pointer events to the interpreter, and uses `requestAnimationFrame` to call `advance`.

- [ ] **Step 1: Write failing control and runtime tests.** Check every agreed key, modifier pass-through, repeated horizontal drag steps, tap rotation, downward soft-drop steps, multi-touch cancellation, and one hard drop from a fast flick. Add a jsdom `createApp` test with an injected frame clock: hide the document, advance fake time by 30 seconds, unhide and resume, then assert the active piece did not jump. Example gesture test:

  ```ts
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
  ```

  In `src/main.test.ts`, create `#app` in jsdom, inject a fake clock whose `request` stores the callback, call `app.send({ type: 'start' })`, and run its first frame at time 0. Set `document.hidden` to true with `Object.defineProperty`, dispatch `visibilitychange`, and assert `status === 'paused'`. Set `hidden` to false, call `app.send({ type: 'resume' })`, run the next frame at time 30_000, and assert the active piece and lock/gravity clocks equal their values immediately before hiding. Call `app.destroy()` to remove listeners.

- [ ] **Step 2: Run `npm test -- --run src/ui/keyboard.test.ts src/ui/gestures.test.ts src/main.test.ts`.** Confirm control/runtime tests fail for missing modules.

- [ ] **Step 3: Implement keyboard and gestures.** Map Left/Right/Down/Up/X/Z/Space/C/P/Escape exactly as in `DESIGN.md`; normalize letter keys, ignore Ctrl/Meta/Alt, and let Space/Enter activate a focused button or editable element without issuing a game action. Add a test for this focused-button case. Call `preventDefault()` only for recognized gameplay keys. `createGestureInterpreter` tracks one pointer. Once motion exceeds 12 px, lock to the dominant axis. Horizontal drags emit one move per crossed 24 px boundary; downward drags emit one `softDrop` per 24 px. A tap with under 12 px travel emits `rotateCW`. On release, a dominant downward gesture with at least 64 px travel and duration no more than 250 ms emits `hardDrop` once; release never emits another soft-drop step. A second pointer or pointer cancellation clears the gesture. Bind pointer handlers only to `#board` and set `touch-action: none` there.

  ```ts
  const keyToAction: Record<string, Action['type'] | undefined> = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'softDrop',
    ArrowUp: 'rotateCW', x: 'rotateCW', z: 'rotateCCW',
    ' ': 'hardDrop', c: 'hold', p: 'pause', Escape: 'pause',
  };
  ```

- [ ] **Step 4: Implement browser wiring.** Export `createApp(document, clock)` for tests; call it with the real browser clock at module load only when `#app` exists. `clock` has `request(callback: FrameRequestCallback): number`, `cancel(id: number): void`, and `now(): number`. The shell owns `let state`, the best-score store, and a single `send(action)` that dispatches, updates best score, renders, and announces meaningful state changes. Bind overlay and utility buttons to actions; the pause key toggles to `resume` when paused. On each animation frame, compute elapsed time from the prior frame and call `advance`; after an automatic pause or manual resume, clear the prior timestamp so no hidden time is applied. On `visibilitychange` to hidden, dispatch `pause` and clear the timestamp. Seed a new session with `crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now()` or `Date.now()` if crypto is unavailable. Return a small test handle with `getState()`, `send(action)`, and `destroy()`.

  ```ts
  const onVisibilityChange = () => {
    if (document.hidden) {
      send({ type: 'pause' });
      lastFrameTime = null;
    }
  };
  ```

- [ ] **Step 5: Run control/runtime tests, full `npm test`, `npm run coverage`, and `npm run typecheck`.** Commit with `git add src/ui src/main.ts src/main.test.ts && git commit -m "feat: wire controls and game loop"`.

### Task 7: Retro styling and responsive accessibility

**Files:** Complete `src/styles.css`; adjust `src/ui/view.ts` markup only where styling or labels require it.

**Interfaces:** CSS consumes the stable IDs/classes from Task 5; game rules and actions do not change.

- [ ] **Step 1: Style the game in a dark arcade palette.** Use CSS custom properties for background `#0B1021`, cabinet `#1D2643`, ink `#F7F4E8`, grid `#2E3857`, focus `#FFD166`, ghost `#7D89A8`, and piece colors I `#53D6E7`, O `#F7D154`, T `#AF7CF5`, S `#69D180`, Z `#F07178`, J `#638FF4`, L `#F7A45D`. Build block shapes from solid fills, thick inset borders, and pixel-like shadows; use a system monospace stack so no external font or asset is required. Keep the board square-celled with `aspect-ratio: 1`; its width is limited by both available width and viewport height. Give buttons at least a comfortable phone tap area and mark active/hover/focus states visibly. Ensure `[hidden]` stays hidden even when overlay classes set `display`.

  ```css
  #board { display: grid; grid-template-columns: repeat(10, 1fr); touch-action: none; }
  .cell { aspect-ratio: 1; border: 1px solid var(--grid-line); }
  [hidden] { display: none !important; }
  :focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
  ```

- [ ] **Step 2: Add portrait and landscape rules.** In portrait, put the board first and compact score/preview/hold around it; keep Hold and Rotate Left reachable without covering the board. In landscape, put the board beside the HUD. At widths from 320 px upward, the board and controls must fit without horizontal scrolling. Maintain contrast and legible text rather than shrinking labels to fit.

- [ ] **Step 3: Verify in a browser.** Run `npm run dev`; inspect 320×568 and 390×844 portrait, 844×390 landscape, and a desktop viewport. Play using both the keyboard and touch emulation. Tab through every button, check visible focus, and enable reduced motion to verify that nonessential animation stops. Fix any clipped board, unreachable control, unreadable label, or unwanted page scrolling. Run `npm test` and `npm run typecheck`, then commit with `git add src/styles.css src/ui/view.ts && git commit -m "style: add responsive pixel arcade theme"`.

### Task 8: Repository documentation, license, CI, and release checks

**Files:** Replace `README.md`; create `LICENSE` and `.github/workflows/pages.yml`; adjust `vite.config.ts` only if the Pages build check reveals a path issue.

**Interfaces:** No game API changes. Deployment takes `dist/` from `vite build --mode ghpages` and publishes it through GitHub Pages.

- [ ] **Step 1: Write the README and license.** Document the live URL, game rules, exact keyboard and phone controls, `npm ci`, `npm run dev`, `npm test`, `npm run coverage`, `npm run typecheck`, `npm run build`, architecture boundaries, local best-score behavior, no audio, and deployment from `main`. Replace the starter one-line README. Use the standard MIT license text with `Copyright (c) 2026 kampanat-rua-nxz-group`; use original project art and copy only.

- [ ] **Step 2: Add the GitHub Pages workflow.** Mirror the 2048 workflow with Node 24, `npm ci`, `npm test`, `npm run typecheck`, `./node_modules/.bin/vite build --mode ghpages`, artifact upload from `dist`, and Pages deployment on pushes to `main` or manual dispatch. Use `contents: read`, `pages: write`, and `id-token: write` permissions; set the deploy job's `github-pages` environment.

  ```yaml
  name: Deploy to GitHub Pages
  on:
    push:
      branches: [main]
    workflow_dispatch:
  permissions:
    contents: read
    pages: write
    id-token: write
  concurrency:
    group: pages
    cancel-in-progress: false
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v7
        - uses: actions/setup-node@v7
          with:
            node-version: 24
            cache: npm
        - run: npm ci
        - run: npm test
        - run: npm run typecheck
        - run: ./node_modules/.bin/vite build --mode ghpages
        - uses: actions/configure-pages@v6
        - uses: actions/upload-pages-artifact@v5
          with:
            path: dist
    deploy:
      needs: build
      runs-on: ubuntu-latest
      environment:
        name: github-pages
        url: ${{ steps.deployment.outputs.page_url }}
      steps:
        - id: deployment
          uses: actions/deploy-pages@v5
  ```

  Enable **Settings → Pages → Build and deployment → GitHub Actions** in the repository before expecting the workflow to publish the site. Keep the workflow's `concurrency` group as `pages` with `cancel-in-progress: false`, matching 2048.

- [ ] **Step 3: Verify release behavior.** Run `npm ci`, `npm test`, `npm run coverage`, `npm run typecheck`, `npm run build`, and `./node_modules/.bin/vite build --mode ghpages`. Inspect `dist/index.html` to confirm `/falling-blocks/` asset paths. Manually play through a line clear, hold, pause/resume, tab-hide pause, game over/restart, and best-score reload. Check phone portrait/landscape and reduced motion. Fix defects found by these checks, then rerun only the failed gate and the full test/typecheck/build gate once.

- [ ] **Step 4: Commit the completed release work.** `git add README.md LICENSE .github/workflows/pages.yml vite.config.ts && git commit -m "docs: prepare Falling Blocks release"`. Before pushing, review the diff and repository Pages settings. Push/deploy only after the implementation owner has approved the completed result.

## Plan Self-Review Checklist

- [x] Every requirement in `DESIGN.md` maps to a task above; no game code is required during the current planning phase.
- [x] The five Review Focus cases have tests in Tasks 2, 3, or 6.
- [x] Later tasks use the exported names and types established by earlier tasks.
- [x] No step leaves an undefined game rule or missing file path for the implementer.
