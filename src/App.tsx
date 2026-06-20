import CustomDragLayer from "./CustomDragLayer";
import GameBoard from "./GameBoard";
import Lobby from "./Lobby";
import { DndProvider } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
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

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      {roomId ? (
        <>
          <GameBoard roomId={roomId} onLeave={leaveRoom} />
          <CustomDragLayer />
        </>
      ) : (
        <Lobby onJoin={joinRoom} />
      )}
    </DndProvider>
  );
}

export default App;
