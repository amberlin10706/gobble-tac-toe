import { useDrop } from "react-dnd";
import GamePiece, { GamePieceInfo, GamePieceOwner } from "./GamePiece";

interface BoardCellProps {
  piece?: GamePieceInfo;
  onDropPiece: (item: GamePieceInfo) => void;
  currentPlayer: GamePieceOwner;
}

export default function BoardCell({
  piece,
  currentPlayer,
  onDropPiece,
}: BoardCellProps) {
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: "PIECE",
    canDrop: (item: GamePieceInfo) => {
      if (!piece) return true; // 空格子可放
      return item.size > piece.size; // 僅當 size 較大才能放
    },
    drop: (item) => {
      onDropPiece(item as GamePieceInfo);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={dropRef as any}
      className={`border flex justify-center items-center
      ${isOver && canDrop ? "bg-green-200" : ""} 
      ${isOver && !canDrop ? "bg-red-200" : ""}`}
    >
      {!!piece && (
        <GamePiece
          key={piece.size}
          size={piece.size}
          owner={piece.owner}
          inUse={piece.inUse}
          disabledDrop={currentPlayer !== piece.owner}
        />
      )}
    </div>
  );
}
