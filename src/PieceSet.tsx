import GamePiece, { GamePieceInfo } from "./GamePiece";

interface PieceSetProps {
  pieces: GamePieceInfo[];
  disabledDrop: boolean;
}

export default function PieceSet({ pieces, disabledDrop }: PieceSetProps) {
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
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
