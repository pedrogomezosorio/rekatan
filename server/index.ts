import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  AVATAR_LIST,
  createEmptyResources,
  PLAYER_COLORS,
} from '../src/shared/constants';
import {
  GameAction,
  GameState,
  PlayerColor,
  PlayerState,
} from '../src/shared/types';
import {
  addLog,
  applyGameAction,
  autoResolveCurrentTurn,
  createInitialGameState,
  executeBotStepIfNeeded,
  refreshTurnDeadline,
} from '../src/shared/engine/RulesEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const rooms = new Map<string, GameState>();
const socketToSession = new Map<string, { roomCode: string; playerId: string }>();
const botLastStepTime = new Map<string, number>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const httpServer = createHttpServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Health check / room info endpoint
  app.get('/api/rooms/:code', (req, res) => {
    const code = (req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ exists: false });
      return;
    }
    res.json({
      exists: true,
      roomCode: room.roomCode,
      phase: room.phase,
      playerCount: room.players.length,
      maxPlayers: room.config.maxPlayers,
    });
  });

  io.on('connection', (socket) => {
    socket.on(
      'CREATE_ROOM',
      (payload: {
        playerId: string;
        playerName: string;
        color: PlayerColor;
        avatar: string;
      }) => {
        const roomCode = generateRoomCode();
        const playerId = payload.playerId || `P_${ socket.id }`;
        const gameState = createInitialGameState(roomCode, {
          id: playerId,
          name: (payload.playerName || 'Anfitrión').trim().slice(0, 20),
          color: payload.color || 'RED',
          avatar: payload.avatar || '👑',
        });

        rooms.set(roomCode, gameState);
        socketToSession.set(socket.id, { roomCode, playerId });
        socket.join(roomCode);

        socket.emit('ROOM_JOINED', { roomCode, playerId, state: gameState });
      }
    );

    socket.on(
      'JOIN_ROOM',
      (payload: {
        roomCode: string;
        playerId: string;
        playerName: string;
        color: PlayerColor;
        avatar: string;
      }) => {
        const roomCode = (payload.roomCode || '').trim().toUpperCase();
        const room = rooms.get(roomCode);

        if (!room) {
          socket.emit('ACTION_ERROR', {
            message: `No existe ninguna sala con el código "${roomCode}". Verifica el código.`,
          });
          return;
        }

        const playerId = payload.playerId || `P_${socket.id}`;
        const existingPlayer = room.players.find((p) => p.id === playerId);

        if (existingPlayer) {
          // Reconnecting player!
          existingPlayer.connected = true;
          existingPlayer.isBot = false;
          existingPlayer.status = 'ACTIVE';
          if (payload.playerName) {
            existingPlayer.name = payload.playerName.trim().slice(0, 20);
          }

          if (
            room.phase === 'PAUSED_DISCONNECT' &&
            room.turn.pausedForPlayerId === existingPlayer.id &&
            room.turn.phaseBeforePause
          ) {
            room.phase = room.turn.phaseBeforePause;
            room.turn.phaseBeforePause = undefined;
            room.turn.pausedForPlayerId = null;
            refreshTurnDeadline(room);
          }

          addLog(room, `🔌 ${existingPlayer.name} se ha reconectado a la partida.`, 'SYSTEM', existingPlayer.id);
          socketToSession.set(socket.id, { roomCode, playerId });
          socket.join(roomCode);

          socket.emit('ROOM_JOINED', { roomCode, playerId, state: room });
          io.to(roomCode).emit('ROOM_STATE', room);
          return;
        }

        if (room.phase !== 'LOBBY') {
          // Check if there is a disconnected player whose seat can be reclaimed by matching name
          const disconnectedMatch = room.players.find(
            (p) =>
              !p.connected &&
              p.name.toLowerCase() === (payload.playerName || '').trim().toLowerCase()
          );
          if (disconnectedMatch) {
            disconnectedMatch.connected = true;
            disconnectedMatch.isBot = false;
            disconnectedMatch.status = 'ACTIVE';
            socketToSession.set(socket.id, { roomCode, playerId: disconnectedMatch.id });
            socket.join(roomCode);
            addLog(
              room,
              `🔌 ${disconnectedMatch.name} recuperó su asiento en la partida.`,
              'SYSTEM',
              disconnectedMatch.id
            );
            socket.emit('ROOM_JOINED', {
              roomCode,
              playerId: disconnectedMatch.id,
              state: room,
            });
            io.to(roomCode).emit('ROOM_STATE', room);
            return;
          }

          socket.emit('ACTION_ERROR', {
            message: 'La partida en esta sala ya ha comenzado y no admite nuevos jugadores.',
          });
          return;
        }

        if (room.players.length >= room.config.maxPlayers) {
          socket.emit('ACTION_ERROR', {
            message: `La sala "${roomCode}" está llena (${room.config.maxPlayers}/${room.config.maxPlayers}).`,
          });
          return;
        }

        const usedColors = new Set(room.players.map((p) => p.color));
        const chosenColor: PlayerColor = !usedColors.has(payload.color)
          ? payload.color
          : ((Object.keys(PLAYER_COLORS) as PlayerColor[]).find((c) => !usedColors.has(c)) ||
            'BLUE');

        const newPlayer: PlayerState = {
          id: playerId,
          name: (payload.playerName || `Jugador ${room.players.length + 1}`).trim().slice(0, 20),
          color: chosenColor,
          avatar: payload.avatar || AVATAR_LIST[room.players.length % AVATAR_LIST.length],
          isHost: room.players.length === 0,
          isBot: false,
          connected: true,
          status: 'ACTIVE',
          resources: createEmptyResources(),
          devCards: [],
          knightsPlayed: 0,
          longestRoadLength: 0,
          longestRoadEdgeIds: [],
          settlementsLeft: 5,
          citiesLeft: 4,
          roadsLeft: 15,
          publicVictoryPoints: 0,
          totalVictoryPoints: 0,
          mustDiscardCount: 0,
        };

        room.players.push(newPlayer);
        addLog(room, `👋 ${newPlayer.name} se unió a la sala.`, 'SYSTEM', newPlayer.id);

        socketToSession.set(socket.id, { roomCode, playerId });
        socket.join(roomCode);

        socket.emit('ROOM_JOINED', { roomCode, playerId, state: room });
        io.to(roomCode).emit('ROOM_STATE', room);
      }
    );

    socket.on(
      'GAME_ACTION',
      (payload: { roomCode: string; playerId: string; action: GameAction }) => {
        const roomCode = (payload.roomCode || '').toUpperCase();
        const room = rooms.get(roomCode);
        if (!room) {
          socket.emit('ACTION_ERROR', { message: 'Sala no encontrada.' });
          return;
        }

        const { state: updatedState, error } = applyGameAction(
          room,
          payload.playerId,
          payload.action
        );

        if (error) {
          socket.emit('ACTION_ERROR', { message: error });
          return;
        }

        rooms.set(roomCode, updatedState);

        if (payload.action.type === 'ABANDON_GAME') {
          socket.leave(roomCode);
          socketToSession.delete(socket.id);
          if (updatedState.players.filter((p) => !p.isBot && p.connected).length === 0) {
            rooms.delete(roomCode);
            return;
          }
        }

        io.to(roomCode).emit('ROOM_STATE', updatedState);
      }
    );

    socket.on('disconnect', () => {
      const session = socketToSession.get(socket.id);
      if (!session) return;
      socketToSession.delete(socket.id);

      const { roomCode, playerId } = session;
      const room = rooms.get(roomCode);
      if (!room) return;

      const player = room.players.find((p) => p.id === playerId);
      if (!player) return;

      player.connected = false;

      if (room.phase === 'LOBBY') {
        // Give 4 seconds grace period in case of page reload in lobby
        setTimeout(() => {
          const currentRoom = rooms.get(roomCode);
          if (!currentRoom || currentRoom.phase !== 'LOBBY') return;
          const p = currentRoom.players.find((pl) => pl.id === playerId);
          if (p && !p.connected) {
            currentRoom.players = currentRoom.players.filter((pl) => pl.id !== playerId);
            if (currentRoom.players.length === 0) {
              rooms.delete(roomCode);
              return;
            }
            if (!currentRoom.players.some((pl) => pl.isHost)) {
              const firstHuman = currentRoom.players.find((pl) => !pl.isBot);
              if (firstHuman) firstHuman.isHost = true;
            }
            io.to(roomCode).emit('ROOM_STATE', currentRoom);
          }
        }, 4000);
      } else if (room.phase !== 'GAME_OVER') {
        player.status = 'DISCONNECTED_WAITING';
        if (player.isHost) {
          const anotherHuman = room.players.find(
            (p) => p.id !== player.id && !p.isBot && p.connected
          );
          if (anotherHuman) {
            player.isHost = false;
            anotherHuman.isHost = true;
          }
        }
        addLog(
          room,
          `⚠️ ${player.name} se ha desconectado. Puedes pausar la partida esperándolo o congelar/IA sus turnos.`,
          'SYSTEM',
          player.id
        );
        io.to(roomCode).emit('ROOM_STATE', room);
      }
    });
  });

  // Periodic loop for Turn Timer (House Rule 6) & AI Bot execution
  setInterval(() => {
    const now = Date.now();
    for (const [roomCode, room] of rooms.entries()) {
      if (
        room.phase === 'LOBBY' ||
        room.phase === 'GAME_OVER' ||
        room.phase === 'PAUSED_DISCONNECT'
      ) {
        continue;
      }

      // 1. Check Turn Timer expiration
      if (room.turn.turnDeadlineMs && now >= room.turn.turnDeadlineMs) {
        addLog(
          room,
          `⏱️ ¡Se agotó el tiempo del turno! El servidor resolvió automáticamente las acciones pendientes.`,
          'SYSTEM',
          room.turn.activePlayerId
        );
        const updated = autoResolveCurrentTurn(room);
        rooms.set(roomCode, updated);
        io.to(roomCode).emit('ROOM_STATE', updated);
        continue;
      }

      // 2. Check if in ORDER_ROLL with unrolled bots, or if active player is an AI Bot or FROZEN_SKIP
      const hasUnrolledBotInOrderPhase =
        room.phase === 'ORDER_ROLL' &&
        room.players.some((p) => p.isBot && !room.turn.orderRolls?.[p.id]);
      const activePlayer = room.players.find((p) => p.id === room.turn.activePlayerId);
      if (
        hasUnrolledBotInOrderPhase ||
        (activePlayer && (activePlayer.isBot || activePlayer.status === 'FROZEN_SKIP'))
      ) {
        const lastStep = botLastStepTime.get(roomCode) || 0;
        if (now - lastStep >= 950) {
          botLastStepTime.set(roomCode, now);
          const updated =
            !hasUnrolledBotInOrderPhase && activePlayer?.status === 'FROZEN_SKIP'
              ? autoResolveCurrentTurn(room)
              : executeBotStepIfNeeded(room);
          rooms.set(roomCode, updated);
          io.to(roomCode).emit('ROOM_STATE', updated);
        }
      }
    }
  }, 450);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor Catan Online (WebSockets + Vite) activo en http://localhost:${PORT}`);
  });
}

startServer();

