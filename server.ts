import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;

interface ClientConnection {
  ws: WebSocket;
  id: string;
  roomId?: string;
  playerRole?: 'p1' | 'p2';
}

interface RoomState {
  id: string;
  p1Connected: boolean;
  p2Connected: boolean;
  gameState: any | null;
  logs: string[];
}

const rooms: Map<string, RoomState> = new Map();
const clients: Map<WebSocket, ClientConnection> = new Map();

function generateId(): string {
  return Math.random().toString(36).substring(2, 8);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/api/ws' });

  // Ping-pong interval to prevent proxy timeouts
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // API Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.2026.08.04', activeRooms: rooms.size });
  });

  // WebSocket connection handler
  wss.on('connection', (ws: any) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    const clientId = generateId();
    const conn: ClientConnection = { ws, id: clientId };
    clients.set(ws, conn);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        const { type, roomId, payload } = data;

        if (type === 'CREATE_ROOM') {
          const newRoomId = (payload?.roomId || generateId()).toUpperCase().trim();
          const newRoom: RoomState = {
            id: newRoomId,
            p1Connected: true,
            p2Connected: false,
            gameState: payload?.initialState || null,
            logs: [`Sala ${newRoomId} criada. Aguardando Jogador 2...`],
          };
          rooms.set(newRoomId, newRoom);
          conn.roomId = newRoomId;
          conn.playerRole = 'p1';

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            payload: {
              roomId: newRoomId,
              playerRole: 'p1',
              gameState: newRoom.gameState,
              p1Connected: true,
              p2Connected: false,
              logs: newRoom.logs,
            }
          }));
        } else if (type === 'JOIN_ROOM') {
          const targetRoomId = (roomId || payload?.roomId || 'SALA1').toUpperCase().trim();
          let room = rooms.get(targetRoomId);

          if (!room) {
            // Room doesn't exist, create it with P1
            room = {
              id: targetRoomId,
              p1Connected: true,
              p2Connected: false,
              gameState: payload?.initialState || null,
              logs: [`Sala ${targetRoomId} criada pelo Jogador 1.`],
            };
            rooms.set(targetRoomId, room);
            conn.roomId = targetRoomId;
            conn.playerRole = 'p1';

            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              payload: {
                roomId: targetRoomId,
                playerRole: 'p1',
                gameState: room.gameState,
                p1Connected: true,
                p2Connected: false,
                logs: room.logs,
              }
            }));
          } else if (!room.p1Connected) {
            // Rejoin or join as Player 1
            room.p1Connected = true;
            conn.roomId = targetRoomId;
            conn.playerRole = 'p1';

            if (payload?.initialState && !room.gameState) {
              room.gameState = payload.initialState;
            }

            room.logs.push('Jogador 1 conectou à sala.');

            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              payload: {
                roomId: targetRoomId,
                playerRole: 'p1',
                gameState: room.gameState,
                p1Connected: true,
                p2Connected: room.p2Connected,
                logs: room.logs,
              }
            }));

            broadcastToRoom(targetRoomId, {
              type: 'PLAYER_JOINED',
              payload: {
                playerRole: 'p1',
                p1Connected: true,
                p2Connected: room.p2Connected,
                gameState: room.gameState,
                logs: room.logs,
              }
            });
          } else if (!room.p2Connected) {
            // Join or rejoin as Player 2
            room.p2Connected = true;
            conn.roomId = targetRoomId;
            conn.playerRole = 'p2';

            if (payload?.initialState && !room.gameState) {
              room.gameState = payload.initialState;
            }

            room.logs.push('Jogador 2 entrou na sala! Partida iniciada.');

            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              payload: {
                roomId: targetRoomId,
                playerRole: 'p2',
                gameState: room.gameState,
                p1Connected: room.p1Connected,
                p2Connected: true,
                logs: room.logs,
              }
            }));

            broadcastToRoom(targetRoomId, {
              type: 'PLAYER_JOINED',
              payload: {
                playerRole: 'p2',
                p1Connected: room.p1Connected,
                p2Connected: true,
                gameState: room.gameState,
                logs: room.logs,
              }
            });
          } else {
            // Re-connecting user who already belongs or room actually full
            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              payload: {
                roomId: targetRoomId,
                playerRole: conn.playerRole || 'p2',
                gameState: room.gameState,
                p1Connected: room.p1Connected,
                p2Connected: room.p2Connected,
                logs: room.logs,
              }
            }));
          }
        } else if (type === 'UPDATE_STATE') {
          const currentRoomId = conn.roomId;
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (room) {
            room.gameState = payload.gameState;
            if (payload.log) {
              room.logs.push(payload.log);
            }
            broadcastToRoom(currentRoomId, {
              type: 'STATE_UPDATED',
              payload: {
                gameState: room.gameState,
                log: payload.log,
                senderRole: conn.playerRole,
              }
            });
          }
        } else if (type === 'SEND_LOG') {
          const currentRoomId = conn.roomId;
          if (currentRoomId) {
            broadcastToRoom(currentRoomId, {
              type: 'LOG_ADDED',
              payload: { log: payload.log }
            });
          }
        }
      } catch (err) {
        console.error('WebSocket error processing message:', err);
      }
    });

    ws.on('close', () => {
      const conn = clients.get(ws);
      if (conn && conn.roomId) {
        const room = rooms.get(conn.roomId);
        if (room) {
          if (conn.playerRole === 'p1') room.p1Connected = false;
          if (conn.playerRole === 'p2') room.p2Connected = false;

          broadcastToRoom(conn.roomId, {
            type: 'PLAYER_LEFT',
            payload: {
              playerRole: conn.playerRole,
              p1Connected: room.p1Connected,
              p2Connected: room.p2Connected,
            }
          });

          if (!room.p1Connected && !room.p2Connected) {
            rooms.delete(conn.roomId);
          }
        }
      }
      clients.delete(ws);
    });
  });

  function broadcastToRoom(roomId: string, message: any) {
    const jsonMsg = JSON.stringify(message);
    for (const [ws, conn] of clients.entries()) {
      if (conn.roomId === roomId && ws.readyState === WebSocket.OPEN) {
        ws.send(jsonMsg);
      }
    }
  }

  // Vite development middleware vs Static Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TI Battleground Server running on http://0.0.0.0:${PORT} [v1.2026.08.04]`);
  });
}

startServer();
