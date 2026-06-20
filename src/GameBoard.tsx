import PieceSet from "./PieceSet";
import BoardCell from "./BoardCell";
import { GamePieceOwner, GamePieceInfo, GamePieceSize } from "./GamePiece";
import React, { useState, useEffect, useRef } from "react";
import GameHeader from "./GameHeader";
import RainOverlay from "./RainOverlay";
import confetti from "canvas-confetti";

type GamePhase = "waiting" | "playing";

type GameState = {
  cells: GamePieceInfo[][];
  piecesA: GamePieceInfo[];
  piecesB: GamePieceInfo[];
  currentPlayer: GamePieceOwner;
  winner: GamePieceOwner | null;
  phase: GamePhase;
  readyA: boolean;
  readyB: boolean;
  restartedBy: "A" | "B" | null;
};

type ServerMessage =
  | { type: "assigned"; role: GamePieceOwner | "waiting" | "spectator" }
  | { type: "state"; state: GameState; playersInfo: { A: boolean; B: boolean } }
  | { type: "error"; message: string };

interface GameBoardProps {
  roomId: string;
  onLeave: () => void;
}

export default function GameBoard({ roomId, onLeave }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState>({
    cells: Array.from({ length: 9 }, () => []),
    piecesA: Array.from({ length: 6 }, (_, i) =>
      generateInitPiece((i + 1) as GamePieceSize, "A"),
    ),
    piecesB: Array.from({ length: 6 }, (_, i) =>
      generateInitPiece((i + 1) as GamePieceSize, "B"),
    ),
    currentPlayer: "A",
    winner: null,
    phase: "waiting",
    readyA: false,
    readyB: false,
    restartedBy: null,
  });
  const [myRole, setMyRole] = useState<
    GamePieceOwner | "waiting" | "spectator" | null
  >(null);
  const [showRain, setShowRain] = useState(false);
  const confettiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playersInfo, setPlayersInfo] = useState<{ A: boolean; B: boolean }>({
    A: false,
    B: false,
  });
  const [copied, setCopied] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const prevWinnerRef = useRef<GamePieceOwner | null>(null);

  useEffect(() => {
    const host = import.meta.env.VITE_WORKER_HOST || "localhost:8787";
    const protocol = host.startsWith("localhost") ? "ws" : "wss";
    const socket = new WebSocket(`${protocol}://${host}/room/${roomId}`);
    socketRef.current = socket;

    socket.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data) as ServerMessage;
      if (msg.type === "assigned") {
        setMyRole(msg.role);
      } else if (msg.type === "state") {
        setGameState(msg.state);
        setPlayersInfo(msg.playersInfo);
      }
    });

    return () => socket.close();
  }, [roomId]);

  useEffect(() => {
    if (gameState.winner && gameState.winner !== prevWinnerRef.current) {
      prevWinnerRef.current = gameState.winner;
      const iWon = gameState.winner === myRole;
      if (iWon) {
        const fire = () => confetti({
          particleCount: 60,
          spread: 200,
          angle: 90,
          origin: { y: 0.8 },
          startVelocity: 30,
          gravity: 0.4,
          ticks: 250,
          decay: 0.95,
        });
        fire();
        confettiIntervalRef.current = setInterval(fire, 800);
        setTimeout(() => {
          if (confettiIntervalRef.current) clearInterval(confettiIntervalRef.current);
        }, 5000);
      } else {
        setShowRain(true);
        setTimeout(() => setShowRain(false), 5000);
      }
    }
    if (!gameState.winner) {
      prevWinnerRef.current = null;
      if (confettiIntervalRef.current) clearInterval(confettiIntervalRef.current);
      setShowRain(false);
    }
  }, [gameState.winner, myRole]);

  const sendReady = () => {
    if (!socketRef.current) return;
    socketRef.current.send(JSON.stringify({ type: "ready" }));
  };

  const onDropPiece = (item: GamePieceInfo, cellIndex: number) => {
    if (!socketRef.current || myRole !== item.owner) return;
    socketRef.current.send(JSON.stringify({ type: "drop", item, cellIndex }));
  };

  const resetGame = () => {
    if (!socketRef.current) return;
    socketRef.current.send(JSON.stringify({ type: "reset" }));
  };

  const copyRoomUrl = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const {
    cells,
    piecesA,
    piecesB,
    currentPlayer,
    winner,
    phase,
    readyA,
    readyB,
    restartedBy,
  } = gameState;
  const myReady = myRole === "A" ? readyA : myRole === "B" ? readyB : false;
  // Invitation popup: opponent restarted and I haven't accepted yet
  const showRestartInvite =
    (myRole === "A" || myRole === "B") &&
    restartedBy !== null &&
    restartedBy !== myRole &&
    phase === "waiting" &&
    !myReady;
  const opponentRole: GamePieceOwner | null =
    myRole === "A" ? "B" : myRole === "B" ? "A" : null;
  const bothConnected = playersInfo.A && playersInfo.B;

  // My pieces go at bottom, opponent at top
  const myPieces =
    myRole === "A" ? piecesA : myRole === "B" ? piecesB : piecesA;
  const opponentPieces =
    myRole === "A" ? piecesB : myRole === "B" ? piecesA : piecesB;
  const myActualRole: GamePieceOwner =
    myRole === "A" || myRole === "B" ? myRole : "A";
  const opponentActualRole: GamePieceOwner = opponentRole ?? "B";

  const showReadyModal =
    (myRole === "A" || myRole === "B") && bothConnected && phase === "waiting";
  const showFullModal = myRole === "spectator";

  return (
    <div className="max-w-screen-lg mx-auto p-2 md:pt-5 h-screen flex flex-col overflow-hidden">
      <RainOverlay active={showRain} />
      <GameHeader resetGame={resetGame} onHome={onLeave} />

      <div className="flex justify-between items-center text-sm text-gray-500 mb-1 px-1">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold tracking-widest text-gray-700">
            房間：{roomId}
          </span>
          <button
            className="text-xs text-blue-400 underline cursor-pointer"
            onClick={copyRoomUrl}
          >
            {copied ? "已複製連結！" : "複製連結"}
          </button>
        </div>
        <div className="flex items-center gap-3">
          {(myRole === "A" || myRole === "B") && (
            <span className="flex items-center gap-1">
              你是
              <img
                src={`/piece_pig_${myRole}.png`}
                alt={myRole}
                className="inline w-5 h-5"
              />
            </span>
          )}
          {myRole === "waiting" && (
            <span className="text-orange-400">等待對手加入…</span>
          )}
          {phase === "playing" && !winner && (
            <span className="flex items-center gap-1 font-semibold">
              {currentPlayer === myRole ? (
                <span className="text-green-600">你的回合</span>
              ) : (
                <span className="text-gray-500">對手回合</span>
              )}
              <img
                src={`/piece_pig_${currentPlayer}.png`}
                alt={currentPlayer}
                className="inline w-5 h-5"
              />
            </span>
          )}
          {winner && (
            <span className="flex items-center gap-1 font-bold">
              {winner === myRole ? (
                <span className="text-yellow-500">🎉 你贏了！</span>
              ) : (
                <span className="text-gray-500">對手獲勝</span>
              )}
              <img
                src={`/piece_pig_${winner}.png`}
                alt={winner}
                className="inline w-5 h-5"
              />
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-y-4 mt-3 flex-1 min-h-0">
        {/* Opponent pieces — top */}
        <div
          className={opponentActualRole === "A" ? "bg-orange-50" : "bg-blue-50"}
        >
          <PieceSet
            pieces={opponentPieces}
            disabledDrop={true}
            winner={winner}
          />
        </div>

        <div className="flex-1 min-h-0 flex justify-center">
          <div className="h-full aspect-square">
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
        </div>

        {/* My pieces — bottom */}
        <div className={myActualRole === "A" ? "bg-orange-50" : "bg-blue-50"}>
          <PieceSet
            pieces={myPieces}
            disabledDrop={
              !!winner ||
              phase !== "playing" ||
              currentPlayer !== myActualRole ||
              !bothConnected
            }
            winner={winner}
          />
        </div>
      </div>

      {/* Ready modal */}
      {showReadyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[340px] p-6 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-center">對手已加入！</h2>

            <div className="text-sm text-gray-600">
              <p className="font-semibold mb-1">
                你是
                <img
                  src={`/piece_pig_${myRole}.png`}
                  alt={myRole as string}
                  className="inline w-6 mx-1"
                />
                {myRole === "A" ? "（橘色，先手）" : "（藍色，後手）"}
              </p>
            </div>

            <details className="text-sm text-gray-700 border rounded-lg p-3">
              <summary className="cursor-pointer font-semibold">
                📘 How to Play
              </summary>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>玩家輪流出手，橘色旗子先。</li>
                <li>每次只能拖動自己的旗子。</li>
                <li>旗子只能放在空格上或比自己小的旗子上。</li>
                <li>最先連線者獲勝！</li>
              </ul>
            </details>

            {myReady ? (
              <p className="text-center text-orange-400 font-medium">
                {restartedBy === myRole ? "等待對方接受…" : "等待對方準備…"}
              </p>
            ) : (
              <button
                className="w-full py-3 bg-green-400 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition cursor-pointer"
                onClick={sendReady}
              >
                開始遊戲
              </button>
            )}
          </div>
        </div>
      )}

      {/* Restart invite modal */}
      {showRestartInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[300px] p-6 flex flex-col gap-4 text-center">
            <h2 className="text-xl font-bold">對方邀請你重新開始！</h2>
            <p className="text-gray-500 text-sm">要接受邀請並開始新一局嗎？</p>
            <button
              className="w-full py-3 bg-green-400 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition cursor-pointer"
              onClick={sendReady}
            >
              接受並開始
            </button>
          </div>
        </div>
      )}

      {/* Room full modal */}
      {showFullModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[300px] p-6 flex flex-col gap-4 text-center">
            <h2 className="text-xl font-bold">此房間人數已滿</h2>
            <p className="text-gray-500 text-sm">
              房間已有兩名玩家，請建立新房間或等待有人離開。
            </p>
            <button
              className="w-full py-3 bg-blue-400 hover:bg-blue-500 text-white rounded-xl font-bold transition cursor-pointer"
              onClick={onLeave}
            >
              返回大廳
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function generateInitPiece(
  size: GamePieceSize,
  owner: GamePieceOwner,
): GamePieceInfo {
  return { size, owner, inUse: null };
}
