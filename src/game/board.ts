import { cellsFor, kickOffsets } from './pieces';
import type { ActivePiece, Board, PieceKind, Rotation } from './types';

export function emptyBoard(): Board {
  return Array.from({ length: 20 }, () => Array<PieceKind | null>(10).fill(null));
}

export function canPlace(board: Board, piece: ActivePiece): boolean {
  return cellsFor(piece).every(({ x, y }) =>
    x >= 0 && x < 10 && y < 20 && (y < 0 || board[y]?.[x] === null));
}

export function tryMove(board: Board, piece: ActivePiece, dx: number, dy: number): ActivePiece | null {
  const candidate = { ...piece, x: piece.x + dx, y: piece.y + dy };
  return canPlace(board, candidate) ? candidate : null;
}

export function tryRotate(board: Board, piece: ActivePiece, direction: 1 | -1): ActivePiece | null {
  const rotation = ((piece.rotation + direction + 4) % 4) as Rotation;
  if (piece.kind === 'O') return { ...piece, rotation };
  for (const { x, y } of kickOffsets(piece.kind)) {
    const candidate = { ...piece, rotation, x: piece.x + x, y: piece.y + y };
    if (canPlace(board, candidate)) return candidate;
  }
  return null;
}

export function landingY(board: Board, piece: ActivePiece): number {
  let y = piece.y;
  while (canPlace(board, { ...piece, y: y + 1 })) y++;
  return y;
}

export function lockAndClear(board: Board, piece: ActivePiece): { board: Board; linesCleared: number; aboveTop: boolean } {
  const rows = board.map(row => [...row]);
  let aboveTop = false;
  for (const { x, y } of cellsFor(piece)) {
    if (y < 0) aboveTop = true;
    else if (rows[y]) rows[y][x] = piece.kind;
  }
  const remaining = rows.filter(row => row.some(cell => cell === null));
  const linesCleared = 20 - remaining.length;
  return {
    board: [...emptyBoard().slice(0, linesCleared), ...remaining],
    linesCleared,
    aboveTop,
  };
}
