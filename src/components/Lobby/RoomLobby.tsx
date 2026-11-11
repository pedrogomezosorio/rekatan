import { CitiesKnightsOverview } from './CitiesKnightsOverview';
import { CK_CONFLICTING_SCENARIOS, hasCitiesKnights } from '../../shared/citiesKnightsConfig';
import { playerCardStyle } from '../UI/playerCardStyle';
import React, { useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  Crown,
  Dices,
  Edit3,
  Layers,
  Link2,
  LogOut,
  Play,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import {
  ALL_RESOURCES,
  EXPANSION_CATALOG,
  PLAYER_COLORS,
  RESOURCE_META,
  SEAFARERS_SCENARIOS,
  TERRAIN_META,
  TILE_TEXTURE_PATHS,
} from '../../shared/constants';
import { BoardMode, BotDifficulty, ExpansionModule, PortType, SeafarersBoardSize, SeafarersScenario, TerrainType } from '../../shared/types';
import { EditorToolState, HexBoardSVG } from '../Board/HexBoardSVG';
import { AvatarIcon, ResourceIcon } from '../UI/ResourceIcon';
import { SEAFARERS_PLAYER_LIMITS } from '../../shared/seafarersConfig';
import { getVariableSetupDescription } from '../../shared/engine/seafarersSetup';
import { OriginalWonderCards } from '../Game/WondersPanel';

export const RoomLobby: React.FC = () => {
  const { gameState, playerId, dispatchAction, leaveRoomClient, lowEndPcMode, setLowEndPcMode } =
    useGame();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>('MEDIUM');

  const [editorTool, setEditorTool] = useState<EditorToolState>({
    active: false,
    mode: 'SWAP',
    selectedTerrain: 'WOOD',
    selectedNumber: 6,
    selectedPort: 'GENERIC',
  });

  if (!gameState) return null;

  const me = gameState.players.find((p) => p.id === playerId);
  const isHost = Boolean(me?.isHost);
  const { config, board, players } = gameState;
  const enabledExpansions = config.enabledExpansions || ['BASE'];
  const allowsAdjacentReds = config.expansionModule === 'SEAFARERS' && config.seafarersScenario === 'OCEANIA';
  const requiresSeparatedReds = config.expansionModule === 'SEAFARERS' &&
    ['HEADING_FOR_NEW_SHORES', 'THROUGH_THE_DESERT', 'NEW_WORLD', 'PROCEDURAL_ARCHIPELAGO'].includes(config.seafarersScenario || 'HEADING_FOR_NEW_SHORES');

  const copyRoomCode = () => {
    navigator.clipboard.writeText(gameState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${gameState.roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSelectExpansion = (expId: ExpansionModule) => {
    if (!isHost) return;
    if (expId === 'BASE') {
      dispatchAction({ type: 'UPDATE_CONFIG', config: { enabledExpansions: ['BASE'], expansionModule: 'BASE', victoryPointsTarget: 10, desertInCenter: true } });
      return;
    }
    const compatible = expId === 'SEAFARERS' || expId === 'CITIES_AND_KNIGHTS';
    const selected: ExpansionModule[] = compatible ? enabledExpansions.filter(e => e === 'BASE' || e === 'SEAFARERS' || e === 'CITIES_AND_KNIGHTS') : ['BASE'];
    const next = selected.includes(expId) ? selected.filter(e => e !== expId) : [...selected, expId];
    const primary = next.includes('SEAFARERS') ? 'SEAFARERS' : next.includes('CITIES_AND_KNIGHTS') ? 'CITIES_AND_KNIGHTS' : next.find(e => e !== 'BASE') || 'BASE';
    dispatchAction({ type: 'UPDATE_CONFIG', config: {
      enabledExpansions: next, expansionModule: primary,
      ...(primary === 'SEAFARERS' ? { seafarersScenario: config.seafarersScenario || 'HEADING_FOR_NEW_SHORES', desertInCenter: false } : { desertInCenter: true }),
      ...(next.includes('CITIES_AND_KNIGHTS') ? {} : { victoryPointsTarget: primary === 'BASE' ? 10 : primary === 'SEAFARERS' ? (SEAFARERS_SCENARIOS.find(s => s.id === config.seafarersScenario)?.recommendedVP || 13) : 13 }),
    } });
  };

  const handleSelectScenario = (scenarioId: SeafarersScenario, recommendedVP: number = 13) => {
    if (!isHost) return;
    dispatchAction({
      type: 'UPDATE_CONFIG',
      config: {
        expansionModule: 'SEAFARERS',
        enabledExpansions: hasCitiesKnights(config) ? ['BASE', 'SEAFARERS', 'CITIES_AND_KNIGHTS'] : ['BASE', 'SEAFARERS'],
        seafarersScenario: scenarioId,
        victoryPointsTarget: recommendedVP + (hasCitiesKnights(config) ? 2 : 0),
        desertInCenter: false,
      },
    });
  };

  const handleBoardModeSelect = (mode: BoardMode) => {
    if (!isHost) return;
    if (mode === 'CUSTOM') {
      setEditorTool((prev) => ({ ...prev, active: true }));
      dispatchAction({ type: 'UPDATE_CONFIG', config: { boardMode: 'CUSTOM' } });
    } else {
      setEditorTool((prev) => ({ ...prev, active: false }));
      dispatchAction({ type: 'UPDATE_CONFIG', config: { boardMode: mode } });
    }
  };

  return (
    <div className="room-lobby h-screen h-[100dvh] w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <header className="room-lobby-header h-16 px-4 sm:px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl font-extrabold text-amber-400 tracking-wider">
            CATAN
          </span>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2 bg-slate-950 border border-amber-500/40 px-3 py-1 rounded-xl">
            <span className="text-xs text-slate-400">Sala:</span>
            <span className="font-mono text-sm font-black tracking-widest text-amber-300">
              {gameState.roomCode}
            </span>
            <button
              onClick={copyRoomCode}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-amber-300 transition"
              title="Copiar código"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <button
            onClick={copyShareLink}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold transition cursor-pointer"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Link2 className="w-3.5 h-3.5" />
            )}
            <span>{copiedLink ? '¡Enlace Copiado!' : 'Compartir Enlace'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isHost && <button type="button" onClick={() => dispatchAction({ type: 'START_WITH_BOTS', difficulty: selectedDifficulty })} className="lobby-quick-start min-h-11 rounded-xl border border-emerald-500/50 bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-100 flex items-center gap-2"><Bot size={16}/><span>Completar con bots y jugar</span></button>}
          {isHost ? (
            <button
              onClick={() => dispatchAction({ type: 'START_GAME' })}
              disabled={players.length < (hasCitiesKnights(config) ? 3 : 2)}
              className={`px-5 py-2 rounded-xl font-extrabold text-sm flex items-center gap-2 shadow-lg transition cursor-pointer ${
                players.length >= (hasCitiesKnights(config) ? 3 : 2)
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar Partida ({players.length}/{config.maxPlayers})</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              Esperando a que el anfitrión inicie la partida...
            </div>
          )}

          <button
            onClick={leaveRoomClient}
            className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/70 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Main Content Split: Left Settings/Players + Right Live Board & Custom Builder */}
      <div className="room-lobby-grid flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Configuration Column */}
        <div className="room-lobby-options lg:col-span-5 xl:col-span-4 bg-slate-900/90 border-r border-slate-800 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* 1. Players Section with Bot AI Difficulty Controls */}
          <section className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span>
                  Jugadores en Sala ({players.length}/{config.maxPlayers})
                </span>
              </h3>
              {isHost && players.length < config.maxPlayers && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => dispatchAction({ type: 'ADD_BOT', difficulty: selectedDifficulty })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-semibold transition cursor-pointer"
                    title="Añadir 1 bot a la sala"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>+ Añadir Bot</span>
                  </button>
                  <button
                    onClick={() => dispatchAction({ type: 'FILL_ROOM_WITH_BOTS', difficulty: selectedDifficulty })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-semibold transition cursor-pointer"
                    title="Rellenar todos los huecos vacíos con bots"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Rellenar Sala</span>
                  </button>
                </div>
              )}
            </div>

            {/* Global Bot Difficulty Selector */}
            {isHost && (
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dificultad IA:</span>
                </div>
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'EASY', label: 'Fácil', color: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/20' },
                      { id: 'MEDIUM', label: 'Normal', color: 'text-amber-300 border-amber-500/40 bg-amber-500/20' },
                      { id: 'HARD', label: 'Difícil', color: 'text-rose-300 border-rose-500/40 bg-rose-500/20' },
                    ] as const
                  ).map((diff) => (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => {
                        setSelectedDifficulty(diff.id);
                        dispatchAction({ type: 'SET_GLOBAL_BOT_DIFFICULTY', difficulty: diff.id });
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition ${
                        (config.defaultBotDifficulty || selectedDifficulty) === diff.id
                          ? diff.color
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {players.map((p) => {
                const colorCfg = PLAYER_COLORS[p.color];
                const botDiff: BotDifficulty = p.botDifficulty || selectedDifficulty;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl border-2"
                    style={playerCardStyle(p.color)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-8 h-8 flex items-center justify-center bg-transparent text-base text-white shrink-0 p-0.5"
                      >
                        <AvatarIcon avatar={p.avatar} className="w-6 h-6" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-100 truncate">
                          <span className="truncate">{p.name}</span>
                          {p.id === playerId && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950/70 text-sky-200 font-semibold shrink-0">
                              Tú
                            </span>
                          )}
                          {p.isHost && (
                            <span title="Anfitrión" className="shrink-0">
                              <Crown className="w-3.5 h-3.5 text-amber-400" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-200 flex items-center gap-1.5 mt-0.5">
                          <span>{colorCfg.name}</span>
                          <span>•</span>
                          {p.isBot ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-indigo-300">
                              <Bot className="w-3 h-3" /> IA ({botDiff === 'EASY' ? 'Fácil' : botDiff === 'HARD' ? 'Difícil' : 'Normal'})
                            </span>
                          ) : (
                            <span>Humano</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {/* Individual Bot Difficulty Selector */}
                      {isHost && p.isBot && (
                        <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                          {(
                            [
                              { id: 'EASY', label: 'F', title: 'Fácil' },
                              { id: 'MEDIUM', label: 'N', title: 'Normal' },
                              { id: 'HARD', label: 'D', title: 'Difícil' },
                            ] as const
                          ).map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() =>
                                dispatchAction({
                                  type: 'SET_BOT_DIFFICULTY',
                                  targetPlayerId: p.id,
                                  difficulty: d.id,
                                })
                              }
                              className={`w-5 h-5 rounded text-[10px] font-black transition ${
                                botDiff === d.id
                                  ? d.id === 'EASY'
                                    ? 'bg-emerald-500 text-slate-950'
                                    : d.id === 'HARD'
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-amber-400 text-slate-950'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                              title={`Dificultad: ${d.title}`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {isHost && p.id !== playerId && (
                        <button
                          onClick={() =>
                            dispatchAction({ type: 'REMOVE_PLAYER', targetPlayerId: p.id })
                          }
                          className="p-1.5 rounded-lg text-slate-200 hover:text-red-200 hover:bg-red-950/40 transition"
                          title="Expulsar de la sala"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {config.expansionModule === 'SEAFARERS' && players.length >= config.maxPlayers && config.maxPlayers < 6 && (
              <p className="text-[11px] text-sky-300">
                Modalidad completa. Selecciona un mapa mayor en «Regla de jugadores y mapa» para ampliar la sala.
              </p>
            )}
          </section>

          {/* 2. Selector de Juego y Expansiones (Exclusivo: 1 expansión o Juego Base) */}
          <section className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>Selector de Juego / Expansión</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                (Navegantes y Ciudades y Caballeros combinables)
              </span>
            </div>

            {hasCitiesKnights(config) && <p className="text-xs text-emerald-200 p-3 border border-emerald-500/30 rounded-xl">Ciudades y Caballeros: poblado + ciudad inicial, 13 PV (escenario +2 con Navegantes), mercancías y progreso. El mapa estándar admite hasta 4; el mapa ampliado hasta 6 y añade la fase especial de construcción.</p>}
            <div className="space-y-2">
              {EXPANSION_CATALOG.map((exp) => {
                const checked = exp.id === 'BASE' ? enabledExpansions.every(e => e === 'BASE') : enabledExpansions.includes(exp.id);
                return (
                  <div
                    key={exp.id}
                    className={`rounded-xl border transition overflow-hidden ${
                      checked
                        ? 'bg-amber-500/15 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.12)]'
                        : 'bg-slate-900/75 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!isHost}
                      aria-pressed={checked}
                      onClick={() => handleSelectExpansion(exp.id)}
                      className={`w-full flex items-start justify-between gap-3 p-3 text-left transition ${
                        !isHost ? 'cursor-default' : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl mt-0.5">{exp.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-100">
                              {exp.title}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 font-semibold">
                              {exp.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            {exp.subtitle}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 transition ${
                          checked
                            ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                            : 'bg-slate-950 border-slate-700'
                        }`}
                      >
                        {checked && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                      </div>
                    </button>

                    {/* Selector interactivo de los 9 escenarios oficiales de Navegantes */}
                    {checked && exp.id === 'SEAFARERS' && (
                      <div className="p-3 pt-1 space-y-3 border-t border-sky-500/30 bg-sky-950/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                            <span>⛵</span>
                            <span>Campaña Oficial de Navegantes (9 Escenarios):</span>
                          </span>
                          <span className="text-[10px] text-sky-300 font-bold bg-sky-900/70 px-2 py-0.5 rounded border border-sky-500/40">
                            Meta Oficial: {config.victoryPointsTarget || 14} PV
                          </span>
                        </div>

                        {(['BÁSICO', 'AVANZADO', 'MUNDO LIBRE'] as const).map((cat) => {
                          const catScenarios = SEAFARERS_SCENARIOS.filter((s) => s.category === cat);
                          const catLabel =
                            cat === 'BÁSICO'
                              ? 'Escenarios 1 al 4 (Iniciación y Clásicos de Campaña)'
                              : cat === 'AVANZADO'
                              ? 'Escenarios 5 al 8 (Mecánicas Avanzadas: Telas, Piratas y Maravillas)'
                              : 'Escenario 9 y Procedural (Exploración Libre)';
                          return (
                            <div key={cat} className="space-y-1.5">
                              <div className="text-[9.5px] font-bold uppercase tracking-wider text-sky-400/80 px-1">
                                {catLabel}
                              </div>
                              <div className="space-y-1">
                                {catScenarios.map((scen) => {
                                  const conflictsWithCK = hasCitiesKnights(config) && CK_CONFLICTING_SCENARIOS.includes(scen.id as typeof CK_CONFLICTING_SCENARIOS[number]);
                                  const isScenActive =
                                    (config.seafarersScenario || 'HEADING_FOR_NEW_SHORES') === scen.id;
                                  return (
                                    <button
                                      key={scen.id}
                                      type="button"
                                      disabled={!isHost || conflictsWithCK}
                                      title={conflictsWithCK ? "Los PDF no definen cómo sustituir las cartas de desarrollo de este escenario al combinarlo con Ciudades y Caballeros." : undefined}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectScenario(scen.id, scen.recommendedVP);
                                      }}
                                      className={`w-full p-2.5 rounded-xl border text-left transition flex items-start justify-between gap-2.5 ${
                                        isScenActive
                                          ? 'bg-sky-500/25 border-sky-400 text-sky-100 shadow-[0_0_12px_rgba(56,189,248,0.25)] ring-1 ring-sky-400'
                                          : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                      } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-black text-slate-100">
                                            {scen.title}
                                          </span>
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 font-bold border border-sky-500/30">
                                            {scen.badge}
                                          </span>
                                          <span className="text-[9px] text-amber-300 font-bold ml-auto">
                                            {scen.recommendedVP + (hasCitiesKnights(config) ? 2 : 0)} PV
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">
                                          {conflictsWithCK ? "Requiere Navegantes sin Ciudades y Caballeros: utiliza cartas de desarrollo." : scen.subtitle}
                                        </p>
                                      </div>

                                      <div
                                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition ${
                                          isScenActive
                                            ? 'bg-sky-400 border-sky-200 text-slate-950 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                                            : 'bg-slate-950 border-slate-700'
                                        }`}
                                      >
                                        {isScenActive && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. Tamaño del Mapa y Editor Personalizado */}
          <section className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>{config.expansionModule === 'SEAFARERS' ? 'Regla de jugadores y mapa' : 'Tamaño del Mapa y Constructor'}</span>
              </h3>
              {!isHost && (
                <span className="text-[10px] text-slate-500 font-medium">Solo lectura</span>
              )}
            </div>

            {config.expansionModule === 'SEAFARERS' ? (() => {
              const effectiveSeafarersSize: SeafarersBoardSize =
                config.seafarersBoardSize ||
                (players.length <= 3 ? '3P' : players.length >= 5 ? '5_6P' : '4P');
              const selectedScenario =
                SEAFARERS_SCENARIOS.find((s) => s.id === config.seafarersScenario) ||
                SEAFARERS_SCENARIOS[0];
              const terrainCounts = Object.values(board.hexes).reduce<Partial<Record<TerrainType, number>>>((counts, hex) => {
                counts[hex.terrain] = (counts[hex.terrain] || 0) + 1;
                return counts;
              }, {});

              return (
                <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 text-xs space-y-3">
                  <div className="flex items-center justify-between gap-2 text-sky-300 font-extrabold">
                    <div className="flex items-center gap-2">
                      <span>⛵</span>
                      <span>Tamaño del Tablero de Navegantes</span>
                    </div>
                    <span className="text-[10px] bg-sky-900/80 border border-sky-400/50 text-sky-200 px-2 py-0.5 rounded-full font-bold">
                      {effectiveSeafarersSize === '3P'
                        ? '2-3 Jugadores'
                        : effectiveSeafarersSize === '5_6P'
                        ? '5-6 Jugadores'
                        : '4 Jugadores'}
                    </span>
                  </div>

                  {/* 3 Botones interactivos para escoger el tamaño de la isla según los PDFs oficiales */}
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        {
                          size: '3P' as const,
                          label: '2-3 Jugadores',
                          desc: 'Marco compacto',
                          badge: '3 Jugadores',
                        },
                        {
                          size: '4P' as const,
                          label: '4 Jugadores',
                          desc: 'Marco estándar',
                          badge: '4 Jugadores',
                        },
                        {
                          size: '5_6P' as const,
                          label: '5-6 Jugadores',
                          desc: 'Marco ampliado',
                          badge: 'Ampliación 5-6J',
                        },
                      ]
                    ).map((item) => {
                      const isSelected = effectiveSeafarersSize === item.size;
                      return (
                        <button
                          key={item.size}
                          type="button"
                          disabled={!isHost || players.length > SEAFARERS_PLAYER_LIMITS[item.size]}
                          title={players.length > SEAFARERS_PLAYER_LIMITS[item.size] ? `Retira jugadores para seleccionar un mapa de hasta ${SEAFARERS_PLAYER_LIMITS[item.size]}.` : `Admite hasta ${SEAFARERS_PLAYER_LIMITS[item.size]} jugadores.`}
                          aria-pressed={isSelected}
                          onClick={() => {
                            dispatchAction({
                              type: 'UPDATE_CONFIG',
                              config: {
                                seafarersBoardSize: item.size,
                                maxPlayers: SEAFARERS_PLAYER_LIMITS[item.size],
                              },
                            });
                          }}
                          className={`p-2 rounded-xl text-left border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex flex-col justify-between ${
                            isSelected
                              ? 'bg-sky-500/25 border-sky-400 text-sky-100 shadow-md shadow-sky-500/10'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          } ${!isHost ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-[11px] text-white">
                              {item.label}
                            </span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            {item.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    Escenario:{' '}
                    <strong className="text-white">
                      {selectedScenario.title}
                    </strong>.
                    <span className="block mt-0.5 text-[10px] text-sky-300/80">
                      Este mapa admite hasta {SEAFARERS_PLAYER_LIMITS[effectiveSeafarersSize]} jugadores. Puedes empezar con menos; para añadir más, escoge una modalidad mayor.
                    </span>
                    <span className="block mt-1 text-[10px] text-slate-400">
                      Formas y costas según los PDF. Los escenarios 5–8 comparten el dibujo de 3 y 4 jugadores. Adaptación de la sala: desiertos sustituidos por terrenos productivos y una capa exterior de mar decorativo.
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-300" aria-label="Inventario del mapa">
                    {([...ALL_RESOURCES, 'GOLD', 'SEA', 'FOG'] as TerrainType[]).map(terrain => terrainCounts[terrain] ? (
                      <span key={terrain}>{TERRAIN_META[terrain].name}: <strong>{terrainCounts[terrain]}</strong></span>
                    ) : null)}
                  </div>
                  <p className="text-[11px] text-sky-200" aria-live="polite">
                    {selectedScenario.id === 'NEW_WORLD' || selectedScenario.id === 'PROCEDURAL_ARCHIPELAGO' ? 'Distribución libre' : board.seafarersSetup === 'VARIABLE' ? 'Montaje opcional' : 'Montaje inicial del reglamento'}.
                    {' '}El mar situado fuera del borde azul es decorativo.
                  </p>
                  {selectedScenario.id === 'THROUGH_THE_DESERT' && effectiveSeafarersSize === '4P' && (
                    <details className="text-[11px] text-slate-300">
                      <summary className="cursor-pointer text-sky-300">Ver montaje original del reglamento (página 11)</summary>
                      <img src="/assets/scenarios/through_desert_4p_reference.png" alt="Montaje original de A través del desierto para cuatro jugadores, página 11 del reglamento" className="mt-2 w-full rounded" />
                      <p className="mt-1">La esquina inferior derecha contiene el trigo 12, junto al mineral 6. En el tablero se aplica la sustitución de desiertos por terrenos productivos de esta sala.</p>
                    </details>
                  )}

                  {selectedScenario.id === 'WONDERS_OF_CATAN' && effectiveSeafarersSize === '5_6P' && <OriginalWonderCards />}
                  {/* Apartados detallados de Puntos de Victoria, Montaje variable y Fichas Catán */}
                  <div className="space-y-1.5 pt-2 border-t border-sky-500/20 text-[11px]">
                    <div className="text-slate-200">
                      <strong className="text-amber-300 font-extrabold">🏆 Puntos de Victoria especiales:</strong>{' '}
                      {selectedScenario.specialVPRule}
                    </div>
                    <div className="text-slate-300">
                      <strong className="text-sky-300 font-extrabold">🎲 Montaje variable (Sección 4):</strong>{' '}
                      {getVariableSetupDescription(selectedScenario.id, effectiveSeafarersSize)}
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      <strong className="text-slate-300 font-bold">🪙 Fichas Catán:</strong>{' '}
                      {selectedScenario.catanChitsCount[effectiveSeafarersSize] || 0} fichas asignadas a este escenario para {effectiveSeafarersSize === '3P' ? '3' : effectiveSeafarersSize === '5_6P' ? '5-6' : '4'} jugadores.
                    </div>
                  </div>
                </div>
              );
            })() : hasCitiesKnights(config) ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2" aria-label="Modalidad de Ciudades y Caballeros">
                  {([{ mode: 'STANDARD_3_4', name: '3–4 jugadores' }, { mode: 'EXPANSION_5_6', name: '5–6 jugadores' }] as const).map(({ mode, name }) => <button key={mode} type="button" disabled={!isHost} aria-pressed={config.boardMode === mode} onClick={() => handleBoardModeSelect(mode)} className={`min-h-12 rounded-xl border p-3 text-xs font-bold ${config.boardMode === mode ? 'border-emerald-400 bg-emerald-900/30 text-emerald-100' : 'border-stone-700 text-stone-400'}`}>{name}</button>)}
                </div>
                <CitiesKnightsOverview extended={config.boardMode === 'EXPANSION_5_6'}/>
                <label className="flex items-start gap-2 text-xs text-stone-300"><input type="checkbox" disabled={!isHost} checked={!!config.citiesKnightsVoluntaryDefense} onChange={e => dispatchAction({ type: 'UPDATE_CONFIG', config: { citiesKnightsVoluntaryDefense: e.target.checked } })}/><span>Variante «doña Urraca»: elegir los caballeros que participan en cada defensa.</span></label>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      mode: 'STANDARD_3_4',
                      label: 'Estándar (3-4J)',
                      desc: 'Layout 3-4-5-4-3 (19 hex)',
                    },
                    {
                      mode: 'CUSTOM',
                      label: 'Tablero Personalizado',
                      desc: 'Coloca losetas y puertos libremente',
                    },
                    {
                      mode: 'EXPANSION_5_6',
                      label: '5-6 Jugadores',
                      desc: 'Layout 3-4-5-6-5-4-3 (30 hex)',
                    },
                    {
                      mode: 'MEGA_RADIUS_3',
                      label: 'Gran Isla (Radio 3)',
                      desc: '37 hexágonos de terreno',
                    },
                  ] as const
                ).map((item) => {
                  const active = config.boardMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      disabled={!isHost}
                      onClick={() => handleBoardModeSelect(item.mode)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        active
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                      } ${!isHost ? 'opacity-75 cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {isHost && (
              <div className="pt-2 flex flex-col gap-2">
                {config.expansionModule === 'SEAFARERS' ? (
                  <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
                    <span>Desierto en el Centro (q:0, r:0, s:0)</span>
                    <span className="text-[10px] font-semibold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/30">
                      Desiertos sustituidos por terrenos productivos
                    </span>
                  </div>
                ) : (
                  <label className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800 cursor-pointer">
                    <span>Desierto en el Centro (q:0, r:0, s:0)</span>
                    <input
                      type="checkbox"
                      checked={config.desertInCenter !== false}
                      onChange={(e) =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { desertInCenter: e.target.checked },
                        })
                      }
                      className="accent-amber-500 w-4 h-4"
                    />
                  </label>
                )}

                <label className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800 cursor-pointer">
                  <span>{allowsAdjacentReds ? 'Oceanía permite 6 y 8 contiguos (apartado 4)' : `No juntar 6 y 8 rojos al generar${requiresSeparatedReds ? ' (regla del escenario)' : ''}`}</span>
                  <input
                    type="checkbox"
                    checked={requiresSeparatedReds || (!allowsAdjacentReds && config.preventAdjacentRedNumbers)}
                    disabled={!isHost || allowsAdjacentReds || requiresSeparatedReds}
                    onChange={(e) =>
                      dispatchAction({
                        type: 'UPDATE_CONFIG',
                        config: { preventAdjacentRedNumbers: e.target.checked },
                      })
                    }
                    className="accent-amber-500 w-4 h-4"
                  />
                </label>

                <div className="flex gap-2">
                  {config.expansionModule === 'SEAFARERS' && (
                    <button
                      type="button"
                      onClick={() => dispatchAction({ type: 'GENERATE_BOARD', randomizeVariableSetup: false })}
                      className="py-2 px-3 rounded-xl bg-sky-950 border border-sky-700 text-sky-200 text-xs font-bold cursor-pointer"
                    >
                      Montaje inicial
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      dispatchAction({
                        type: 'GENERATE_BOARD',
                        preventAdjacentRedNumbers: config.preventAdjacentRedNumbers,
                        desertInCenter: config.expansionModule === 'SEAFARERS' ? false : (config.desertInCenter !== false),
                        randomizeVariableSetup: config.expansionModule === 'SEAFARERS' ? true : undefined,
                      })
                    }
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Dices className="w-4 h-4 text-amber-400" />
                    <span>
                      {config.expansionModule === 'SEAFARERS'
                        ? 'Regenerar Escenario de Navegantes'
                        : 'Generar Mapa Aleatorio'}
                    </span>
                  </button>

                  {config.expansionModule !== 'SEAFARERS' && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditorTool((prev) => ({ ...prev, active: !prev.active }))
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                        editorTool.active
                          ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{editorTool.active ? 'Cerrar Editor' : 'Editor Libre'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 4. HOUSE RULES SECTION */}
          <section className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4" />
                <span>Reglas Opcionales (House Rules)</span>
              </h3>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>

            {/* Status y Variantes Oficiales de Navegantes */}
            {config.expansionModule === 'SEAFARERS' && (
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/40 space-y-3">
                <div className="flex items-center justify-between border-b border-sky-500/25 pb-2">
                  <span className="flex items-center gap-2 font-bold text-xs text-sky-200">
                    <span className="text-lg">⛵</span>
                    <span>
                      Navegantes:{' '}
                      {SEAFARERS_SCENARIOS.find((s) => s.id === config.seafarersScenario)?.title ||
                        'Rumbo a nuevas orillas'}
                    </span>
                  </span>
                  <span className="text-[10px] text-sky-300 font-bold bg-sky-900/60 px-2 py-0.5 rounded border border-sky-500/30">
                    Meta Oficial: {config.victoryPointsTarget || 14} PV
                  </span>
                </div>

                <div className="text-[11px] font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5 pt-1">
                  <Wrench className="w-3.5 h-3.5 text-sky-400" />
                  <span>Variantes y Reglas Oficiales de Navegantes:</span>
                </div>

                {/* 1. Mover Barcos Abiertos */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-200">
                    1. Reubicar Barco de Ruta Abierta (1 por turno)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { seafarersMoveShipAllowed: true },
                        })
                      }
                      className={`p-2 rounded-xl border text-left text-xs transition ${
                        config.seafarersMoveShipAllowed !== false
                          ? 'bg-sky-500/25 border-sky-400 text-sky-100 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>Permitido [Oficial]</div>
                      <div className="text-[10px] opacity-80">1 movimiento libre/turno</div>
                    </button>
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { seafarersMoveShipAllowed: false },
                        })
                      }
                      className={`p-2 rounded-xl border text-left text-xs transition ${
                        config.seafarersMoveShipAllowed === false
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>Rutas Fijas</div>
                      <div className="text-[10px] opacity-80">No se pueden mover</div>
                    </button>
                  </div>
                </div>

                {/* 2. Conexión Carretera - Barco en Costa */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-200">
                    2. Continuidad de Gran Ruta en la Costa
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { seafarersCoastConnection: 'REQUIRE_SETTLEMENT' },
                        })
                      }
                      className={`p-2 rounded-xl border text-left text-xs transition ${
                        config.seafarersCoastConnection !== 'FREE_CONNECTION'
                          ? 'bg-sky-500/25 border-sky-400 text-sky-100 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>Requiere Poblado [Oficial]</div>
                      <div className="text-[10px] opacity-80">Edificio propio en costa</div>
                    </button>
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { seafarersCoastConnection: 'FREE_CONNECTION' },
                        })
                      }
                      className={`p-2 rounded-xl border text-left text-xs transition ${
                        config.seafarersCoastConnection === 'FREE_CONNECTION'
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>Conexión Directa</div>
                      <div className="text-[10px] opacity-80">Enlazan sin poblado</div>
                    </button>
                  </div>
                </div>

                {/* 3. Barco Pirata */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-200">
                    3. Presencia del Barco Pirata
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { seafarersPirateMode: 'ACTIVE' },
                        })
                      }
                      className={`p-2 rounded-xl border text-left text-xs transition ${
                        config.seafarersPirateMode !== 'PACIFIC_NO_PIRATE'
                          ? 'bg-sky-500/25 border-sky-400 text-sky-100 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>Pirata Activo [Oficial]</div>
                      <div className="text-[10px] opacity-80">Roba y bloquea en mar</div>
                    </button>
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { seafarersPirateMode: 'PACIFIC_NO_PIRATE' },
                        })
                      }
                      className={`p-2 rounded-xl border text-left text-xs transition ${
                        config.seafarersPirateMode === 'PACIFIC_NO_PIRATE'
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>Modo Pacífico</div>
                      <div className="text-[10px] opacity-80">Solo Ladrón en tierra</div>
                    </button>
                  </div>
                </div>

                {/* 4. Puntos de Descubrimiento */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-200">
                    4. Puntos por Descubrimiento Insular
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { seafarersDiscoveryVPMode: 'STANDARD_2VP' },
                        })
                      }
                      className={`p-2 rounded-xl border text-left text-xs transition ${
                        (config.seafarersDiscoveryVPMode || 'STANDARD_2VP') === 'STANDARD_2VP'
                          ? 'bg-sky-500/25 border-sky-400 text-sky-100 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>+2 PV [Oficial]</div>
                      <div className="text-[10px] opacity-80">Por isla exterior</div>
                    </button>
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { seafarersDiscoveryVPMode: 'PROGRESSIVE' },
                        })
                      }
                      className={`p-2 rounded-xl border text-left text-xs transition ${
                        config.seafarersDiscoveryVPMode === 'PROGRESSIVE'
                          ? 'bg-sky-500/25 border-sky-400 text-sky-100 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>Progresivo</div>
                      <div className="text-[10px] opacity-80">+2 PV 1ª, +1 PV sig.</div>
                    </button>
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { seafarersDiscoveryVPMode: 'DISABLED' },
                        })
                      }
                      className={`p-2 rounded-xl border text-left text-xs transition ${
                        config.seafarersDiscoveryVPMode === 'DISABLED'
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>Desactivado</div>
                      <div className="text-[10px] opacity-80">0 PV extra</div>
                    </button>
                  </div>
                </div>

                {/* 5. Barcos en Preparación */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-200">
                    5. Barcos en la Fase Inicial de Preparación
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { seafarersSetupShipRule: 'ANY_ROUND' },
                        })
                      }
                      className={`p-2 rounded-xl border text-left text-xs transition ${
                        config.seafarersSetupShipRule !== 'ROUND_2_ONLY'
                          ? 'bg-sky-500/25 border-sky-400 text-sky-100 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>Cualquier Ronda [Oficial]</div>
                      <div className="text-[10px] opacity-80">Ronda 1 o 2 en costa</div>
                    </button>
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { seafarersSetupShipRule: 'ROUND_2_ONLY' },
                        })
                      }
                      className={`p-2 rounded-xl border text-left text-xs transition ${
                        config.seafarersSetupShipRule === 'ROUND_2_ONLY'
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>Solo 2ª Ronda</div>
                      <div className="text-[10px] opacity-80">Ronda 1 exige carretera</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Regla: Desierto en el Centro */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                Desierto en el Centro
              </label>
              {config.expansionModule === 'SEAFARERS' ? (
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <span className="text-base">🏝️</span>
                  <span>
                    <strong>Geografía de Islas:</strong> En Navegantes, la posición de los desiertos y ríos de oro está determinada por el escenario marítimo.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() =>
                      dispatchAction({
                        type: 'UPDATE_CONFIG',
                        config: { desertInCenter: true },
                      })
                    }
                    className={`p-2 rounded-xl border text-left text-xs transition ${
                      config.desertInCenter !== false
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>Activado (Por defecto)</div>
                    <div className="text-[10px] opacity-80">Centro (0,0,0) fijo con el Ladrón</div>
                  </button>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() =>
                      dispatchAction({
                        type: 'UPDATE_CONFIG',
                        config: { desertInCenter: false },
                      })
                    }
                    className={`p-2 rounded-xl border text-left text-xs transition ${
                      config.desertInCenter === false
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>Posición Aleatoria</div>
                    <div className="text-[10px] opacity-80">El Desierto se mezcla en el mapa</div>
                  </button>
                </div>
              )}
            </div>

            {/* 1. Condición de Victoria */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-200">
                  1. Condición de Victoria (Puntos)
                </label>
                {config.expansionModule === 'SEAFARERS' && (
                  <span className="text-[10px] text-sky-400 font-medium">
                    (Oficial Navegantes: 13 PV)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {(config.expansionModule === 'SEAFARERS' ? [10, 12, 13, 14, 15, 16, 17] : hasCitiesKnights(config) ? [13] : [9, 10, 11, 12, 15]).map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    disabled={!isHost}
                    onClick={() =>
                      dispatchAction({
                        type: 'UPDATE_CONFIG',
                        config: { victoryPointsTarget: pts },
                      })
                    }
                    className={`py-2 rounded-xl border text-xs font-extrabold transition ${
                      config.victoryPointsTarget === pts
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {pts} PV
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Tiempo de Turno */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                2. Tiempo de Turno
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(
                  [
                    { val: 30, label: '30s' },
                    { val: 60, label: '60s' },
                    { val: 90, label: '90s' },
                    { val: 120, label: '120s' },
                    { val: null, label: 'Infinito' },
                  ] as const
                ).map((item) => (
                  <button
                    key={String(item.val)}
                    type="button"
                    disabled={!isHost}
                    onClick={() =>
                      dispatchAction({
                        type: 'UPDATE_CONFIG',
                        config: { turnTimerSeconds: item.val },
                      })
                    }
                    className={`py-2 rounded-xl border text-[11px] font-bold transition ${
                      config.turnTimerSeconds === item.val
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Distancia entre casas */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                3. Distancia entre casas
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() =>
                    dispatchAction({
                      type: 'UPDATE_CONFIG',
                      config: { minSettlementDistance: 2 },
                    })
                  }
                  className={`p-2 rounded-xl border text-left text-xs transition ${
                    config.minSettlementDistance === 2
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>Estándar (2 aristas)</div>
                  <div className="text-[10px] opacity-80">1 vértice vacío entre casas</div>
                </button>
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() =>
                    dispatchAction({
                      type: 'UPDATE_CONFIG',
                      config: { minSettlementDistance: 1 },
                    })
                  }
                  className={`p-2 rounded-xl border text-left text-xs transition ${
                    config.minSettlementDistance === 1
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>Reducida (1 arista)</div>
                  <div className="text-[10px] opacity-80">Adyacentes con carretera propia</div>
                </button>
              </div>
            </div>

            {/* 4. Uso Inmediato de Cartas de Desarrollo */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                4. Uso Inmediato de Cartas de Desarrollo
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() =>
                    dispatchAction({
                      type: 'UPDATE_CONFIG',
                      config: { allowInstantDevCards: false },
                    })
                  }
                  className={`p-2 rounded-xl border text-left text-xs transition ${
                    !config.allowInstantDevCards
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>Oficial (Turno Siguiente)</div>
                  <div className="text-[10px] opacity-80">Se bloquea en el turno de compra</div>
                </button>
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() =>
                    dispatchAction({
                      type: 'UPDATE_CONFIG',
                      config: { allowInstantDevCards: true },
                    })
                  }
                  className={`p-2 rounded-xl border text-left text-xs transition ${
                    config.allowInstantDevCards
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>Uso Inmediato (Activo)</div>
                  <div className="text-[10px] opacity-80">Jugables en el mismo turno de compra</div>
                </button>
              </div>
            </div>

            {/* 4B. Cartas de Desarrollo por Turno (2 Sectores) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                Cartas de Desarrollo por Turno
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() =>
                    dispatchAction({
                      type: 'UPDATE_CONFIG',
                      config: { maxOneDevCardPerTurn: false },
                    })
                  }
                  className={`p-2 rounded-xl border text-left text-xs transition ${
                    !config.maxOneDevCardPerTurn
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>Usar las que quieras (Por defecto)</div>
                  <div className="text-[10px] opacity-80">Sin límite de cartas jugadas por turno</div>
                </button>
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() =>
                    dispatchAction({
                      type: 'UPDATE_CONFIG',
                      config: { maxOneDevCardPerTurn: true },
                    })
                  }
                  className={`p-2 rounded-xl border text-left text-xs transition ${
                    config.maxOneDevCardPerTurn
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>Solo 1 Carta por Turno</div>
                  <div className="text-[10px] opacity-80">Máximo una carta de desarrollo en cada turno</div>
                </button>
              </div>
            </div>

            {/* 4C. Recursos de las 2 Casas Iniciales (2 Sectores) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                Recursos de las Casas Iniciales
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() =>
                    dispatchAction({
                      type: 'UPDATE_CONFIG',
                      config: { initialSettlementsGiveResources: true },
                    })
                  }
                  className={`p-2 rounded-xl border text-left text-xs transition ${
                    config.initialSettlementsGiveResources !== false
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>Ambas Casas dan Recursos</div>
                  <div className="text-[10px] opacity-80">Las 2 casas iniciales dan recursos contiguos</div>
                </button>
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() =>
                    dispatchAction({
                      type: 'UPDATE_CONFIG',
                      config: { initialSettlementsGiveResources: false },
                    })
                  }
                  className={`p-2 rounded-xl border text-left text-xs transition ${
                    config.initialSettlementsGiveResources === false
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>Sin Recursos Iniciales</div>
                  <div className="text-[10px] opacity-80">Las casas iniciales no dan recursos</div>
                </button>
              </div>
            </div>

            {/* 5. Niveles de Acción por Turno (3 Sectores) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                5. Niveles de Acción por Turno (3 Sectores)
              </label>
              <div className="space-y-1.5">
                {(
                  [
                    {
                      id: 'LEVEL_1_FREE',
                      title: 'Nivel 1 (Libre / Clásico)',
                      desc: 'Tirar dados (1º obligatorio) + Construir ilimitado + Comerciar/Quemar ilimitado',
                      activeClass: 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold',
                    },
                    {
                      id: 'LEVEL_2_LIMITED',
                      title: 'Nivel 2 (Limitado)',
                      desc: 'Tirar dados (1º) + Máx. 1 infraestructura + Máx. 1 Comerciar o Quemar Cartas',
                      activeClass: 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold',
                    },
                    {
                      id: 'LEVEL_3_STRICT',
                      title: 'Nivel 3 (Estricto - Una Ruta)',
                      desc: 'Tirar dados (1º) + Elegir UNA sola ruta: O solo Construyes, O solo Quemas/Comercias',
                      activeClass: 'bg-rose-500/20 border-rose-400 text-rose-200 font-bold',
                    },
                  ] as const
                ).map((lvl) => {
                  const isSelected = (config.turnActionRestriction || 'LEVEL_1_FREE') === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      disabled={!isHost}
                      onClick={() =>
                        dispatchAction({
                          type: 'UPDATE_CONFIG',
                          config: { turnActionRestriction: lvl.id },
                        })
                      }
                      className={`w-full p-2.5 rounded-xl border text-left text-xs transition ${
                        isSelected
                          ? lvl.activeClass
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div>{lvl.title}</div>
                      <div className="text-[10px] opacity-85 mt-0.5">{lvl.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. El Castigo del 7 (Ladrón) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                6. El Castigo del 7 (Ladrón &gt;7 cartas)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() =>
                    dispatchAction({
                      type: 'UPDATE_CONFIG',
                      config: { robberDiscardMode: 'MANUAL' },
                    })
                  }
                  className={`p-2 rounded-xl border text-left text-xs transition ${
                    config.robberDiscardMode === 'MANUAL'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>Estándar (Manual)</div>
                  <div className="text-[10px] opacity-80">El jugador elige qué mitad descartar</div>
                </button>
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() =>
                    dispatchAction({
                      type: 'UPDATE_CONFIG',
                      config: { robberDiscardMode: 'RANDOM' },
                    })
                  }
                  className={`p-2 rounded-xl border text-left text-xs transition ${
                    config.robberDiscardMode === 'RANDOM'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>Aleatorio Automático</div>
                  <div className="text-[10px] opacity-80">Mitad destruida al azar</div>
                </button>
              </div>
            </div>

            {/* 7. Modo de Animaciones Simplificadas (Low-End PC Mode) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    7. Modo de Animaciones Simplificadas (Bajo Consumo)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Desactiva partículas/glows y bloquea el arrastre (Pan) del mapa en (0,0)
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
          </section>
        </div>

        {/* Right Column: Interactive Board Preview & Custom Board Builder */}
        <div className="room-lobby-board lg:col-span-7 xl:col-span-8 relative flex flex-col h-full overflow-hidden">
          {isHost && editorTool.active && (
            <div className="bg-slate-900/95 border-b border-sky-500/30 p-3 flex flex-wrap items-center gap-3 z-20 shadow-xl">
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                <span>Editor de Tablero:</span>
              </span>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(
                  [
                    { id: 'SWAP', label: 'Intercambiar 2 Hex' },
                    { id: 'PAINT_TERRAIN', label: 'Pintar Terreno' },
                    { id: 'SET_NUMBER', label: 'Asignar Número' },
                    { id: 'SET_PORT', label: 'Editar Puertos' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEditorTool((prev) => ({ ...prev, mode: tab.id }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      editorTool.mode === tab.id
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {editorTool.mode === 'PAINT_TERRAIN' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE', 'DESERT'] as TerrainType[]).map(
                    (t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setEditorTool((prev) => ({ ...prev, selectedTerrain: t }))
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition ${
                          editorTool.selectedTerrain === t
                            ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <img
                          src={TILE_TEXTURE_PATHS[t]}
                          alt={TERRAIN_META[t].name}
                          className="w-4 h-4 rounded-sm object-cover border border-white/25"
                        />
                        <span>{TERRAIN_META[t].name.split(' ')[0]}</span>
                      </button>
                    )
                  )}
                </div>
              )}

              {editorTool.mode === 'SET_NUMBER' && (
                <div className="flex items-center gap-1 flex-wrap">
                  {[2, 3, 4, 5, 6, 8, 9, 10, 11, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setEditorTool((prev) => ({ ...prev, selectedNumber: num }))
                      }
                      className={`w-7 h-7 rounded-lg text-xs font-extrabold border transition ${
                        editorTool.selectedNumber === num
                          ? 'bg-amber-500 border-amber-300 text-slate-950'
                          : num === 6 || num === 8
                          ? 'bg-red-950/60 border-red-500/40 text-red-300'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}

              {editorTool.mode === 'SET_PORT' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      setEditorTool((prev) => ({ ...prev, selectedPort: 'GENERIC' }))
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      editorTool.selectedPort === 'GENERIC'
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    ⚓ 3:1 General
                  </button>
                  {ALL_RESOURCES.map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() =>
                        setEditorTool((prev) => ({ ...prev, selectedPort: res }))
                      }
                      className={`px-2 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 ${
                        editorTool.selectedPort === res
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span>{RESOURCE_META[res].emoji}</span>
                      <span>2:1</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setEditorTool((prev) => ({ ...prev, selectedPort: null }))
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      editorTool.selectedPort === null
                        ? 'bg-red-500/25 border-red-400 text-red-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Quitar Puerto
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 relative">
            <HexBoardSVG
              board={board}
              players={players}
              lowEndPcMode={lowEndPcMode}
              editorTool={isHost ? editorTool : undefined}
              onCustomSwapHexes={(hexIdA, hexIdB) =>
                dispatchAction({ type: 'CUSTOM_SWAP_HEXES', hexIdA, hexIdB })
              }
              onCustomSetTerrain={(hexId, terrain) =>
                dispatchAction({ type: 'CUSTOM_SET_HEX_TERRAIN', hexId, terrain })
              }
              onCustomSetNumber={(hexId, numberToken) =>
                dispatchAction({ type: 'CUSTOM_SET_HEX_NUMBER', hexId, numberToken })
              }
              onCustomSetPort={(edgeId, portType) =>
                dispatchAction({ type: 'CUSTOM_SET_PORT', edgeId, portType })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};
