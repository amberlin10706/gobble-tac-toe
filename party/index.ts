import type * as Party from "partykit/server";

export type GamePieceOwner = "A" | "B";
export type GamePieceSize = 1 | 2 | 3 | 4 | 5 | 6;

export type GamePieceInfo = {
  owner: GamePieceOwner;
  size: GamePieceSize;
  inUse: number | null;
};

export type GamePhase = "waiting" | "playing";

type GameState = {
  cells: GamePieceInfo[][];
  piecesA: GamePieceInfo[];
  piecesB: GamePieceInfo[];
  currentPlayer: GamePieceOwner;
  winner: GamePieceOwner | null;
  phase: GamePhase;
};

type ClientMessage =
  | { type: "ready" }
  | { type: "drop"; item: GamePieceInfo; cellIndex: number }
  | { type: "reset" };

export type ServerMessage =
  | { type: "assigned"; role: GamePieceOwner | "waiting" | "spectator" }
  | { type: "state"; state: GameState; playersInfo: { A: boolean; B: boolean } }
  | { type: "error"; message: string };

function generateInitPiece(size: GamePieceSize, owner: GamePieceOwner): GamePieceInfo {
  return { size, owner, inUse: null };
}

function initialGameState(): GameState {
  return {
    cells: Array.from({ length: 9 }, () => []),
    piecesA: Array.from({ length: 6 }, (_, i) => generateInitPiece((i + 1) as GamePieceSize, "A")),
    piecesB: Array.from({ length: 6 }, (_, i) => generateInitPiece((i + 1) as GamePieceSize, "B")),
    currentPlayer: "A",
    winner: null,
    phase: "waiting",
  };
}

function calculateWinner(squares: (GamePieceOwner | undefined)[]): GamePieceOwner | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a] as GamePieceOwner;
    }
  }
  return null;
}

function applyDrop(state: GameState, item: GamePieceInfo, cellIndex: number): GameState | null {
  if (state.winner || state.phase !== "playing") return null;
  if (state.currentPlayer !== item.owner) return null;

  const lastPiece = state.cells[cellIndex][state.cells[cellIndex].length - 1];
  if (lastPiece && lastPiece.size >= item.size) return null;

  const newCells = state.cells.map((cell, index) => {
    let updated = cell;
    if (item.inUse !== null && index === item.inUse) {
      updated = cell.filter((p) => !(p.size === item.size && p.owner === item.owner));
    }
    if (index === cellIndex) {
      updated = updated.concat({ ...item, inUse: cellIndex });
    }
    return updated;
  });

  const updatePieces = (pieces: GamePieceInfo[]) =>
    pieces.map((p) => (p.size === item.size && p.owner === item.owner ? { ...p, inUse: cellIndex } : p));

  const newPiecesA = item.owner === "A" ? updatePieces(state.piecesA) : state.piecesA;
  const newPiecesB = item.owner === "B" ? updatePieces(state.piecesB) : state.piecesB;
  const winner = calculateWinner(newCells.map((cell) => cell[cell.length - 1]?.owner));

  return {
    cells: newCells,
    piecesA: newPiecesA,
    piecesB: newPiecesB,
    currentPlayer: item.owner === "A" ? "B" : "A",
    winner,
    phase: "playing",
  };
}

export default class GameRoom implements Party.Server {
  // Two player slots (arrival order), role map, ready set, connection map
  slots: [string | null, string | null] = [null, null];
  roleMap: Record<string, GamePieceOwner> = {};
  readySet: Set<string> = new Set();
  connMap: Map<string, Party.Connection> = new Map();
  game: GameState = initialGameState();

  constructor(readonly room: Party.Room) {}

  getPlayersInfo() {
    const aId = Object.entries(this.roleMap).find(([, r]) => r === "A")?.[0];
    const bId = Object.entries(this.roleMap).find(([, r]) => r === "B")?.[0];
    return { A: !!aId, B: !!bId };
  }

  broadcastState() {
    const msg: ServerMessage = { type: "state", state: this.game, playersInfo: this.getPlayersInfo() };
    this.room.broadcast(JSON.stringify(msg));
  }

  sendTo(connId: string, msg: ServerMessage) {
    this.connMap.get(connId)?.send(JSON.stringify(msg));
  }

  onConnect(conn: Party.Connection) {
    this.connMap.set(conn.id, conn);

    if (!this.slots[0]) {
      // First player — role TBD until opponent joins
      this.slots[0] = conn.id;
      this.sendTo(conn.id, { type: "assigned", role: "waiting" });
      this.sendTo(conn.id, { type: "state", state: this.game, playersInfo: this.getPlayersInfo() });
    } else if (!this.slots[1]) {
      // Second player — randomly assign A/B now
      this.slots[1] = conn.id;

      const firstGetsA = Math.random() < 0.5;
      this.roleMap[this.slots[0]] = firstGetsA ? "A" : "B";
      this.roleMap[this.slots[1]] = firstGetsA ? "B" : "A";

      // Notify both of their roles
      this.sendTo(this.slots[0], { type: "assigned", role: this.roleMap[this.slots[0]] });
      this.sendTo(this.slots[1], { type: "assigned", role: this.roleMap[this.slots[1]] });

      // Broadcast updated state (both players now connected)
      this.broadcastState();
    } else {
      // Spectator
      this.sendTo(conn.id, { type: "assigned", role: "spectator" });
      this.sendTo(conn.id, { type: "state", state: this.game, playersInfo: this.getPlayersInfo() });
    }
  }

  onClose(conn: Party.Connection) {
    this.connMap.delete(conn.id);

    const slotIdx = this.slots.indexOf(conn.id);
    if (slotIdx !== -1) {
      this.slots[slotIdx] = null;
      delete this.roleMap[conn.id];
      this.readySet.delete(conn.id);

      // Reset game back to waiting when a player leaves
      this.game = { ...this.game, phase: "waiting" };
      this.readySet.clear();
    }

    this.broadcastState();
  }

  onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message) as ClientMessage;
    const role = this.roleMap[sender.id];

    if (msg.type === "ready") {
      if (!role) return;
      this.readySet.add(sender.id);

      const bothReady = this.slots.every((id) => id && this.readySet.has(id));
      if (bothReady) {
        this.game = { ...this.game, phase: "playing" };
      }
      this.broadcastState();
    }

    if (msg.type === "drop") {
      if (!role || this.game.phase !== "playing") return;
      if (role !== msg.item.owner) return;

      const newState = applyDrop(this.game, msg.item, msg.cellIndex);
      if (!newState) return;

      this.game = newState;
      this.broadcastState();
    }

    if (msg.type === "reset") {
      if (!role) return;
      this.game = initialGameState();
      this.readySet.clear();
      this.broadcastState();
    }
  }
}

GameRoom satisfies Party.Worker;
