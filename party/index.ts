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

type WsAttachment = { connId: string; role: GamePieceOwner | "waiting" | "spectator" | null };

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
  game: GameState = initialGameState();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<GameState>("game");
      if (stored) this.game = stored;
    });
  }

  // Derive connected players from live WebSocket attachments (survives hibernation)
  getActiveSockets(): { ws: WebSocket; att: WsAttachment }[] {
    return this.ctx.getWebSockets().map((ws) => ({
      ws,
      att: ws.deserializeAttachment() as WsAttachment,
    }));
  }

  getPlayersInfo(): { A: boolean; B: boolean } {
    const sockets = this.getActiveSockets();
    return {
      A: sockets.some((s) => s.att.role === "A"),
      B: sockets.some((s) => s.att.role === "B"),
    };
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

    // Count players with real roles already connected
    const activeSockets = this.getActiveSockets();
    const hasA = activeSockets.some((s) => s.att?.role === "A");
    const hasB = activeSockets.some((s) => s.att?.role === "B");

    if (!hasA && !hasB) {
      // First player — wait for second
      server.serializeAttachment({ connId, role: "waiting" } as WsAttachment);
      this.sendTo(server, { type: "assigned", role: "waiting" });
      this.sendTo(server, { type: "state", state: this.game, playersInfo: this.getPlayersInfo() });
    } else if (!hasA || !hasB) {
      // Second player — assign roles to both
      const missingRole: GamePieceOwner = !hasA ? "A" : "B";
      const existingRole: GamePieceOwner = !hasA ? "B" : "A";

      server.serializeAttachment({ connId, role: missingRole } as WsAttachment);

      // Update the waiting player's role
      const waitingWs = activeSockets.find((s) => s.att?.role === "waiting" || s.att?.role === existingRole);
      if (waitingWs && waitingWs.att.role === "waiting") {
        waitingWs.ws.serializeAttachment({ ...waitingWs.att, role: existingRole } as WsAttachment);
        this.sendTo(waitingWs.ws, { type: "assigned", role: existingRole });
      }

      this.sendTo(server, { type: "assigned", role: missingRole });
      this.broadcastState();
    } else {
      // Room full
      server.serializeAttachment({ connId, role: "spectator" } as WsAttachment);
      this.sendTo(server, { type: "assigned", role: "spectator" });
      this.sendTo(server, { type: "state", state: this.game, playersInfo: this.getPlayersInfo() });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    const att = ws.deserializeAttachment() as WsAttachment;
    const role = att?.role;

    const msg = JSON.parse(message) as ClientMessage;

    if (msg.type === "ready") {
      if (role !== "A" && role !== "B") return;

      const activeSockets = this.getActiveSockets();
      const readySet = new Set<GamePieceOwner>();
      // Mark this socket as ready via attachment
      ws.serializeAttachment({ ...att, ready: true } as WsAttachment & { ready?: boolean });
      activeSockets.forEach((s) => {
        const a = s.ws.deserializeAttachment() as WsAttachment & { ready?: boolean };
        if (a?.ready && (a.role === "A" || a.role === "B")) readySet.add(a.role);
      });
      // Include current ws
      if (role === "A" || role === "B") readySet.add(role);

      const readyA = readySet.has("A");
      const readyB = readySet.has("B");
      const bothReady = readyA && readyB;

      this.game = { ...this.game, readyA, readyB, phase: bothReady ? "playing" : "waiting" };
      await this.ctx.storage.put("game", this.game);
      this.broadcastState();
    }

    if (msg.type === "drop") {
      if (role !== "A" && role !== "B") return;
      if (role !== msg.item.owner) return;

      const newState = applyDrop(this.game, msg.item, msg.cellIndex);
      if (!newState) return;

      this.game = newState;
      await this.ctx.storage.put("game", this.game);
      this.broadcastState();
    }

    if (msg.type === "reset") {
      if (role !== "A" && role !== "B") return;

      // Clear ready flags on all sockets
      this.getActiveSockets().forEach(({ ws: s, att: a }) => {
        s.serializeAttachment({ ...a, ready: false } as WsAttachment & { ready?: boolean });
      });
      ws.serializeAttachment({ ...att, ready: true } as WsAttachment & { ready?: boolean });

      const readyA = role === "A";
      const readyB = role === "B";
      this.game = { ...initialGameState(), readyA, readyB, restartedBy: role };
      await this.ctx.storage.put("game", this.game);
      this.broadcastState();
    }
  }

  async webSocketClose(ws: WebSocket) {
    const att = ws.deserializeAttachment() as WsAttachment;
    if (att?.role === "A" || att?.role === "B") {
      // Reset game when a player leaves
      this.game = { ...this.game, phase: "waiting", readyA: false, readyB: false };
      await this.ctx.storage.put("game", this.game);

      // Clear ready flags on remaining sockets
      this.getActiveSockets().forEach(({ ws: s, att: a }) => {
        if (s !== ws) s.serializeAttachment({ ...a, ready: false });
      });
    }
    this.broadcastState();
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    const roomId = parts[2] || "default";

    const id = env.GAME_ROOM.idFromName(roomId);
    const stub = env.GAME_ROOM.get(id);
    return stub.fetch(request);
  },
};
