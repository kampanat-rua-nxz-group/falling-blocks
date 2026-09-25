# Falling Blocks

A single-player falling-block puzzle game with original pixel-style visuals. Play at [kampanat-rua-nxz-group.github.io/falling-blocks](https://kampanat-rua-nxz-group.github.io/falling-blocks/) once the GitHub Pages deployment is enabled.

## Play

Fit falling pieces into complete horizontal lines. Clearing one, two, three, or four lines at once scores 100, 300, 500, or 800 points times the current level. Soft drops score one point per row, and hard drops score two. The level rises every ten cleared lines, speeding up gravity. A piece locks after it rests for 500 ms; moves and rotations can reset that delay at most 15 times. The game ends when a new piece cannot spawn or a piece locks above the board.

The next five pieces, hold slot, landing ghost, score, best score, cleared lines, and level appear beside or below the board. You can pause and resume. Hiding the browser tab pauses automatically. Reloading starts a new game; only the best score is stored in this browser. If storage is unavailable, play continues with an in-memory best score. There is no audio.

### Keyboard

| Key | Action |
| --- | --- |
| Left / Right | Move one column |
| Down | Soft drop one row |
| Up / X | Rotate clockwise |
| Z | Rotate counterclockwise |
| Space | Hard drop |
| C | Hold or swap a piece |
| P / Escape | Pause or resume |

The Start, Resume, Restart, Hold, Rotate left, and Pause buttons are also reachable by keyboard.

### Phone

- Drag horizontally: move one column per 24 px.
- Drag down: soft drop one row per 24 px.
- Flick down at least 64 px within 250 ms: hard drop once on release.
- Tap the board: rotate clockwise.
- Use the labeled **Hold** and **Rotate left** buttons for those actions.

## Develop

Use Node 24.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run coverage
npm run typecheck
npm run build
```

The immutable `src/game/` core owns rules, seeded piece order, scoring, and elapsed-time transitions. It has no DOM, timer, or storage access. `src/ui/` renders the board and interprets input. `src/main.ts` owns animation frames, visibility handling, and browser events. `src/storage/` stores only the best score.

## Deploy

The workflow in `.github/workflows/pages.yml` tests and type-checks on pushes to `main`, builds with the `/falling-blocks/` base path, and deploys `dist/` to GitHub Pages. Enable **Settings → Pages → Build and deployment → GitHub Actions** in the repository first. The workflow can also be run manually.

This game uses original CSS art and text. It contains no third-party game assets or music. See [LICENSE](LICENSE) for the MIT license.
