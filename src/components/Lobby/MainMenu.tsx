import React, { useEffect, useState } from 'react';
import {
  Anchor,
  Bot,
  Castle,
  Check,
  Globe,
  LoaderCircle,
  LogIn,
  PlusCircle,
  Settings2,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { AVATAR_LIST, PLAYER_COLORS } from '../../shared/constants';
import { ROOM_PRESETS, RoomPresetId } from '../../shared/roomPresets';
import type { BotDifficulty, PlayerColor } from '../../shared/types';
import { AvatarIcon } from '../UI/ResourceIcon';
import { CitiesKnightsOverview } from './CitiesKnightsOverview';

const control =
  'w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-3 text-sm text-stone-100 focus:outline-none focus:border-amber-400';
type Family = 'BASE' | 'SEAFARERS' | 'CITIES_AND_KNIGHTS';
const familyPresets: Record<Family, RoomPresetId[]> = {
  BASE: ['BASE_3_4', 'BASE_5_6'],
  SEAFARERS: ['SEAFARERS_3', 'SEAFARERS_4', 'SEAFARERS_5_6'],
  CITIES_AND_KNIGHTS: ['CITIES_KNIGHTS_3_4', 'CITIES_KNIGHTS_5_6'],
};

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
    createRoom,
    creatingRoom,
    joinRoom,
  } = useGame();
  const [family, setFamily] = useState<Family>('BASE');
  const [presetId, setPresetId] = useState<RoomPresetId>('BASE_3_4');
  const [playerCount, setPlayerCount] = useState(3);
  const [voluntaryDefense, setVoluntaryDefense] = useState(false);
  const [difficulty, setDifficulty] = useState<BotDifficulty>('MEDIUM');
  const [joinCode, setJoinCode] = useState('');
  const [customUrl, setCustomUrl] = useState(serverUrl);
  const [showServer, setShowServer] = useState(false);
  useEffect(() => {
    setCustomUrl(serverUrl);
  }, [serverUrl]);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('room');
    if (code) setJoinCode(code.toUpperCase());
  }, []);
  const preset = ROOM_PRESETS[presetId];
  const extended = preset.config.maxPlayers === 6;
  const choosePreset = (id: RoomPresetId) => {
    setPresetId(id);
    setPlayerCount(ROOM_PRESETS[id].players[0]);
  };
  const chooseFamily = (next: Family) => {
    setFamily(next);
    choosePreset(familyPresets[next][next === 'SEAFARERS' ? 1 : 0]);
  };
  const create = (playWithBots: boolean) =>
    createRoom({
      preset: presetId,
      playWithBots,
      playerCount,
      botDifficulty: difficulty,
      voluntaryDefense: family === 'CITIES_AND_KNIGHTS' && voluntaryDefense,
    });

  return (
    <main className="main-menu min-h-[100dvh] bg-[#0b1217] bg-[radial-gradient(ellipse_at_top,#233429_0%,transparent_65%)] p-3 sm:p-6 text-stone-100">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3 py-3 sm:py-5 mb-3 sm:mb-5">
          <div>
            <p className="font-display text-3xl sm:text-4xl font-extrabold tracking-wider text-amber-300">
              REKATAN
            </p>
            <p className="mt-1 text-xs sm:text-sm text-stone-400">
              Tu mesa de Catán, con amigos o con bots.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowServer((v) => !v)}
            aria-expanded={showServer}
            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${connected ? 'border-emerald-600/50 text-emerald-300 bg-emerald-950/30' : 'border-amber-600/60 text-amber-200'}`}
          >
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}{' '}
            {connected ? 'Conectado' : 'Conectando…'} <Settings2 size={14} />
          </button>
        </header>
        {showServer && (
          <section
            className="mb-5 rounded-2xl border border-stone-700 bg-stone-900 p-4 space-y-3"
            aria-label="Servidor de partida"
          >
            <label
              className="block text-xs text-stone-300"
              htmlFor="server-url"
            >
              Servidor de partida
            </label>
            <div className="flex gap-2">
              <input
                id="server-url"
                className={`${control} min-w-0`}
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <button
                type="button"
                className="rounded-xl px-4 bg-amber-400 text-stone-950 font-bold"
                onClick={() => updateServerUrl(customUrl)}
              >
                Conectar
              </button>
            </div>
            <button
              type="button"
              className="text-xs text-amber-200 underline"
              onClick={() => updateServerUrl(window.location.origin)}
            >
              Usar el servidor de esta web
            </button>
            <p className="text-xs text-stone-400 break-all">
              Conectando a {serverUrl}
            </p>
          </section>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 sm:gap-6 items-start">
          <section
            className="min-w-0 rounded-3xl border border-stone-700/80 bg-[#151d21]/95 p-4 sm:p-6 space-y-5"
            aria-label="Crear una partida"
          >
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                Elige tu partida
              </h1>
              <p className="text-sm text-stone-400 mt-1">
                Selecciona el juego y cuántas personas participan.
              </p>
            </div>
            <div
              className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2 sm:gap-3"
              aria-label="Juego o expansión"
            >
              {(
                [
                  {
                    id: 'BASE',
                    name: 'Juego base',
                    text: 'Construye y comercia',
                    Icon: Globe,
                  },
                  {
                    id: 'SEAFARERS',
                    name: 'Navegantes',
                    text: 'Islas, barcos y oro',
                    Icon: Anchor,
                  },
                  {
                    id: 'CITIES_AND_KNIGHTS',
                    name: 'Ciudades y Caballeros',
                    text: 'Mercancías y defensa',
                    Icon: Castle,
                  },
                ] as const
              ).map(({ id, name, text, Icon }) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={family === id}
                  onClick={() => chooseFamily(id)}
                  className={`flex min-h-20 items-center min-[420px]:items-start min-[420px]:flex-col gap-2 rounded-2xl border p-3 text-left transition ${family === id ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/40' : 'border-stone-700 bg-stone-950/30 hover:border-stone-500'}`}
                >
                  <Icon
                    size={23}
                    className={
                      family === id
                        ? 'text-amber-300 shrink-0'
                        : 'text-stone-400 shrink-0'
                    }
                  />
                  <span>
                    <strong className="block text-sm leading-snug">
                      {name}
                    </strong>
                    <span className="text-[11px] text-stone-400">{text}</span>
                  </span>
                </button>
              ))}
            </div>
            <fieldset className="space-y-2">
              <legend className="text-xs uppercase font-semibold tracking-wider text-stone-400 mb-2">
                Modalidad de jugadores
              </legend>
              <div
                className={`grid ${family === 'SEAFARERS' ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}
              >
                {familyPresets[family].map((id) => (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={presetId === id}
                    onClick={() => choosePreset(id)}
                    className={`min-h-14 rounded-xl border p-3 font-bold text-sm ${presetId === id ? 'border-emerald-400 bg-emerald-900/25 text-emerald-100' : 'border-stone-700 text-stone-400'}`}
                  >
                    {id === 'SEAFARERS_3'
                      ? '2–3 jugadores'
                      : id === 'SEAFARERS_4'
                        ? '4 jugadores'
                        : id.endsWith('5_6')
                          ? '5–6 jugadores'
                          : '3–4 jugadores'}
                  </button>
                ))}
              </div>
            </fieldset>
            {family === 'CITIES_AND_KNIGHTS' ? (
              <CitiesKnightsOverview extended={extended} />
            ) : (
              <p className="rounded-2xl bg-stone-950/40 px-4 py-3 text-sm text-stone-300">
                {family === 'SEAFARERS'
                  ? 'Empieza en Rumbo a nuevas orillas. En la sala puedes elegir los demás escenarios y sus mapas.'
                  : `${preset.landHexes} terrenos, ${extended ? 11 : 9} puertos y la carrera por alcanzar 10 puntos de victoria.`}
              </p>
            )}
            {family === 'CITIES_AND_KNIGHTS' && (
              <label className="flex items-start gap-2 text-xs text-stone-400">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-amber-400"
                  checked={voluntaryDefense}
                  onChange={(e) => setVoluntaryDefense(e.target.checked)}
                />
                <span>
                  Variante opcional «doña Urraca»: cada jugador elige qué
                  caballeros defienden.
                </span>
              </label>
            )}
            <div className="rounded-2xl border border-stone-700/70 p-3 sm:p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-stone-300 space-y-1.5">
                  <span className="block">Participantes, tú incluido</span>
                  <select
                    className={control}
                    value={playerCount}
                    onChange={(e) => setPlayerCount(Number(e.target.value))}
                  >
                    {preset.players.map((n) => (
                      <option key={n} value={n}>
                        {n} jugadores
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-stone-300 space-y-1.5">
                  <span className="block">Dificultad de los bots</span>
                  <select
                    className={control}
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(e.target.value as BotDifficulty)
                    }
                  >
                    <option value="EASY">Fácil</option>
                    <option value="MEDIUM">Normal</option>
                    <option value="HARD">Difícil</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                disabled={!connected || creatingRoom}
                aria-busy={creatingRoom}
                onClick={() => create(true)}
                className="w-full min-h-12 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-3 text-stone-950 font-extrabold flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {creatingRoom ? (
                  <LoaderCircle className="animate-spin" size={19} />
                ) : (
                  <Bot size={19} />
                )}{' '}
                {creatingRoom ? 'Preparando partida…' : 'Jugar con bots'}
              </button>
              <p className="text-center text-[11px] text-stone-400">
                Tú y {playerCount - 1} bots · {preset.title} · partida lista
                para colocar tus piezas.
              </p>
              <button
                type="button"
                disabled={!connected || creatingRoom}
                onClick={() => create(false)}
                className="w-full min-h-12 rounded-xl border border-stone-600 hover:border-amber-300 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <PlusCircle size={18} /> Crear sala multijugador
              </button>
              <p className="text-center text-[11px] text-stone-400">
                Comparte el código, invita a tus amigos y configura las reglas
                antes de empezar.
              </p>
            </div>
          </section>
          <aside className="min-w-0 space-y-4">
            <section
              className="rounded-2xl border border-stone-700 bg-[#151d21] p-4 space-y-4"
              aria-label="Tu perfil"
            >
              <h2 className="font-bold text-sm flex items-center gap-2">
                <Users size={17} className="text-amber-300" /> Tu perfil de
                colono
              </h2>
              <label
                className="block text-xs text-stone-300 space-y-2"
                htmlFor="player-name"
              >
                <span>Nombre del jugador</span>
                <input
                  id="player-name"
                  maxLength={33}
                  placeholder="Tu nombre"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className={control}
                />
              </label>
              <div
                className="grid grid-cols-6 gap-2"
                aria-label="Color de las piezas"
              >
                {(Object.keys(PLAYER_COLORS) as PlayerColor[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${PLAYER_COLORS[c].name}`}
                    aria-pressed={playerColor === c}
                    onClick={() => setPlayerColor(c)}
                    className="h-10 min-w-0 rounded-lg border-2 flex items-center justify-center"
                    style={{
                      backgroundColor: PLAYER_COLORS[c].primary,
                      borderColor:
                        playerColor === c ? '#fcd34d' : 'transparent',
                      color: c === 'WHITE' ? '#111827' : '#ffffff',
                    }}
                  >
                    {playerColor === c && <Check size={18} />}
                  </button>
                ))}
              </div>
              <details>
                <summary className="min-h-10 cursor-pointer text-xs text-stone-300 flex items-center gap-2">
                  <AvatarIcon avatar={playerAvatar} className="w-6 h-6" />{' '}
                  Cambiar emblema
                </summary>
                <div className="flex gap-2 flex-wrap mt-2">
                  {AVATAR_LIST.map((av, i) => (
                    <button
                      type="button"
                      key={av}
                      aria-label={`Emblema ${i + 1}`}
                      aria-pressed={playerAvatar === av}
                      onClick={() => setPlayerAvatar(av)}
                      className={`h-10 w-10 rounded-lg flex items-center justify-center border ${av === playerAvatar ? 'border-amber-400 bg-amber-950' : 'border-stone-700 bg-stone-950'}`}
                    >
                      <AvatarIcon avatar={av} className="w-7 h-7" />
                    </button>
                  ))}
                </div>
              </details>
            </section>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                joinRoom(joinCode);
              }}
              className="rounded-2xl border border-sky-900/70 bg-sky-950/20 p-4 space-y-3"
            >
              <h2 className="font-bold text-sm text-sky-200">
                ¿Ya tienes un código?
              </h2>
              <label
                htmlFor="room-code"
                className="block text-xs text-stone-400"
              >
                Código de sala
              </label>
              <input
                id="room-code"
                className={`${control} uppercase font-mono tracking-widest text-center`}
                maxLength={6}
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              <button
                type="submit"
                disabled={!connected || creatingRoom}
                className="min-h-11 w-full rounded-xl bg-sky-900 px-3 py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LogIn size={17} /> Unirse a sala
              </button>
            </form>
            <label className="flex items-start gap-3 rounded-2xl border border-stone-800 p-4 text-xs text-stone-400">
              <input
                type="checkbox"
                checked={lowEndPcMode}
                onChange={(e) => setLowEndPcMode(e.target.checked)}
                className="mt-0.5 accent-amber-400"
              />
              <span>
                <strong className="block text-stone-200 mb-1">
                  Animaciones simplificadas
                </strong>
                Menos efectos para móviles y equipos con pocos recursos.
              </span>
            </label>
          </aside>
        </div>
        <p className="text-center py-5 text-[11px] text-stone-500">
          Juego base · Navegantes · Ciudades y Caballeros · Multijugador en
          tiempo real
        </p>
      </div>
    </main>
  );
};
