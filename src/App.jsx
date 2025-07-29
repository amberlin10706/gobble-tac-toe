import GameBoard from "./GameBoard.js";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <GameBoard />
    </DndProvider>
  )
}

export default App
