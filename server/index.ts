import { getAvatarNameError, getPublicPlayerName, normalizeAvatar } from '../src/shared/playerIdentity';
import { getRoomPlayerLimit } from '../src/shared/seafarersConfig';
import { RoomStore } from './roomStore';
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
  getDecisionPlayerId,
  refreshTurnDeadline,
} from '../src/shared/engine/RulesEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const rooms = new RoomStore(process.env.CATAN_ROOMS_FILE || path.resolve(__dirname, '../.rekatan/rooms.json'));
const LOBBY_RECONNECT_GRACE_MS = 30 * 60 * 1000;
process.once('exit', () => rooms.flush());
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { rooms.flush(); process.exit(0); });
const socketToSession = new Map<string, { roomCode: string; playerId: string }>();
const lobbyExpiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const runningBotRooms = new Set<string>();

function cancelLobbyExpiry(roomCode: string, playerId: string) {
  const key = `${roomCode}:${playerId}`;
  clearTimeout(lobbyExpiryTimers.get(key));
  lobbyExpiryTimers.delete(key);
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
      maxPlayers: getRoomPlayerLimit(room.config),
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
        const avatarError = getAvatarNameError(payload.avatar, payload.playerName || '');
        if (avatarError) {
          socket.emit('ACTION_ERROR', { message: avatarError });
          return;
        }
        const roomCode = generateRoomCode();
        const playerId = payload.playerId || `P_${ socket.id }`;
        const gameState = createInitialGameState(roomCode, {
          id: playerId,
          name: getPublicPlayerName(payload.playerName || '') || 'Anfitrión',
          color: payload.color || 'RED',
          avatar: normalizeAvatar(payload.avatar) || 'I',
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
        const avatarError = getAvatarNameError(payload.avatar, payload.playerName || '');
        if (avatarError) {
          socket.emit('ACTION_ERROR', { message: avatarError });
          return;
        }
        const roomCode = (payload.roomCode || '').trim().toUpperCase();
        const room = rooms.get(roomCode);

        if (!room) {
          socket.emit('ACTION_ERROR', {
            code: 'ROOM_NOT_FOUND', roomCode,
            message: `No existe ninguna sala con el código "${roomCode}". Verifica el código.`,
          });
          return;
        }

        const playerId = payload.playerId || `P_${socket.id}`;
        const existingPlayer = room.players.find((p) => p.id === playerId);

        if (existingPlayer) {
          const reconnectError = getAvatarNameError(existingPlayer.avatar, payload.playerName || '');
          if (reconnectError) {
            socket.emit('ACTION_ERROR', { message: reconnectError });
            return;
          }
          existingPlayer.avatar = normalizeAvatar(existingPlayer.avatar);
          // Reconnecting player!
          existingPlayer.connected = true;
          existingPlayer.isBot = false;
          existingPlayer.status = 'ACTIVE';
          cancelLobbyExpiry(roomCode, playerId);
          if (payload.playerName) {
            existingPlayer.name = getPublicPlayerName(payload.playerName) || existingPlayer.name;
          }

          // If no other human players remain disconnected, automatically resume the game!
          const anyStillDisconnected = room.players.some((p) => !p.connected && !p.isBot);
          if (!anyStillDisconnected && room.phase === 'PAUSED_DISCONNECT') {
            room.phase = room.turn.phaseBeforePause || 'MAIN_PHASE';
            room.turn.phaseBeforePause = undefined;
            room.turn.pausedForPlayerId = null;
            refreshTurnDeadline(room);
            addLog(
              room,
              `Todos los jugadores están conectados. La partida se ha reanudado automáticamente.`,
              'SYSTEM'
            );
          } else {
            addLog(
              room,
              `${existingPlayer.name} se ha reconectado a la partida.`,
              'SYSTEM',
              existingPlayer.id
            );
          }

          socketToSession.set(socket.id, { roomCode, playerId });
          socket.join(roomCode);
          rooms.set(roomCode, room);

          socket.emit('ROOM_JOINED', { roomCode, playerId, state: room });
          io.to(roomCode).emit('ROOM_STATE', room);
          return;
        }

        if (room.phase !== 'LOBBY') {
          // Check if there is a disconnected player whose seat can be reclaimed by matching name
          const disconnectedMatch = room.players.find(
            (p) =>
              !p.connected &&
              p.name.toLowerCase() === getPublicPlayerName(payload.playerName || '').toLowerCase()
          );
          if (disconnectedMatch) {
            const reconnectError = getAvatarNameError(disconnectedMatch.avatar, payload.playerName || '');
            if (reconnectError) {
              socket.emit('ACTION_ERROR', { message: reconnectError });
              return;
            }
            disconnectedMatch.avatar = normalizeAvatar(disconnectedMatch.avatar);
            disconnectedMatch.connected = true;
            disconnectedMatch.isBot = false;
            disconnectedMatch.status = 'ACTIVE';

            // If no other human players remain disconnected, automatically resume the game!
            const anyStillDisconnected = room.players.some((p) => !p.connected && !p.isBot);
            if (!anyStillDisconnected && room.phase === 'PAUSED_DISCONNECT') {
              room.phase = room.turn.phaseBeforePause || 'MAIN_PHASE';
              room.turn.phaseBeforePause = undefined;
              room.turn.pausedForPlayerId = null;
              refreshTurnDeadline(room);
              addLog(
                room,
                `Todos los jugadores están conectados. La partida se ha reanudado automáticamente.`,
                'SYSTEM'
              );
            } else {
              addLog(
                room,
                `${disconnectedMatch.name} recuperó su asiento en la partida.`,
                'SYSTEM',
                disconnectedMatch.id
              );
            }

            socketToSession.set(socket.id, { roomCode, playerId: disconnectedMatch.id });
            socket.join(roomCode);
            rooms.set(roomCode, room);
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

        if (room.players.length >= getRoomPlayerLimit(room.config)) {
          socket.emit('ACTION_ERROR', {
            message: `La sala "${roomCode}" está llena (${getRoomPlayerLimit(room.config)}/${getRoomPlayerLimit(room.config)}). Selecciona una modalidad de mapa mayor para ampliar las plazas.`,
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
          name: getPublicPlayerName(payload.playerName || '') || `Jugador ${room.players.length + 1}`,
          color: chosenColor,
          avatar: normalizeAvatar(payload.avatar) || AVATAR_LIST[room.players.length % AVATAR_LIST.length],
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
        addLog(room, `${newPlayer.name} se unió a la sala.`, 'SYSTEM', newPlayer.id);
        rooms.set(roomCode, room);

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
          socket.emit('ACTION_ERROR', { code: 'ROOM_NOT_FOUND', roomCode, message: 'Sala no encontrada.' });
          return;
        }
        const session = socketToSession.get(socket.id);
        if (!session || session.roomCode !== roomCode || session.playerId !== payload.playerId) {
          socket.emit('ACTION_ERROR', { code: 'PLAYER_SESSION_MISMATCH', message: 'La acción debe corresponder al jugador conectado.' });
          return;
        }
        let result: ReturnType<typeof applyGameAction>;
        try {
          result = applyGameAction(room, payload.playerId, payload.action, { random: Math.random, now: Date.now() });
        } catch (error) {
          console.error('[GAME_ACTION]', roomCode, payload.action.type, error);
          socket.emit('ACTION_ERROR', { code: 'ACTION_FAILED', roomCode, message: 'No se pudo aplicar esa opción. Se conserva la sala y el tablero anterior.' });
          socket.emit('ROOM_STATE', room);
          return;
        }
        const { state: updatedState, error } = result;

        if (error) {
          socket.emit('ACTION_ERROR', { message: error });
          return;
        }

        rooms.set(roomCode, updatedState);

        if (payload.action.type === 'ABANDON_GAME') {
          cancelLobbyExpiry(roomCode, payload.playerId);
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
      // An old transport may close after the replacement socket has already joined.
      if ([...socketToSession.values()].some(s => s.roomCode === roomCode && s.playerId === playerId)) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      const player = room.players.find((p) => p.id === playerId);
      if (!player) return;

      player.connected = false;

      if (room.phase === 'LOBBY') {
        // Preserve the seat and configuration across reloads and slow reconnects.
        cancelLobbyExpiry(roomCode, playerId);
        const expiry = setTimeout(() => {
          lobbyExpiryTimers.delete(`${roomCode}:${playerId}`);
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
            rooms.set(roomCode, currentRoom);
            io.to(roomCode).emit('ROOM_STATE', currentRoom);
          }
        }, LOBBY_RECONNECT_GRACE_MS);
        lobbyExpiryTimers.set(`${roomCode}:${playerId}`, expiry);
        expiry.unref();
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
          `${player.name} se ha desconectado. Puedes pausar la partida esperándolo o congelar/IA sus turnos.`,
          'SYSTEM',
          player.id
        );
        io.to(roomCode).emit('ROOM_STATE', room);
      }
      rooms.set(roomCode, room);
    });
  });

  // Periodic loop for Turn Timer (House Rule 6) & Paced AI Bot execution
  setInterval(() => {
    const now = Date.now();
    for (const [roomCode, room] of rooms.entries()) {
      if (
        room.phase === 'LOBBY' ||
        room.phase === 'GAME_OVER' ||
        room.phase === 'PAUSED_DISCONNECT' ||
        room.turn.isPausedByHost
      ) {
        continue;
      }

      // 1. Check Turn Timer expiration
      if (room.turn.turnDeadlineMs && now >= room.turn.turnDeadlineMs) {
        addLog(
          room,
          `Se agotó el tiempo del turno. El servidor resolvió automáticamente las acciones pendientes.`,
          'SYSTEM',
          room.turn.activePlayerId
        );
        const updated = autoResolveCurrentTurn(room);
        rooms.set(roomCode, updated);
        io.to(roomCode).emit('ROOM_STATE', updated);
        continue;
      }

      // 2. Check if in ORDER_ROLL with unrolled bots, or if active player is an AI Bot or FROZEN_SKIP
      const unrolledBotInOrderPhase =
        room.phase === 'ORDER_ROLL'
          ? room.players.find((p) => p.isBot && !room.turn.orderRolls?.[p.id])
          : undefined;
      const activePlayer = room.players.find((p) => p.id === getDecisionPlayerId(room));
      const shouldRunBotStep =
        Boolean(unrolledBotInOrderPhase) ||
        Boolean(activePlayer && (activePlayer.isBot || activePlayer.status === 'FROZEN_SKIP'));

      if (shouldRunBotStep && !runningBotRooms.has(roomCode)) {
        runningBotRooms.add(roomCode);

        void (async () => {
          try {
            const currentRoom = rooms.get(roomCode);
            if (
              !currentRoom ||
              currentRoom.phase === 'LOBBY' ||
              currentRoom.phase === 'GAME_OVER' ||
              currentRoom.phase === 'PAUSED_DISCONNECT' ||
              currentRoom.turn.isPausedByHost
            ) {
              return;
            }

            const actingBot =
              currentRoom.phase === 'ORDER_ROLL'
                ? currentRoom.players.find(
                    (p) => p.isBot && !currentRoom.turn.orderRolls?.[p.id]
                  )
                : currentRoom.players.find((p) => p.id === getDecisionPlayerId(currentRoom));

            if (!actingBot) return;

            // 1. Initial pacing delay before deciding: let all human players see the bot prepare its move
            if (actingBot.isBot && !currentRoom.turn.botStatusMessage) {
              const actionHint =
                currentRoom.phase === 'ORDER_ROLL'
                  ? `${actingBot.name} se prepara para tirar dados de iniciativa...`
                  : currentRoom.phase === 'SETUP_SETTLEMENT_1' || currentRoom.phase === 'SETUP_SETTLEMENT_2'
                  ? `${actingBot.name} busca la mejor intersección para su poblado...`
                  : currentRoom.phase === 'SETUP_ROAD_1' || currentRoom.phase === 'SETUP_ROAD_2'
                  ? `${actingBot.name} decide hacia dónde expandir su carretera...`
                  : currentRoom.phase === 'WAITING_FOR_DICE'
                  ? `${actingBot.name} agita el cubilete para lanzar los dados...`
                  : currentRoom.phase === 'ROBBER_MOVE'
                  ? `${actingBot.name} planea dónde colocar al Ladrón...`
                  : currentRoom.phase === 'ROBBER_STEAL'
                  ? `${actingBot.name} elige a quién robar...`
                  : `${actingBot.name} evalúa sus opciones de juego...`;

              currentRoom.turn.botStatusMessage = actionHint;
              io.to(roomCode).emit('ROOM_STATE', currentRoom);
              await delay(1600);
            }

            const latestRoom = rooms.get(roomCode);
            if (
              !latestRoom ||
              latestRoom.phase === 'LOBBY' ||
              latestRoom.phase === 'GAME_OVER' ||
              latestRoom.phase === 'PAUSED_DISCONNECT' ||
              latestRoom.turn.isPausedByHost
            ) {
              return;
            }

            const prevPhase = latestRoom.phase;
            const prevNonce = latestRoom.lastEvent?.nonce;
            const currentActive = latestRoom.players.find(
              (p) => p.id === getDecisionPlayerId(latestRoom)
            );
            const updated =
              latestRoom.phase !== 'ORDER_ROLL' && currentActive?.status === 'FROZEN_SKIP'
                ? autoResolveCurrentTurn(latestRoom)
                : executeBotStepIfNeeded(latestRoom);

            rooms.set(roomCode, updated);
            io.to(roomCode).emit('ROOM_STATE', updated);

            // 2. Mandatory Humanized Pacing Delays (Reduces bot execution speed to 1/5th):
            // Gives players ample time to see the dice, follow resource flights, read bot choices, and inspect the board.
            const ev =
              updated.lastEvent && updated.lastEvent.nonce !== prevNonce
                ? updated.lastEvent
                : null;

            const hasActiveBotTrade = updated.activeTradeOffers.some(
              (o) => o.fromPlayerId === currentActive?.id
            );

            if (hasActiveBotTrade) {
              // Bot has an active trade offer open for other players: check in shorter intervals (700ms)
              // so as soon as all players reject or someone accepts, it reacts immediately!
              await delay(700);
            } else if (ev?.type === 'RESOURCES_PRODUCED') {
              // Dice roll display: 1.0s spin + 2.5s landed display = ~3.6s
              const diceWaitMs = ev.dice ? 3900 : 0;
              // Each resource flight takes 4.05s sequentially
              const flightCount = ev.flights?.length || 0;
              const flightsWaitMs = Math.min(flightCount, 8) * 4050;
              await delay(Math.max(3800, diceWaitMs + flightsWaitMs));
            } else if (ev?.type === 'DICE_ROLLED' || ev?.type === 'ROBBER_DISCARDED') {
              // Dice landed without production (e.g. 7 rolled or discards)
              await delay(4000);
            } else if (
              prevPhase === 'SETUP_SETTLEMENT_1' ||
              prevPhase === 'SETUP_SETTLEMENT_2'
            ) {
              // Placed initial settlement: wait so everyone sees the settlement before the road
              await delay(3200);
            } else if (
              prevPhase === 'SETUP_ROAD_1' ||
              prevPhase === 'SETUP_ROAD_2'
            ) {
              // Placed initial road: wait so everyone sees the road before next player's turn
              await delay(3200);
            } else if (prevPhase === 'ORDER_ROLL') {
              // Rolled for order
              await delay(2800);
            } else if (
              ev?.type === 'ROBBER_MOVED' ||
              ev?.type === 'CARD_STOLEN' ||
              ev?.type === 'DEV_CARD_PLAYED'
            ) {
              await delay(3800);
            } else if (ev?.type === 'DEV_CARD_BOUGHT') {
              // Dev card bought: wait for slide-spinning flight across screen into player casillero (~3.8s)
              await delay(3800);
            } else if (ev?.builtItem || ev?.bankTradeNotice || ev?.completedTrade) {
              // Built road/settlement/city or traded/burned with bank/port: wait 3.8s so top-center notice finishes cleanly
              await delay(3800);
            } else {
              // Main phase actions (trade offer or end turn)
              await delay(2800);
            }
          } catch (error) {
            console.error('[BOT_STEP]', roomCode, error);
          } finally {
            runningBotRooms.delete(roomCode);
          }
        })();
      }
    }
  }, 400);

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
    console.log(`Servidor Catan Online (WebSockets + Vite) activo en http://localhost:${PORT}`);
  });
}

startServer();

