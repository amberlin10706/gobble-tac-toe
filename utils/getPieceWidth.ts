export function getPieceWidth(size: number): number {
  // Each piece has a width of 15px per unit size, plus an additional 30px for the borders
  return (size + 1) * 20;
}
