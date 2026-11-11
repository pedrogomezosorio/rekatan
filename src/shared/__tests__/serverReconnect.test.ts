import { spawn, ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { io, Socket } from 'socket.io-client';
import { expect, it } from 'vitest';
import { GameAction, GameState } from '../types';
import type { RoomCreationOptions } from '../roomPresets';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

it('conserva la sala tras errores de opciones, cambio de transporte, desconexión lenta y reinicio', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'rekatan-reconnect-'));
  const probe = createServer();
  await new Promise<void>(r => probe.listen(0, '127.0.0.1', r));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>(r => probe.close(() => r()));
  let server: ChildProcess | undefined;
  const clients: Socket[] = [];
  async function start() {
    const process = spawn(globalThis.process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), 'server/index.ts'], {
      cwd: resolve('.'), env: { ...globalThis.process.env, PORT: String(port), NODE_ENV: 'production', CATAN_ROOMS_FILE: join(directory, 'rooms.json') },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server = process;
    await new Promise<void>((resolveReady, reject) => {
      const timer = setTimeout(() => reject(new Error('No arrancó el servidor de pruebas.')), 15000);
      process.stdout?.on('data', output => {
        if (String(output).includes('activo en')) { clearTimeout(timer); resolveReady(); }
      });
      process.once('exit', code => { clearTimeout(timer); reject(new Error(`El servidor terminó: ${code}`)); });
    });
  }
  async function stop() {
    if (!server || server.exitCode !== null) return;
    const exited = new Promise<void>(r => server!.once('exit', () => r()));
    server.kill('SIGTERM'); await exited;
  }
  async function connect() {
    const socket = io(`http://127.0.0.1:${port}`, { transports: ['websocket'], reconnection: false, autoConnect: false });
    clients.push(socket);
    await new Promise<void>((r, reject) => { socket.once('connect', r); socket.once('connect_error', reject); socket.connect(); });
    return socket;
  }
  const identity = { playerId: 'P1', playerName: 'Colona', color: 'RED', avatar: 'I' };
  const roomJoined = (socket: Socket, event: 'CREATE_ROOM' | 'JOIN_ROOM', roomCode?: string, options?: RoomCreationOptions) => new Promise<GameState>((r, reject) => {
    socket.once('ROOM_JOINED', payload => { socket.off('ACTION_ERROR', reject); r(payload.state); });
    socket.once('ACTION_ERROR', reject); socket.emit(event, { ...identity, roomCode, options });
  });
  const action = (socket: Socket, roomCode: string, value: GameAction, predicate?: (s: GameState) => boolean) => new Promise<GameState>((r, reject) => {
    const onState = (state: GameState) => {
      if (!predicate || predicate(state)) {
        socket.off('ROOM_STATE', onState);
        socket.off('ACTION_ERROR', onError);
        r(state);
      }
    };
    const onError = (error: { message: string }) => {
      socket.off('ROOM_STATE', onState);
      socket.off('ACTION_ERROR', onError);
      reject(new Error(error.message));
    };
    socket.on('ROOM_STATE', onState);
    socket.once('ACTION_ERROR', onError);
    socket.emit('GAME_ACTION', { roomCode, playerId: identity.playerId, action: value });
  });
  try {
    await start();
    const ckLobby = await roomJoined(await connect(), 'CREATE_ROOM', undefined, { preset: 'CITIES_KNIGHTS_3_4' });
    expect(ckLobby.config.expansionModule).toBe('CITIES_AND_KNIGHTS'); expect(ckLobby.config.maxPlayers).toBe(4); expect(ckLobby.phase).toBe('LOBBY');
    const ckGame = await roomJoined(await connect(), 'CREATE_ROOM', undefined, { preset: 'CITIES_KNIGHTS_5_6', playWithBots: true, playerCount: 6 });
    expect(ckGame.players).toHaveLength(6); expect(ckGame.bank.COIN).toBe(18); expect(ckGame.citiesKnights?.decks.SCIENCE).toHaveLength(18); expect(ckGame.phase).toBe('SETUP_SETTLEMENT_1');
    const first = await connect();
    const created = await roomJoined(first, 'CREATE_ROOM');
    const roomCode = created.roomCode;
    let configured = await action(first, roomCode, { type: 'UPDATE_CONFIG', config: { expansionModule: 'SEAFARERS', seafarersScenario: 'THROUGH_THE_DESERT', seafarersBoardSize: '4P' } });
    const snapshot = JSON.stringify(configured.board);
    const error = new Promise<{ code: string }>(r => first.once('ACTION_ERROR', r));
    const preserved = new Promise<GameState>(r => first.once('ROOM_STATE', r));
    first.emit('GAME_ACTION', { roomCode, playerId: identity.playerId, action: { type: 'UPDATE_CONFIG', config: { seafarersScenario: 'MALFORMED_SCENARIO' } } });
    expect((await error).code).toBe('ACTION_FAILED');
    expect(JSON.stringify((await preserved).board)).toBe(snapshot);

    const replacement = await connect();
    await roomJoined(replacement, 'JOIN_ROOM', roomCode);
    first.disconnect();
    configured = await action(
      replacement,
      roomCode,
      { type: 'UPDATE_CONFIG', config: { victoryPointsTarget: 15 } },
      (s) => s.config.victoryPointsTarget === 15
    );
    expect(configured.players[0].connected).toBe(true);
    replacement.disconnect();
    await delay(5200); // The old four-second expiry used to delete this room.
    const returning = await connect();
    const rejoined = await roomJoined(returning, 'JOIN_ROOM', roomCode);
    expect(rejoined.config.victoryPointsTarget).toBe(15);
    expect(JSON.stringify(rejoined.board)).toBe(snapshot);
    returning.disconnect();
    await stop(); await start();
    const restored = await roomJoined(await connect(), 'JOIN_ROOM', roomCode);
    expect(restored.roomCode).toBe(roomCode);
    expect(restored.players[0]).toMatchObject({ id: 'P1', isHost: true, connected: true });
    expect(JSON.stringify(restored.board)).toBe(snapshot);
    expect(restored.config.victoryPointsTarget).toBe(15);
  } finally {
    clients.forEach(client => client.disconnect());
    await stop(); rmSync(directory, { recursive: true, force: true });
  }
}, 30000);
