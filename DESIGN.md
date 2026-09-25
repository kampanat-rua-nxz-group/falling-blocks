# Falling Blocks — Design

Date: 2026-09-25

## Goal and scope

Build a polished, shareable, single-player falling-block puzzle game. The repository is `kampanat-rua-nxz-group/falling-blocks`, with a planned GitHub Pages site at `/falling-blocks/`. The local project folder is `game-falling-blocks`. This document and the implementation plan are planning artifacts; game code belongs to the later implementation phase.

The game has one continuous mode. It uses an original **Falling Blocks** title and original retro pixel art. Do not use Tetris logos, music, artwork, or branding. The 2048 site and repository stay independent.

## Player experience

- The start screen explains keyboard and phone controls. Starting begins at level 1 with an empty 10-column by 20-row board.
- The seven four-cell pieces use a seeded shuffled bag. Show the next five pieces, a hold slot, score, best score, cleared lines, and level.
- A translucent ghost shows the active piece's landing position. Movement, clockwise and counterclockwise rotation with deterministic wall kicks, soft drop, hard drop, and hold are available. Hold can be used once until the active piece locks.
- Gravity starts at 1000 ms per row at level 1 and uses `max(80, 1000 * 0.82 ** (level - 1))` ms thereafter. A grounded piece locks after 500 ms. A successful move or rotation can reset the lock clock at most 15 times for that piece.
- Locking clears all complete rows simultaneously. One, two, three, or four cleared rows award 100, 300, 500, or 800 points times the current level. Each manually soft-dropped row awards 1 point; each hard-dropped row awards 2. The level is `1 + floor(totalLines / 10)` after a clear.
- The game ends when a new piece cannot spawn or a locked piece remains above the visible board. Game over shows the final score and a restart action.
- A player can pause and resume. Switching away from the browser tab pauses automatically. Reloading starts a new session. Only the best score is saved locally; storage failures leave the game playable.
- There is no sound, music, bot, theme picker, online leaderboard, account system, saved midgame session, or 2048 crosslink in version 1.

## Controls

Keyboard: Left/Right move; Down soft drops one row per key event; Up or X rotates clockwise; Z rotates counterclockwise; Space hard drops; C holds; P or Escape toggles pause. Ignore gameplay shortcuts with Ctrl, Command, or Alt and allow normal browser shortcuts. Disable gameplay actions while ready, paused, or over, except Start/Resume/Restart.

Phone: A horizontal drag moves one column per 24 px after choosing the horizontal axis; tapping the board rotates clockwise; a downward drag soft drops one row per 24 px; a downward flick of at least 64 px completed within 250 ms hard drops once on release. The first intentional movement locks the gesture to its dominant axis. Multi-touch cancels the gesture. Small labeled Hold and Rotate Left buttons cover those two actions. Only the board captures gestures; controls and overlays remain normal buttons.

## Technical design

Use vanilla strict TypeScript, Vite, Vitest, and jsdom, following the 2048 repository's conventions. Do not include Three.js. The game engine is pure and immutable: a seeded generator and an explicit elapsed-time input make state transitions deterministic in tests. The engine owns piece geometry, collision, rotation, gravity, lock delay, line clearing, scoring, hold, preview, and game status. It has no DOM, timer, or storage access.

The browser shell owns `requestAnimationFrame`, visibility changes, keyboard and pointer inputs, rendering, and best-score persistence. A 200-cell HTML/CSS grid renders the board; DOM elements render the preview, hold, HUD, and overlays. The board nodes are created once and updated from state. CSS provides crisp pixel borders, seven distinguishable colors, a dark arcade cabinet palette, responsive portrait-first sizing, and a useful landscape layout. Animations are brief and disabled under `prefers-reduced-motion`.

The board is one accessible group, with a text description of occupied rows available to assistive technology. Visible buttons have labels and focus styles. A polite live region reports line clears, level changes, pause, and game over without announcing every gravity step. Every gameplay action remains available from a keyboard.

The repository uses Node 24 in GitHub Actions. CI runs `npm ci`, `npm test`, `npm run typecheck`, and a GitHub Pages Vite build before deployment. Vite's base is `/falling-blocks/` only in `ghpages` mode. Include a README with controls, architecture, development commands, and deployment instructions, plus an MIT license naming `kampanat-rua-nxz-group` as copyright holder.

## Validation

Unit tests cover the shuffled bag, geometry, boundaries, kicks, ghost position, multi-row clearing, scoring, hold limits, lock timing, top-out, pause, storage failure, keyboard mappings, and gesture classification. DOM tests cover board/HUD updates, overlays, labels, and announcements. CI enforces tests and type checking. Manual browser checks cover desktop keyboard play, phone portrait and landscape gestures, a full game-over/restart cycle, reduced motion, visible focus, and GitHub Pages asset paths.
