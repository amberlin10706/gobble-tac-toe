import PieceSet from './PieceSet';
import BoardCell from './BoardCell';
import GamePiece, {GamePieceOwner, GamePieceInfo, GamePieceSize} from './GamePiece';
import {useState} from 'react';

interface GameBoardProps {
}

export default function GameBoard() {
  const [cells, setCells] = useState<GamePieceInfo[][]>(() => Array.from({ length: 9 }, () => []));

  const [A, setA] = useState(() => Array.from({ length: 6 }, (_, i) => generateInitPiece((i + 1) as GamePieceSize, 'A')));
  const [B, setB] = useState(() => Array.from({ length: 6 }, (_, i) => generateInitPiece((i + 1) as GamePieceSize, 'B')));

  const [currentPlayer, setCurrentPlayer] = useState<GamePieceOwner>('A')

  const onDropPiece = (item: GamePieceInfo, cellIndex: number)=> {
    const lastPieceOfSelectedCell = cells[cellIndex][cells[cellIndex].length - 1];
    if (lastPieceOfSelectedCell && lastPieceOfSelectedCell.size >= item.size) return;

    setCells(prev => {
      return prev.map((cell, index) => {

        if (item.inUse !== null) {
          // remove the piece from the cell it was in
          if (index === item.inUse) {
            return cell.filter(piece => piece.size !== item.size || piece.owner !== item.owner);
          }
        }

        if (index === cellIndex) {
          // Add the piece to the current cell
          return cell.concat({ ...item, inUse: cellIndex });
        }
        return cell;
      })
    });

    const setAOrB = item.owner === 'A' ? setA : setB;
    setAOrB(prev => {
      return prev.map((piece) => {
        if (piece.size === item.size) {
          return { ...piece, inUse: cellIndex };
        }
        return piece;
      })
    })

    if (currentPlayer === 'A') {
      setCurrentPlayer('B');
    } else {
      setCurrentPlayer('A');
    }
  }

  const winner = calculateWinner(cells.map((cell) => cell[cell.length - 1]?.owner));
  function resetGame() {
    setCells(Array.from({ length: 9 }, () => []));
    setA(Array.from({ length: 6 }, (_, i) => generateInitPiece((i + 1) as GamePieceSize, 'A')));
    setB(Array.from({ length: 6 }, (_, i) => generateInitPiece((i + 1) as GamePieceSize, 'B')));
    setCurrentPlayer('A');
  }

  return (
    <div className=" max-w-screen-xl mx-auto p-4 flex gap-x-4 gap-y-10 pt-10">
      <div className="flex-[1] border">
        <PieceSet pieces={A} disabledDrop={currentPlayer !== 'A'} />
      </div>

      <div className="flex-[3] flex flex-col justify-center">
        <div className="mb-4 flex justify-center items-center gap-x-1">
          <div className="text-2xl font-bold">
            {winner ? 'Winner is' : 'Current Player'}
          </div>
          <img
            src={`/piece_pig_${winner || currentPlayer}.png`}
            alt={`piece_${winner || currentPlayer}`}
            draggable="false"
            style={{ width: '50px' }}
          />
          {
            winner && (
              <button className="bg-blue-600 text-white rounded px-2 py-1 cursor-pointer" onClick={resetGame}>
                Reset Game
              </button>
            )
          }
        </div>
        <div className="grid grid-cols-3 w-full border">
          {
            cells.map((cell, cellIndex) => (
              <BoardCell
                key={cellIndex}
                piece={cell[cell.length - 1] || null}
                currentPlayer={currentPlayer}
                onDropPiece={(item) => onDropPiece(item, cellIndex)}
              />
            ))
          }
        </div>
      </div>

      <div className="flex-[1] border">
        <PieceSet pieces={B} disabledDrop={currentPlayer !== 'B'}/>
      </div>
    </div>
  );
}

function generateInitPiece(size: GamePieceSize, owner: GamePieceOwner): GamePieceInfo {
  return {
    size: size,
    owner: owner,
    inUse: null,
  }
}

function calculateWinner(squares: (GamePieceOwner | undefined)[]) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}
