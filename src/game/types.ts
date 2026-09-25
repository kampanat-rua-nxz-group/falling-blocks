export type PieceKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Rotation = 0 | 1 | 2 | 3;
export type Point = Readonly<{ x: number; y: number }>;
export type ActivePiece = Readonly<{ kind: PieceKind; rotation: Rotation; x: number; y: number }>;
export type Board = ReadonlyArray<ReadonlyArray<PieceKind | null>>;
export type Status = 'ready' | 'playing' | 'paused' | 'gameover';
export type Action = { type: 'start' | 'left' | 'right' | 'softDrop' | 'hardDrop' | 'rotateCW' | 'rotateCCW' | 'hold' | 'pause' | 'resume' }
  | { type: 'restart'; seed: number };
export type GameState = Readonly<{
  board: Board; active: ActivePiece; queue: readonly PieceKind[]; seed: number;
  held: PieceKind | null; holdUsed: boolean; score: number; lines: number;
  level: number; status: Status; gravityMs: number; lockMs: number;
  lockResets: number;
}>;
