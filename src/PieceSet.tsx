import GamePiece, { GamePieceInfo, GamePieceOwner } from "./GamePiece";

interface PieceSetProps {
  pieces: GamePieceInfo[];
  disabledDrop: boolean;
  winner: GamePieceOwner | null | undefined;
}

export default function PieceSet({
  pieces,
  disabledDrop,
  winner,
}: PieceSetProps) {
  return (
    <div className="h-full overflow-y-auto border">
      <div className="flex flex-col gap-y-3 pt-4">
        {pieces.map((piece) => (
          <div
            className="flex justify-center items-center max-w-full"
            key={piece.size}
          >
            {piece.inUse === null && (
              <GamePiece
                size={piece.size}
                owner={piece.owner}
                inUse={piece.inUse}
                disabledDrop={disabledDrop}
                isWin={winner === piece.owner}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
