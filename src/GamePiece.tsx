import { useDrag } from "react-dnd";
import { getPieceWidth } from "../utils/getPieceWidth";

export type GamePieceOwner = "A" | "B";
export type GamePieceSize = 1 | 2 | 3 | 4 | 5 | 6;

export type GamePieceInfo = {
  owner: GamePieceOwner;
  size: GamePieceSize;
  inUse: number | null;
};

export interface GamePieceProps extends GamePieceInfo {
  disabledDrop: boolean;
}

const pieceImageMap = {
  A: "/piece_pig_A.png",
  B: "/piece_pig_B.png",
} as const;

export default function GamePiece({
  size,
  owner,
  inUse,
  disabledDrop = false,
}: GamePieceProps) {
  const [{ isDragging }, dragRef] = useDrag({
    type: "PIECE",
    item: { size, owner, inUse },
    canDrag: () => {
      return !disabledDrop;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={dragRef as any}
      style={{
        width: getPieceWidth(size),
        cursor: !disabledDrop ? "move" : "not-allowed",
      }}
    >
      <img
        src={pieceImageMap[owner]}
        alt={`piece_${owner}_${size}`}
        style={{ opacity: isDragging ? 0.5 : 1 }}
        draggable="false"
      />
    </div>
  );
}
