import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { HomeView } from './views/HomeView';
import { AdminView } from './views/AdminView';
import { PlayerView } from './views/PlayerView';
import { DisplayView } from './views/DisplayView';
import { NotificationToast } from './components/NotificationToast';

export const App: React.FC = () => {
  const init = useGameStore((s) => s.init);
  const room = useGameStore((s) => s.room);
  const isAdmin = useGameStore((s) => s.isAdmin);
  const isDisplay = useGameStore((s) => s.isDisplay);
  const isInitialized = useGameStore((s) => s.isInitialized);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans select-none">
      <NotificationToast />

      {!isInitialized ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !room ? (
        <HomeView />
      ) : isAdmin ? (
        <AdminView />
      ) : isDisplay ? (
        <DisplayView />
      ) : (
        <PlayerView />
      )}
    </div>
  );
};

export default App;
