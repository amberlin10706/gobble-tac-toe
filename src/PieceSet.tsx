import GamePiece, { GamePieceInfo } from "./GamePiece";

interface PieceSetProps {
  pieces: GamePieceInfo[];
  disabledDrop: boolean;
}

export default function PieceSet({ pieces, disabledDrop }: PieceSetProps) {
  return (
    <div className="overflow-y-auto max-h-[90vh] h-full">
      <div className="border">
        {pieces.map((piece) => (
          <div
            className="flex justify-center items-center border"
            style={{ height: "120px" }}
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
