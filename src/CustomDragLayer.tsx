import {GamePieceInfo} from './GamePiece';
import {useDragLayer} from 'react-dnd';
import {CSSProperties} from 'react';
import {getPieceWidth} from '../utils/getPieceWidth';

const layerStyles: CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
};

function getItemStyles(clientOffset: { x: number; y: number } | null): CSSProperties {
  if (!clientOffset) return { display: 'none' };
  const { x, y } = clientOffset;
  return {
    transform: `translate(${x}px, ${y}px)`,
  };
}

const pieceImageMap = {
  A: '/piece_pig_A.png',
  B: '/piece_pig_B.png',
} as const;

export default function CustomDragLayer() {
  const {
    isDragging,
    item,
    clientOffset,
  } = useDragLayer((monitor) => ({
    item: monitor.getItem() as GamePieceInfo,
    isDragging: monitor.isDragging(),
    clientOffset: monitor.getClientOffset(),
  }));


  if (!isDragging || !item) return null;

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(clientOffset)}>
        <img
          src={pieceImageMap[item.owner]}
          style={{
            width: getPieceWidth(item.size),
            opacity: 0.8,
          }}
          alt=""
          draggable={false}
        />
      </div>
    </div>
  );
}



