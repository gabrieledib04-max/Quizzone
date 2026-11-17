import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { AudioToggle } from '../components/AudioToggle';
import { QuestionLibraryManager } from '../components/QuestionLibraryManager';
import { AdminPasswordModal } from '../components/AdminPasswordModal';
import { getAdminPassword } from '../services/categoryApi';
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  Monitor,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const initialPin = useGameStore((s) => s.initialPinFromUrl);
  const [pin, setPin] = useState(initialPin);
  const [displayPin, setDisplayPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // Modal Password Amministratore
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<
    'create_room' | 'open_library' | null
  >(null);

  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const joinDisplay = useGameStore((s) => s.joinDisplay);

  const executeCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await createRoom();
      if (!ok) {
        // Se la password è scaduta o non valida, riapri il modal
        setPendingAdminAction('create_room');
        setAdminModalOpen(true);
      }
    } catch {
      setError('Errore nella creazione della stanza');
    } finally {
      setLoading(false);
    }
  };

  const requestAdminAction = (action: 'create_room' | 'open_library') => {
    if (getAdminPassword()) {
      if (action === 'create_room') {
        executeCreate();
      } else {
        setShowLibrary(true);
      }
    } else {
      setPendingAdminAction(action);
      setAdminModalOpen(true);
    }
  };

  const handleAdminSuccess = () => {
    if (pendingAdminAction === 'create_room') {
      executeCreate();
    } else if (pendingAdminAction === 'open_library') {
      setShowLibrary(true);
    }
    setPendingAdminAction(null);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Inserisci il codice della stanza');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await joinRoom(pin.trim());
      if (!res.success) {
        setError(res.error || 'Codice stanza non valido o stanza inesistente');
      }
    } catch {
      setError('Impossibile collegarsi al server');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinDisplay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayPin.trim()) {
      setError('Inserisci il codice della stanza da proiettare');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await joinDisplay(displayPin.trim(), true);
      if (!res.success) {
        setError(res.error || 'Impossibile aprire il Tabellone');
      }
    } catch {
      setError('Impossibile collegarsi al server');
    } finally {
      setLoading(false);
    }
  };

  // Modalità Gestione Categorie & Domande prima di creare la stanza
  if (showLibrary) {
    return (
      <div className="min-h-screen-safe flex flex-col p-4 sm:p-6 max-w-6xl mx-auto w-full pt-safe pb-safe">
        <header className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowLibrary(false)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
                Preparazione Quiz (Admin)
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Categorie & Domande
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => requestAdminAction('create_room')}
            disabled={loading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center space-x-2"
          >
            <Crown className="w-4 h-4" />
            <span>Avvia Stanza Quiz</span>
          </button>
        </header>

        <QuestionLibraryManager />

        <AdminPasswordModal
          isOpen={adminModalOpen}
          onClose={() => setAdminModalOpen(false)}
          onSuccess={handleAdminSuccess}
          title="Autenticazione Admin"
          description="Inserisci la password di amministrazione per avviare la stanza."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe flex flex-col items-center justify-between p-4 sm:p-6 max-w-lg mx-auto w-full pt-safe pb-safe">
      {/* Header bar */}
      <div className="w-full flex justify-between items-center py-2">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          <span className="font-extrabold tracking-tight text-xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            LiveQuiz
          </span>
        </div>
        <AudioToggle />
      </div>

      {/* Main Container */}
      <div className="w-full my-auto space-y-5 py-4">
        <div className="text-center space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Quiz & Buzzer Live
          </h1>
          <p className="text-sm text-slate-400">
            Domande e risposte sul PC principale, Buzzer rapido dagli smartphone.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-800 text-rose-200 text-sm font-semibold rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Card Concorrente */}
        <div className="bg-card border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                Entra come Giocatore (Telefono)
              </h3>
              <p className="text-xs text-slate-400">
                Inserisci il codice PIN mostrato sul PC
              </p>
            </div>
          </div>

          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder="ES: QUIZ26"
              className="w-full text-center text-2xl font-black tracking-widest uppercase bg-slate-900 border border-slate-700/80 rounded-xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition-all font-bold text-white rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Connessione...' : 'Entra nella Stanza'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            oppure dal PC Principale
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Card Host / Conduttore + Categorie */}
        <div className="bg-card/70 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Conduttore & Categorie
              </h3>
              <p className="text-xs text-slate-400">
                Area protetta da password per creare o gestire domande e stanze
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => requestAdminAction('create_room')}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 active:scale-98 transition-all font-bold text-slate-950 rounded-xl text-sm flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20"
            >
              <Crown className="w-4 h-4" />
              <span>{loading ? 'Avvio...' : 'Crea Stanza (Admin)'}</span>
            </button>

            <button
              type="button"
              onClick={() => requestAdminAction('open_library')}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-98 transition-all font-semibold text-slate-200 border border-slate-700 rounded-xl text-sm flex items-center justify-center space-x-1.5"
            >
              <Tag className="w-4 h-4 text-indigo-400" />
              <span>Categorie & Domande</span>
            </button>
          </div>
        </div>

        {/* Card Tabellone Proiettore */}
        <div className="bg-card/50 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center space-x-2.5">
            <Monitor className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-white text-sm">
                Apri Tabellone / Schermo Pubblico
              </h3>
              <p className="text-xs text-slate-400">
                Mostra domanda e risposte A/B/C/D sul proiettore o TV
              </p>
            </div>
          </div>

          <form onSubmit={handleJoinDisplay} className="flex space-x-2">
            <input
              type="text"
              maxLength={6}
              value={displayPin}
              onChange={(e) => setDisplayPin(e.target.value.toUpperCase())}
              placeholder="PIN Stanza"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-black tracking-widest uppercase text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shrink-0"
            >
              Apri Tabellone
            </button>
          </form>
        </div>
      </div>

      <footer className="w-full text-center text-xs text-slate-500 py-2">
        Mobile-First per iOS & Safari • Categorie e domande salvate su server
      </footer>

      {/* Modal Password Amministratore */}
      <AdminPasswordModal
        isOpen={adminModalOpen}
        onClose={() => {
          setAdminModalOpen(false);
          setPendingAdminAction(null);
        }}
        onSuccess={handleAdminSuccess}
        title="Accesso Amministratore"
        description="Inserisci la password per creare una stanza o accedere alla gestione domande."
      />
    </div>
  );
};
