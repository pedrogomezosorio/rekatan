import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { GameProvider, useGame } from './context/GameContext';
import { MainMenu } from './components/Lobby/MainMenu';
import { RoomLobby } from './components/Lobby/RoomLobby';
import { GameScreen } from './components/Game/GameScreen';

const AppContent: React.FC = () => {
  const { gameState, errorToast, clearErrorToast } = useGame();

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100">
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

      {!gameState ? (
        <MainMenu />
      ) : gameState.phase === 'LOBBY' ? (
        <RoomLobby />
      ) : (
        <GameScreen />
      )}
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

