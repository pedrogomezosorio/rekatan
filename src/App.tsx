import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { GameProvider, useGame } from './context/GameContext';
import { MainMenu } from './components/Lobby/MainMenu';
import { RoomLobby } from './components/Lobby/RoomLobby';
import { GameScreen } from './components/Game/GameScreen';

class UIErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[UIErrorBoundary] Recovered from render error:', error);
    // Automatically attempt a non-destructive UI remount after 150ms
    setTimeout(() => {
      this.setState({ hasError: false });
    }, 150);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0d0906] text-amber-100 flex flex-col items-center justify-center p-6 gap-4">
          <p className="text-sm text-stone-300">Restaurando la interfaz de la partida...</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-black text-xs flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Continuar</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { gameState, connected, reconnectSocket, errorToast, clearErrorToast } = useGame();

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100">
      {/* Floating Reconnection Indicator when socket drops */}
      <AnimatePresence>
        {gameState && !connected && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-3 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/95 border border-red-500/80 text-red-200 text-xs font-bold shadow-2xl backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            <span>Sin conexión</span>
            <button
              type="button"
              onClick={reconnectSocket}
              className="ml-1 px-2.5 py-0.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-[11px] font-black cursor-pointer shadow transition"
            >
              Reconectar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast Notification for Rule Validation / Errors */}
      <AnimatePresence>
        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-950/95 border border-red-500/70 text-red-100 text-xs font-bold shadow-2xl max-w-md w-[92%]"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="flex-1">{errorToast}</span>
            <button
              onClick={clearErrorToast}
              className="p-1 rounded-lg hover:bg-red-900/60 text-red-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <UIErrorBoundary>
        {!gameState ? (
          <MainMenu />
        ) : gameState.phase === 'LOBBY' ? (
          <RoomLobby />
        ) : (
          <GameScreen />
        )}
      </UIErrorBoundary>
    </div>
  );
};

export function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;

