import type { ActivePiece, PieceKind, Point } from './types';

const shapes: Record<PieceKind, readonly Point[]> = {
  I: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
  O: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  T: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  S: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  Z: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  J: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  L: [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
};

export function cellsFor(piece: ActivePiece): Point[] {
  const size = piece.kind === 'I' ? 4 : 3;
  return shapes[piece.kind].map(point => {
    let { x, y } = point;
    if (piece.kind !== 'O') {
      for (let turn = 0; turn < piece.rotation; turn++) [x, y] = [size - 1 - y, x];
    }
    return { x: x + piece.x, y: y + piece.y };
  });
}

const kicks: readonly Point[] = [
  { x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 },
  { x: -2, y: 0 }, { x: 2, y: 0 }, { x: 0, y: -1 },
  { x: -1, y: -1 }, { x: 1, y: -1 },
];

export function kickOffsets(kind: PieceKind): readonly Point[] {
  return kind === 'I' ? [...kicks, { x: 0, y: -2 }] : kicks;
}
