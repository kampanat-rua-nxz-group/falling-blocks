import type { PieceKind } from './types';

const kinds: readonly PieceKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export function refillQueue(queue: readonly PieceKind[], seed: number, minimum: number): { queue: PieceKind[]; seed: number } {
  const result = [...queue];
  let nextSeed = (seed >>> 0) || 0x6d2b79f5;
  while (result.length < minimum) {
    const bag = [...kinds];
    for (let index = bag.length - 1; index > 0; index--) {
      nextSeed ^= nextSeed << 13;
      nextSeed ^= nextSeed >>> 17;
      nextSeed ^= nextSeed << 5;
      nextSeed >>>= 0;
      const pick = Math.floor((nextSeed / 2 ** 32) * (index + 1));
      [bag[index], bag[pick]] = [bag[pick]!, bag[index]!];
    }
    result.push(...bag);
  }
  return { queue: result, seed: nextSeed };
}
