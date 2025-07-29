import GamePiece, {GamePieceInfo} from './GamePiece';

interface PieceSetProps {
  pieces: GamePieceInfo[];
  disabledDrop: boolean;
}

export default function PieceSet({ pieces, disabledDrop }:PieceSetProps) {
  return (
    <div className="grid grid-cols-1 grid-rows-6 h-full">
      {
        pieces.map((piece) => (
          <div className="flex justify-center items-center border" key={piece.size}>
            {
              piece.inUse === null && (
                <GamePiece
                  size={piece.size}
                  owner={piece.owner}
                  inUse={piece.inUse}
                  disabledDrop={disabledDrop}
                />
              )
            }
          </div>
        ))
      }
    </div>
  );
}
