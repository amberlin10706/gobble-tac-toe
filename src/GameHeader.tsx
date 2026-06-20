import React from "react";
import { GamePieceOwner } from "./GamePiece";
import GameRules from "./GameRules";

interface GameHeaderProps {
  resetGame: () => void;
  onHome: () => void;
}

export default function GameHeader({ resetGame, onHome }: GameHeaderProps) {
  return (
    <div>
      <div className="flex justify-center items-center gap-x-2 mb-2">
        <button
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded cursor-pointer font-bold"
          onClick={onHome}
        >
          🏠 首頁
        </button>
        <GameRules />
        <button
          className="px-4 py-2 bg-blue-400 hover:bg-blue-500 rounded cursor-pointer font-bold"
          onClick={resetGame}
        >
          Reset Game
        </button>
      </div>
      {/*<div class`Name="flex justify-center items-center gap-x-1">*/}
      {/*  <div className="text-2xl font-bold">*/}
      {/*    {winner ? "Winner is" : "Current Player"}*/}
      {/*  </div>*/}
      {/*  <img*/}
      {/*    src={`/piece_pig_${winner || currentPlayer}.png`}*/}
      {/*    alt={`piece_${winner || currentPlayer}`}*/}
      {/*    draggable="false"*/}
      {/*    style={{ width: "50px" }}*/}
      {/*  />*/}
      {/*</div>*/}
    </div>
  );
}
