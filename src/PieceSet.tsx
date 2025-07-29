import GamePiece, {GamePieceInfo} from './GamePiece';
import {useMemo} from 'react';

interface PieceSetProps {
  pieces: GamePieceInfo[];
  disabledDrop: boolean;
  position?: 'left' | 'right';
}

export default function PieceSet({ pieces, disabledDrop, position = 'right' }:PieceSetProps) {

  const list = useMemo(() => {
    if (position === 'left')  {
      return pieces.slice(3).concat(pieces.slice(0, 3))
    }
    return pieces
  }, []);

  return (
    <div className="grid grid-flow-col grid-rows-3 h-full"
         style={{ gridTemplateColumns: position === 'left' ? '140px 110px' : '110px 140px' }}
    >
      {
        list.map((piece) => (
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
