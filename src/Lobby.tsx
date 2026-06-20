import React, { useState } from "react";

interface LobbyProps {
  onJoin: (roomId: string) => void;
}

function randomRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function Lobby({ onJoin }: LobbyProps) {
  const [joinId, setJoinId] = useState("");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-3xl font-bold">Gobble Tac Toe</h1>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <button
          className="w-full py-3 bg-orange-400 text-white rounded-xl text-lg font-semibold hover:bg-orange-500 transition"
          onClick={() => onJoin(randomRoomId())}
        >
          建立新房間
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <p className="text-gray-500">或輸入房間碼加入</p>
        <input
          className="w-full border rounded-xl px-4 py-3 text-center text-xl tracking-widest uppercase"
          maxLength={6}
          placeholder="XXXXXX"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value.toUpperCase())}
        />
        <button
          className="w-full py-3 bg-blue-400 text-white rounded-xl text-lg font-semibold hover:bg-blue-500 transition disabled:opacity-40"
          disabled={joinId.length < 4}
          onClick={() => onJoin(joinId)}
        >
          加入房間
        </button>
      </div>
    </div>
  );
}
