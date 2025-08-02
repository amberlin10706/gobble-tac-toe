import GamePiece, { GamePieceInfo, GamePieceOwner } from "./GamePiece";
import React from "react";

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
    <div className="border overflow-x-auto relative ">
      <div className="w-fit flex h-[90px] mx-auto gap-x-1 ">
        {pieces.map((piece) => (
          <div className="flex items-center " key={piece.size}>
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
      {disabledDrop && (
        <div className={`absolute top-0 left-0 bottom-0 right-0 bg-black/40`} />
      )}
    </div>
  );
}
