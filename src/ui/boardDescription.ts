import type { Board } from '../game/types';

function columnsText(columns: number[]): string {
  if (columns.length === 1) return `column ${columns[0]} occupied`;
  return `columns ${columns.slice(0, -1).join(', ')} and ${columns.at(-1)} occupied`;
}

export function describeBoard(board: Board): string {
  const rows = board.flatMap((row, index) => {
    const columns = row.flatMap((cell, column) => cell === null ? [] : [column + 1]);
    return columns.length ? [`Row ${index + 1}: ${columnsText(columns)}`] : [];
  });
  return rows.length ? rows.join('; ') : 'Board empty';
}
