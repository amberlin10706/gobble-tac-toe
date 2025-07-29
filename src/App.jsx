import CustomDragLayer from "./CustomDragLayer.js";
import GameBoard from "./GameBoard.js";
import { DndProvider } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";

function App() {
  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <GameBoard />
      <CustomDragLayer />
    </DndProvider>
  );
}

export default App;
