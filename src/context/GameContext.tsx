import type { RoomCreationOptions } from '../shared/roomPresets';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  applyGameAction,
  createConfiguredGameState,
  executeBotStepIfNeeded,
} from '../shared/engine/RulesEngine';
import { initializeBarbarians } from '../shared/engine/BarbariansEngine';
import { initializeExplorersPirates } from '../shared/engine/ExplorersPiratesEngine';
import { hasBarbarians, hasExplorersPirates } from '../shared/expansionsConfig';
import { getAvatarNameError, normalizeAvatar } from '../shared/playerIdentity';
import { GameAction, GameState, PlayerColor } from '../shared/types';

interface GameContextValue {
  playerId: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  playerColor: PlayerColor;
  setPlayerColor: (color: PlayerColor) => void;
  playerAvatar: string;
  setPlayerAvatar: (avatar: string) => void;
  lowEndPcMode: boolean;
  setLowEndPcMode: (enabled: boolean) => void;
  serverUrl: string;
  updateServerUrl: (url: string) => void;
  gameState: GameState | null;
  connected: boolean;
  reconnectSocket: () => void;
  errorToast: string | null;
  showErrorToast: (msg: string) => void;
  clearErrorToast: () => void;
  createRoom: (options?: RoomCreationOptions) => void;
  creatingRoom: boolean;
  joinRoom: (code: string) => void;
  dispatchAction: (action: GameAction) => void;
  leaveRoomClient: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

function getOrCreateTabPlayerId(): string {
  const existing = sessionStorage.getItem('catan_player_id');
  if (existing) return existing;
  const newId = `P_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  sessionStorage.setItem('catan_player_id', newId);
  return newId;
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playerId] = useState<string>(() => getOrCreateTabPlayerId());
  const [playerName, setPlayerName] = useState<string>(
    () => sessionStorage.getItem('catan_player_name') || ''
  );
  const [playerColor, setPlayerColor] = useState<PlayerColor>(
    () => (sessionStorage.getItem('catan_player_color') as PlayerColor) || 'RED'
  );
  const [playerAvatar, setPlayerAvatar] = useState<string>(
    () => normalizeAvatar(sessionStorage.getItem('catan_player_avatar') || '👑')
  );
  const [lowEndPcMode, setLowEndPcMode] = useState<boolean>(
    () => localStorage.getItem('catan_low_end_pc_mode') === 'true'
  );
  const [serverUrl, setServerUrlState] = useState<string>(() => {
    const isLocalDevServer =
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      window.location.port === '3000';
    const saved = localStorage.getItem('catan_server_url');
    // Si estamos abriendo el servidor local de desarrollo (localhost:3000), usar siempre el servidor local
    // en lugar de una URL remota antigua (p. ej. Render) guardada en localStorage.
    if (isLocalDevServer) {
      if (saved && saved !== window.location.origin) {
        localStorage.removeItem('catan_server_url');
      }
      return window.location.origin;
    }
    if (saved) return saved;
    // In standalone electron with embedded dist server, port is random, default to host port 3000
    if ((window as Window & { catanDesktop?: { isDesktopApp?: boolean } }).catanDesktop?.isDesktopApp && window.location.hostname === '127.0.0.1' && window.location.port !== '3000') {
      return 'https://rekatan.onrender.com';
    }
    return window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
  });

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef<string | null>(null);
  const joinedRoomRef = useRef<string | null>(null);
  const localEngineRoomRef = useRef<boolean>(false);

  useEffect(() => {
    if (playerName) sessionStorage.setItem('catan_player_name', playerName);
  }, [playerName]);

  useEffect(() => {
    sessionStorage.setItem('catan_player_color', playerColor);
  }, [playerColor]);

  useEffect(() => {
    sessionStorage.setItem('catan_player_avatar', playerAvatar);
  }, [playerAvatar]);

  useEffect(() => {
    localStorage.setItem('catan_low_end_pc_mode', String(lowEndPcMode));
  }, [lowEndPcMode]);

  const updateServerUrl = (newUrl: string) => {
    let clean = newUrl.trim();
    if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    clean = clean.replace(/\/+$/, '');
    localStorage.setItem('catan_server_url', clean);
    setServerUrlState(clean);
  };

  useEffect(() => {
    const targetUrl = serverUrl || 'http://localhost:3000';

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(targetUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // If we were in a room, automatically rejoin on reconnect!
      const savedRoom = activeRoomRef.current || sessionStorage.getItem('catan_active_room');
      joinedRoomRef.current = null;
      setConnected(!savedRoom);
      if (savedRoom) {
        socket.emit('JOIN_ROOM', {
          roomCode: savedRoom,
          playerId,
          playerName: sessionStorage.getItem('catan_player_name') || 'Jugador',
          color: (sessionStorage.getItem('catan_player_color') as PlayerColor) || 'RED',
          avatar: sessionStorage.getItem('catan_player_avatar') || '👑',
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected from server. Reason:', reason);
      setConnected(false);
      setCreatingRoom(false);
      joinedRoomRef.current = null;
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setConnected(false);
    });

    const upgradeIfOutdatedServerState = (incoming: GameState): GameState => {
      const missingBarbarians = hasBarbarians(incoming.config) && !incoming.barbarians;
      const missingEP = hasExplorersPirates(incoming.config) && !incoming.explorersPirates;
      if (!missingBarbarians && !missingEP) return incoming;

      localEngineRoomRef.current = true;
      if (incoming.phase === 'LOBBY') {
        const hostId = incoming.players.find((p) => p.isHost)?.id || playerId;
        const upgraded = applyGameAction(incoming, hostId, {
          type: 'UPDATE_CONFIG',
          config: incoming.config,
        });
        if (!upgraded.error) return upgraded.state;
      }
      const cloned: GameState = structuredClone(incoming);
      if (missingBarbarians) {
        initializeBarbarians(cloned, Math.random);
      } else if (missingEP) {
        initializeExplorersPirates(cloned, Math.random);
      }
      return cloned;
    };

    socket.on('ROOM_JOINED', (payload: { roomCode: string; playerId: string; state: GameState }) => {
      setCreatingRoom(false);
      activeRoomRef.current = payload.roomCode;
      joinedRoomRef.current = payload.roomCode;
      localEngineRoomRef.current = false;
      setConnected(true);
      setErrorToast(null);
      sessionStorage.setItem('catan_active_room', payload.roomCode);
      setGameState(upgradeIfOutdatedServerState(payload.state));
      // Update URL query without reloading
      const url = new URL(window.location.href);
      url.searchParams.set('room', payload.roomCode);
      window.history.replaceState({}, '', url.toString());
    });

    socket.on('ROOM_STATE', (state: GameState) => {
      if (state.roomCode !== joinedRoomRef.current || state.roomCode !== activeRoomRef.current) return;
      // Si el servidor remoto (p. ej. Render aún sin desplegar) devuelve BARBARIANS o EXPLORERS_AND_PIRATES sin inicializar su tablero/estado,
      // activamos automáticamente el motor local en el cliente para que la expansión y su tablero oficial funcionen al 100%.
      if (
        (hasBarbarians(state.config) && !state.barbarians) ||
        (hasExplorersPirates(state.config) && !state.explorersPirates)
      ) {
        setGameState(upgradeIfOutdatedServerState(state));
        return;
      }
      if (!localEngineRoomRef.current) {
        setGameState(state);
      }
    });

    socket.on('ACTION_ERROR', (payload: { message: string; code?: string; roomCode?: string }) => {
      setCreatingRoom(false);
      const missingRoom = payload.code === 'ROOM_NOT_FOUND' || payload.message === 'Sala no encontrada.' || payload.message.startsWith('No existe ninguna sala');
      const currentRoom = activeRoomRef.current || sessionStorage.getItem('catan_active_room');
      if (missingRoom && currentRoom && (!payload.roomCode || payload.roomCode === currentRoom)) {
        activeRoomRef.current = null;
        joinedRoomRef.current = null;
        sessionStorage.removeItem('catan_active_room');
        setGameState(null);
        setConnected(socket.connected);
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url.toString());
      }
      setErrorToast(payload.message);
    });

    return () => {
      joinedRoomRef.current = null;
      socket.disconnect();
    };
  }, [playerId, serverUrl]);

  useEffect(() => {
    if (!errorToast) return;
    const timer = setTimeout(() => setErrorToast(null), 4500);
    return () => clearTimeout(timer);
  }, [errorToast]);

  // Motor local de turnos de bots cuando la sala se ejecuta en modo motor local (expansiones nuevas o sin servidor actualizado)
  useEffect(() => {
    if (!localEngineRoomRef.current || !gameState) return;
    if (
      gameState.phase === 'LOBBY' ||
      gameState.phase === 'GAME_OVER' ||
      gameState.phase === 'PAUSED_DISCONNECT' ||
      gameState.turn.isPausedByHost
    ) {
      return;
    }
    const timer = setTimeout(() => {
      setGameState((prev) => {
        if (!prev || !localEngineRoomRef.current) return prev;
        return executeBotStepIfNeeded(prev);
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [gameState]);

  const reconnectSocket = () => {
    if (!socketRef.current) return;
    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
  };

  const createRoom = (options?: RoomCreationOptions) => {
    if (creatingRoom) return;
    const avatarError = getAvatarNameError(playerAvatar, playerName);
    if (avatarError) {
      setErrorToast(avatarError);
      return;
    }
    const finalName = playerName.trim() || 'Colono';
    setPlayerName(finalName);

    if (!socketRef.current || !socketRef.current.connected) {
      // Si el servidor no está conectado, crear sala local inmediatamente con el motor completo
      const roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const localState = createConfiguredGameState(
        roomCode,
        {
          id: playerId,
          name: finalName,
          color: playerColor,
          avatar: playerAvatar,
        },
        options
      );
      localEngineRoomRef.current = true;
      activeRoomRef.current = roomCode;
      joinedRoomRef.current = roomCode;
      setConnected(true);
      setGameState(localState);
      return;
    }
    setCreatingRoom(true);
    socketRef.current.emit('CREATE_ROOM', {
      playerId,
      playerName: finalName,
      color: playerColor,
      avatar: playerAvatar,
      options,
    });
  };

  const joinRoom = (code: string) => {
    const avatarError = getAvatarNameError(playerAvatar, playerName);
    if (avatarError) {
      setErrorToast(avatarError);
      return;
    }
    if (!socketRef.current) return;
    if (!socketRef.current.connected) {
      socketRef.current.connect();
      setErrorToast('Conectando con el servidor... Reintenta en unos instantes.');
      return;
    }
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorToast('Introduce un código de sala válido.');
      return;
    }
    const finalName = playerName.trim() || 'Colono';
    setPlayerName(finalName);
    socketRef.current.emit('JOIN_ROOM', {
      roomCode: cleanCode,
      playerId,
      playerName: finalName,
      color: playerColor,
      avatar: playerAvatar,
    });
  };

  const dispatchAction = (action: GameAction) => {
    if (!gameState) return;

    // Si estamos ejecutando el motor local (o si el usuario activa BARBARIANS / EXPLORERS_AND_PIRATES en un servidor remoto desactualizado)
    if (localEngineRoomRef.current) {
      if (
        action.type === 'UPDATE_CONFIG' &&
        action.config.expansionModule &&
        action.config.expansionModule !== 'BARBARIANS' &&
        action.config.expansionModule !== 'EXPLORERS_AND_PIRATES' &&
        socketRef.current?.connected
      ) {
        localEngineRoomRef.current = false;
      } else {
        const res = applyGameAction(gameState, playerId, action);
        if (res.error) {
          setErrorToast(res.error);
        } else {
          setGameState(res.state);
        }
        return;
      }
    }

    if (!socketRef.current) return;
    if (!socketRef.current.connected) {
      // Fallback instantáneo a motor local si se pierde la conexión durante la configuración o partida con bots
      localEngineRoomRef.current = true;
      const res = applyGameAction(gameState, playerId, action);
      if (res.error) setErrorToast(res.error);
      else setGameState(res.state);
      return;
    }
    if (joinedRoomRef.current !== gameState.roomCode) {
      setErrorToast('Recuperando la sala y sus opciones. Espera a que termine la reconexión.');
      return;
    }
    socketRef.current.emit('GAME_ACTION', {
      roomCode: gameState.roomCode,
      playerId,
      action,
    });
  };

  const leaveRoomClient = () => {
    localEngineRoomRef.current = false;
    activeRoomRef.current = null;
    joinedRoomRef.current = null;
    if (gameState && socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('GAME_ACTION', {
        roomCode: gameState.roomCode,
        playerId,
        action: { type: 'ABANDON_GAME' },
      });
    }
    sessionStorage.removeItem('catan_active_room');
    setGameState(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <GameContext.Provider
      value={{
        playerId,
        playerName,
        setPlayerName,
        playerColor,
        setPlayerColor,
        playerAvatar,
        setPlayerAvatar,
        lowEndPcMode,
        setLowEndPcMode,
        serverUrl,
        updateServerUrl,
        gameState,
        connected,
        reconnectSocket,
        errorToast,
        showErrorToast: (msg: string) => setErrorToast(msg),
        clearErrorToast: () => setErrorToast(null),
        createRoom,
        creatingRoom,
        joinRoom,
        dispatchAction,
        leaveRoomClient,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame debe usarse dentro de GameProvider');
  return ctx;
}

