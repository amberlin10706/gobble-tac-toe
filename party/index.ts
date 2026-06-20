import { DurableObject } from "cloudflare:workers";

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
  readyA: boolean;
  readyB: boolean;
  restartedBy: GamePieceOwner | null;
};

type ClientMessage =
  | { type: "ready" }
  | { type: "drop"; item: GamePieceInfo; cellIndex: number }
  | { type: "reset" };

export type ServerMessage =
  | { type: "assigned"; role: GamePieceOwner | "waiting" | "spectator" }
  | { type: "state"; state: GameState; playersInfo: { A: boolean; B: boolean } }
  | { type: "error"; message: string };

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
}

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
    readyA: false,
    readyB: false,
    restartedBy: null,
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
    ...state,
    cells: newCells,
    piecesA: newPiecesA,
    piecesB: newPiecesB,
    currentPlayer: (item.owner === "A" ? "B" : "A") as GamePieceOwner,
    winner,
    phase: "playing" as GamePhase,
  };
}

export class GameRoom extends DurableObject<Env> {
  slots: [string | null, string | null] = [null, null];
  roleMap: Record<string, GamePieceOwner> = {};
  readySet: Set<string> = new Set();
  game: GameState = initialGameState();

  getPlayersInfo() {
    const aId = Object.entries(this.roleMap).find(([, r]) => r === "A")?.[0];
    const bId = Object.entries(this.roleMap).find(([, r]) => r === "B")?.[0];
    return { A: !!aId, B: !!bId };
  }

  broadcastState() {
    const msg: ServerMessage = { type: "state", state: this.game, playersInfo: this.getPlayersInfo() };
    this.ctx.getWebSockets().forEach((ws) => ws.send(JSON.stringify(msg)));
  }

  sendTo(ws: WebSocket, msg: ServerMessage) {
    ws.send(JSON.stringify(msg));
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);

    const connId = crypto.randomUUID();
    server.serializeAttachment({ connId });

    if (!this.slots[0]) {
      this.slots[0] = connId;
      this.sendTo(server, { type: "assigned", role: "waiting" });
      this.sendTo(server, { type: "state", state: this.game, playersInfo: this.getPlayersInfo() });
    } else if (!this.slots[1]) {
      this.slots[1] = connId;

      const firstGetsA = Math.random() < 0.5;
      this.roleMap[this.slots[0]] = firstGetsA ? "A" : "B";
      this.roleMap[connId] = firstGetsA ? "B" : "A";

      // Notify slot[0] of their role
      const ws0 = this.ctx.getWebSockets().find((ws) => {
        const att = ws.deserializeAttachment() as { connId: string };
        return att?.connId === this.slots[0];
      });
      if (ws0) this.sendTo(ws0, { type: "assigned", role: this.roleMap[this.slots[0]] });
      this.sendTo(server, { type: "assigned", role: this.roleMap[connId] });

      this.broadcastState();
    } else {
      this.sendTo(server, { type: "assigned", role: "spectator" });
      this.sendTo(server, { type: "state", state: this.game, playersInfo: this.getPlayersInfo() });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws: WebSocket, message: string) {
    const att = ws.deserializeAttachment() as { connId: string };
    const connId = att?.connId;
    if (!connId) return;

    const msg = JSON.parse(message) as ClientMessage;
    const role = this.roleMap[connId];

    if (msg.type === "ready") {
      if (!role) return;
      this.readySet.add(connId);

      const readyA = !!(this.slots[0] && this.readySet.has(this.slots[0]) && this.roleMap[this.slots[0]] === "A") ||
                     !!(this.slots[1] && this.readySet.has(this.slots[1]) && this.roleMap[this.slots[1]] === "A");
      const readyB = !!(this.slots[0] && this.readySet.has(this.slots[0]) && this.roleMap[this.slots[0]] === "B") ||
                     !!(this.slots[1] && this.readySet.has(this.slots[1]) && this.roleMap[this.slots[1]] === "B");
      const bothReady = this.slots.every((id) => id && this.readySet.has(id));

      this.game = { ...this.game, readyA, readyB, phase: bothReady ? "playing" : "waiting" };
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
      this.readySet.clear();
      this.readySet.add(connId);
      const readyA = role === "A";
      const readyB = role === "B";
      this.game = { ...initialGameState(), readyA, readyB, restartedBy: role };
      this.broadcastState();
    }
  }

  webSocketClose(ws: WebSocket) {
    const att = ws.deserializeAttachment() as { connId: string };
    const connId = att?.connId;
    if (!connId) return;

    const slotIdx = this.slots.indexOf(connId);
    if (slotIdx !== -1) {
      this.slots[slotIdx] = null;
      delete this.roleMap[connId];
      this.readySet.delete(connId);
      this.game = { ...this.game, phase: "waiting" };
      this.readySet.clear();
    }

    this.broadcastState();
  }

  webSocketError(ws: WebSocket) {
    this.webSocketClose(ws);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // URL format: /room/:roomId
    const parts = url.pathname.split("/");
    const roomId = parts[2] || "default";

    const id = env.GAME_ROOM.idFromName(roomId);
    const stub = env.GAME_ROOM.get(id);
    return stub.fetch(request);
  },
};
