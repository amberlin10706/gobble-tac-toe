import GameBoard from "./GameBoard";
import Lobby from "./Lobby";
import { useState } from "react";

function getRoomFromUrl() {
  return new URLSearchParams(window.location.search).get("room");
}

function App() {
  const [roomId, setRoomId] = useState<string | null>(getRoomFromUrl);

  const joinRoom = (id: string) => {
    setRoomId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("room", id);
    window.history.pushState({}, "", url);
  };

  const leaveRoom = () => {
    setRoomId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.pushState({}, "", url);
  };

  return roomId ? (
    <GameBoard roomId={roomId} onLeave={leaveRoom} />
  ) : (
    <Lobby onJoin={joinRoom} />
  );
}

export default App;
