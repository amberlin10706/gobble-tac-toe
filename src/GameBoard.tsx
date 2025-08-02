import PieceSet from "./PieceSet";
import BoardCell from "./BoardCell";
import { GamePieceOwner, GamePieceInfo, GamePieceSize } from "./GamePiece";
import React, { useState } from "react";
import GameHeader from "./GameHeader";
import confetti from "canvas-confetti";

export default function GameBoard() {
  const [cells, setCells] = useState<GamePieceInfo[][]>(() =>
    Array.from({ length: 9 }, () => []),
  );

  const [A, setA] = useState(() =>
    Array.from({ length: 6 }, (_, i) =>
      generateInitPiece((i + 1) as GamePieceSize, "A"),
    ),
  );
  const [B, setB] = useState(() =>
    Array.from({ length: 6 }, (_, i) =>
      generateInitPiece((i + 1) as GamePieceSize, "B"),
    ),
  );

  const [currentPlayer, setCurrentPlayer] = useState<GamePieceOwner>("A");

  const onDropPiece = (item: GamePieceInfo, cellIndex: number) => {
    const lastPieceOfSelectedCell =
      cells[cellIndex][cells[cellIndex].length - 1];
    if (lastPieceOfSelectedCell && lastPieceOfSelectedCell.size >= item.size)
      return;

    setCells((prev) => {
      return prev.map((cell, index) => {
        if (item.inUse !== null) {
          // remove the piece from the cell it was in
          if (index === item.inUse) {
            return cell.filter(
              (piece) => piece.size !== item.size || piece.owner !== item.owner,
            );
          }
        }

        if (index === cellIndex) {
          // Add the piece to the current cell
          return cell.concat({ ...item, inUse: cellIndex });
        }
        return cell;
      });
    });

    const setAOrB = item.owner === "A" ? setA : setB;
    setAOrB((prev) => {
      return prev.map((piece) => {
        if (piece.size === item.size) {
          return { ...piece, inUse: cellIndex };
        }
        return piece;
      });
    });

    if (currentPlayer === "A") {
      setCurrentPlayer("B");
    } else {
      setCurrentPlayer("A");
    }
  };

  const winner = calculateWinner(
    cells.map((cell) => cell[cell.length - 1]?.owner),
  );
  if (winner) {
    confetti({
      particleCount: 100, // 總共要噴幾顆紙屑
      spread: 200, // 散開的範圍角度
      angle: winner === "A" ? 90 : 270, // 噴射角度
      origin: { y: 0.5 }, // 發射起點，y 越小越靠近畫面上方
      startVelocity: 10, // 初速度（預設是 45），越小飛得越慢
      gravity: 0.3, // 重力（預設是 1），越小飄越久、越慢掉下來
      ticks: 200, // 每顆粒子存活的幀數，預設約 200，越高越持久
      decay: 0.95, // 衰減率，1 是永遠不減速，越接近 1 飄越久
    });
  }

  function resetGame() {
    setCells(Array.from({ length: 9 }, () => []));
    setA(
      Array.from({ length: 6 }, (_, i) =>
        generateInitPiece((i + 1) as GamePieceSize, "A"),
      ),
    );
    setB(
      Array.from({ length: 6 }, (_, i) =>
        generateInitPiece((i + 1) as GamePieceSize, "B"),
      ),
    );
    setCurrentPlayer("A");
  }

  return (
    <div className="max-w-screen-lg mx-auto p-2 md:pt-5">
      <GameHeader
        winner={winner}
        currentPlayer={currentPlayer}
        resetGame={resetGame}
      />

      <div className="flex flex-col gap-y-4 bg-red-200 mt-3">
        <div className="bg-orange-50">
          <PieceSet
            pieces={A}
            disabledDrop={currentPlayer !== "A"}
            winner={winner}
            isMyTurn={currentPlayer === "A"}
          />
        </div>

        <div className="w-full h-[calc(100vh-300px)]">
          <div className="grid grid-cols-3 grid-rows-3 w-full h-full border">
            {cells.map((cell, cellIndex) => (
              <BoardCell
                key={cellIndex}
                piece={cell[cell.length - 1] || null}
                currentPlayer={currentPlayer}
                onDropPiece={(item) => onDropPiece(item, cellIndex)}
                winner={winner}
              />
            ))}
          </div>
        </div>

        <div className="bg-blue-50">
          <PieceSet
            pieces={B}
            disabledDrop={currentPlayer !== "B"}
            winner={winner}
            isMyTurn={currentPlayer === "B"}
          />
        </div>
      </div>
    </div>
  );
}

function generateInitPiece(
  size: GamePieceSize,
  owner: GamePieceOwner,
): GamePieceInfo {
  return {
    size: size,
    owner: owner,
    inUse: null,
  };
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
