import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Compass,
  Crown,
  Globe,
  LogIn,
  Monitor,
  PlusCircle,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { AVATAR_LIST, DEPOR_AVATAR, PLAYER_COLORS } from '../../shared/constants';
import { PlayerColor } from '../../shared/types';
import { AvatarIcon } from '../UI/ResourceIcon';

export const MainMenu: React.FC = () => {
  const {
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
    connected,
    showErrorToast,
    createRoom,
    joinRoom,
  } = useGame();

  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [customUrlInput, setCustomUrlInput] = useState<string>(serverUrl);
  const [showServerConfig, setShowServerConfig] = useState<boolean>(!connected);

  useEffect(() => {
    setCustomUrlInput(serverUrl);
  }, [serverUrl]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setJoinCodeInput(code.toUpperCase());
    }
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createRoom();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    joinRoom(joinCodeInput);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#040d1a]">
      {/* ANIMATED CINEMATIC LANDSCAPE BACKGROUND (SUNSET OVER CATAN ISLAND) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Golden Sunset Sky Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b] via-[#7c2d12]/55 to-[#041829]" />

        {/* Animated Glowing Sun */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.75, 0.92, 0.75] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-12 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gradient-to-b from-amber-300 via-orange-500 to-transparent blur-3xl opacity-75"
        />

        {/* Animated Drifting Clouds & Mountain Silhouettes SVG */}
        <svg
          viewBox="0 0 1440 800"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-0 w-full h-full opacity-55"
        >
          {/* Distant Island Mountains */}
          <polygon
            points="120,560 340,320 560,560"
            fill="#1e293b"
          />
          <polygon
            points="380,560 690,240 980,560"
            fill="#0f172a"
          />
          <polygon
            points="780,560 1060,310 1320,560"
            fill="#1e293b"
          />
          {/* Ocean Horizon */}
          <rect x="0" y="555" width="1440" height="250" fill="#062238" />
        </svg>

        {/* Hexagonal Grid Shimmer Overlay */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      {/* Main Glassmorphic Tabletop Container */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-slate-900/90 backdrop-blur-2xl border-2 border-amber-500/35 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden"
      >
        {/* Left Hero / Branding Column */}
        <div className="lg:col-span-5 p-8 flex flex-col justify-between bg-gradient-to-br from-amber-950/75 via-slate-900/95 to-sky-950/80 border-b lg:border-b-0 lg:border-r border-amber-500/25">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-semibold mb-4">
              <Monitor className="w-3.5 h-3.5" />
              <span>Edición Desktop & Tabletop 3D</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 drop-shadow">
              CATAN
            </h1>
            <p className="text-sm text-amber-100/85 font-medium mt-1">
              Un proyecto hecho con fines lúdicos y educativos en honor al gran juego de mesa, creado por gomesixio.
            </p>

            <div className="mt-6 space-y-3.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <Compass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-100">Losetas 3D con Texturas Reales:</strong> Bisel de
                  cartón prensado, sombras proyectadas, Ladrón encapuchado con impacto sísmico y
                  físicas de dados y cartas.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-100">Expansiones y Editor Libre:</strong> Soporte
                  modular para <em>Navegantes</em>, <em>Ciudades y Caballeros</em> y{' '}
                  <em>Bárbaros</em>, más editor manual de tablero y mapas de 5-6 jugadores.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-100">6 Reglas de la Casa (House Rules):</strong>{' '}
                  Distancia reducida (1 arista), límite de 1 infraestructura, exclusividad
                  Comerciar/Quemar y Castigo del 7 automático.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Servidor de Partida:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowServerConfig(!showServerConfig)}
                className={`inline-flex items-center gap-1.5 font-semibold text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  connected
                    ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-500/60'
                    : 'text-amber-300 bg-amber-950/50 border-amber-500/40 hover:border-amber-400 animate-pulse'
                }`}
                title="Configurar dirección del host"
              >
                {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>{connected ? 'Conectado' : 'Sin Conexión • Ajustar'}</span>
              </button>
            </div>

            {/* Server Configuration Drawer */}
            {(showServerConfig || !connected) && (
              <div className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/35 text-xs space-y-2 shadow-inner">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Enlace del Servidor Host</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Si tu compañero es el host o juegas en remoto, pega aquí su URL de ngrok (o IP local):
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://...ngrok-free.dev"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-amber-100 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => updateServerUrl(customUrlInput)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Conectar</span>
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                  <span className="truncate max-w-[170px]" title={serverUrl}>
                    Destino: <span className="text-slate-200 font-mono">{serverUrl}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomUrlInput('http://localhost:3000');
                      updateServerUrl('http://localhost:3000');
                    }}
                    className="text-amber-400/90 hover:underline cursor-pointer ml-2"
                  >
                    Host Local
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 p-8 space-y-6">
          {/* 1. Player Identity */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>1. Tu Perfil de Colono</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Nombre del Jugador
              </label>
              <input
                type="text"
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ej. Lord Catan..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 focus:border-amber-500 focus:outline-none text-slate-100 font-medium text-sm"
              />
            </div>

            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Selecciona tu Emblema
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {AVATAR_LIST.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      setPlayerAvatar(av);
                      if (
                        av === DEPOR_AVATAR &&
                        playerName.trim().toLowerCase() !== 'mantecado de coco'
                      ) {
                        showErrorToast('te falta flow');
                      }
                    }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition cursor-pointer overflow-hidden p-1 ${
                      playerAvatar === av
                        ? 'bg-amber-500/25 border-2 border-amber-400 scale-105 shadow-md'
                        : 'bg-slate-800/70 border border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <AvatarIcon avatar={av} className="w-7 h-7" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Color de Piezas de Madera
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(Object.keys(PLAYER_COLORS) as PlayerColor[]).map((colorKey) => {
                  const cfg = PLAYER_COLORS[colorKey];
                  const selected = playerColor === colorKey;
                  return (
                    <button
                      key={colorKey}
                      type="button"
                      onClick={() => setPlayerColor(colorKey)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition cursor-pointer ${
                        selected
                          ? 'bg-slate-800 border-amber-400 ring-2 ring-amber-400/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full border-2 shadow-sm"
                        style={{
                          backgroundColor: cfg.primary,
                          borderColor: cfg.stroke,
                        }}
                      />
                      <span className="text-[10px] font-medium text-slate-300 truncate max-w-full">
                        {cfg.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-800" />

          {/* 2. Create or Join Room */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-100">2. Sala Multijugador</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Create Room Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-950/25 border border-amber-500/35 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-300">Crear Sala (Anfitrión)</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Elige expansiones, tamaño del mapa (3-4J, 5-6J o Editor Libre) y configura las
                    reglas de la casa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Crear Sala</span>
                </button>
              </div>

              {/* Join Room Card */}
              <form
                onSubmit={handleJoin}
                className="p-4 rounded-2xl bg-slate-950/75 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-sm font-bold text-sky-300">Unirse a Sala</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Introduce el código de 6 caracteres de la partida:
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="EJ: CAT42X"
                    className="mt-2.5 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-sky-400 focus:outline-none text-center font-mono text-base font-extrabold tracking-widest uppercase text-sky-200"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-3 w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Unirse a Sala</span>
                </button>
              </form>
            </div>

            {/* 3. Low-End PC Performance Mode Switch */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-amber-200">
                  Modo de Animaciones Simplificadas (Bajo Consumo)
                </div>
                <div className="text-[11px] text-slate-400">
                  Desactiva efectos pesados de Framer Motion y bloquea el arrastre (Pan) del mapa en (0, 0).
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={lowEndPcMode}
                onClick={() => setLowEndPcMode(!lowEndPcMode)}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                  lowEndPcMode ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                    lowEndPcMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
