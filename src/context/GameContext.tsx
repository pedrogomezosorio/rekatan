import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
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
  createRoom: () => void;
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
    const saved = localStorage.getItem('catan_server_url');
    if (saved) return saved;
    // In standalone electron with embedded dist server, port is random, default to host port 3000
    if (window.location.hostname === '127.0.0.1' && window.location.port !== '3000') {
      return 'https://rekatan.onrender.com';
    }
    return window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
  });

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef<string | null>(null);

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
      setConnected(true);
      // If we were in a room, automatically rejoin on reconnect!
      const savedRoom = activeRoomRef.current || sessionStorage.getItem('catan_active_room');
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
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] Reconnected successfully on attempt #${attemptNumber}`);
      setConnected(true);
      const savedRoom = activeRoomRef.current || sessionStorage.getItem('catan_active_room');
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

    socket.on('ROOM_JOINED', (payload: { roomCode: string; playerId: string; state: GameState }) => {
      activeRoomRef.current = payload.roomCode;
      sessionStorage.setItem('catan_active_room', payload.roomCode);
      setGameState(payload.state);
      // Update URL query without reloading
      const url = new URL(window.location.href);
      url.searchParams.set('room', payload.roomCode);
      window.history.replaceState({}, '', url.toString());
    });

    socket.on('ROOM_STATE', (state: GameState) => {
      setGameState(state);
    });

    socket.on('ACTION_ERROR', (payload: { message: string }) => {
      setErrorToast(payload.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [playerId, serverUrl]);

  useEffect(() => {
    if (!errorToast) return;
    const timer = setTimeout(() => setErrorToast(null), 4500);
    return () => clearTimeout(timer);
  }, [errorToast]);

  const reconnectSocket = () => {
    if (!socketRef.current) return;
    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
  };

  const createRoom = () => {
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
    const finalName = playerName.trim() || 'Colono';
    setPlayerName(finalName);
    socketRef.current.emit('CREATE_ROOM', {
      playerId,
      playerName: finalName,
      color: playerColor,
      avatar: playerAvatar,
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
    if (!socketRef.current) return;
    if (!socketRef.current.connected) {
      socketRef.current.connect();
      setErrorToast('Reconectando con el servidor... Inténtalo de nuevo en unos segundos.');
      return;
    }
    if (!gameState) return;
    socketRef.current.emit('GAME_ACTION', {
      roomCode: gameState.roomCode,
      playerId,
      action,
    });
  };

  const leaveRoomClient = () => {
    if (gameState && socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('GAME_ACTION', {
        roomCode: gameState.roomCode,
        playerId,
        action: { type: 'ABANDON_GAME' },
      });
    }
    activeRoomRef.current = null;
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

