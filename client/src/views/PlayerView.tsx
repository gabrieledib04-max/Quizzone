import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { ColorPicker } from '../components/ColorPicker';
import { BuzzerButton } from '../components/BuzzerButton';
import { BuzzerQueueList } from '../components/BuzzerQueueList';
import { AudioToggle } from '../components/AudioToggle';
import { wakeLockManager } from '../services/wakeLock';
import {
  CheckCircle2,
  Clock,
  LogOut,
  Mic,
  Monitor,
  Tag,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Team } from '../types/shared';

export const PlayerView: React.FC = () => {
  const room = useGameStore((s) => s.room);
  const currentTeam = useGameStore((s) => s.currentTeam);
  const connected = useGameStore((s) => s.connected);
  const buzzerState = useGameStore((s) => s.buzzerState);
  const buzzerQueue = useGameStore((s) => s.buzzerQueue);
  const myBuzzPosition = useGameStore((s) => s.myBuzzPosition);

  const registerTeam = useGameStore((s) => s.registerTeam);
  const buzz = useGameStore((s) => s.buzz);
  const leaveRoom = useGameStore((s) => s.leaveRoom);

  const [teamName, setTeamName] = useState(currentTeam?.name || '');
  const [selectedColor, setSelectedColor] = useState(currentTeam?.color || '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    wakeLockManager.requestLock();
    return () => {
      wakeLockManager.releaseLock();
    };
  }, []);

  if (!room || !currentTeam) {
    return null;
  }

  const allTeams = Object.values(room.teams) as Team[];
  const takenColors = allTeams
    .filter((t: Team) => t.id !== currentTeam.id && t.registered && t.color)
    .map((t: Team) => t.color);

  // 1. Schermata Registrazione Giocatore / Squadra
  if (!currentTeam.registered) {
    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!teamName.trim()) {
        setError('Inserisci il tuo nome o quello della squadra');
        return;
      }
      if (!selectedColor) {
        setError('Seleziona un colore univoco per il tuo buzzer');
        return;
      }

      setSubmitting(true);
      setError(null);
      try {
        const res = await registerTeam(teamName.trim(), selectedColor);
        if (!res.success) {
          setError(res.error || 'Errore nella registrazione');
        }
      } catch {
        setError('Errore di connessione');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen-safe flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto w-full pt-safe pb-safe">
        <header className="flex justify-between items-center py-2">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
              Stanza {room.code}
            </span>
            <h2 className="text-xl font-black text-white">
              Entra in Partita
            </h2>
          </div>
          <button
            type="button"
            onClick={leaveRoom}
            className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
            title="Esci dalla stanza"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleRegister} className="my-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-sm font-semibold rounded-xl text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">
              Nome Giocatore / Squadra
            </label>
            <input
              type="text"
              maxLength={20}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Es: Marco o I Compilatori"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
              autoFocus
            />
          </div>

          <ColorPicker
            selectedColor={selectedColor}
            takenColors={takenColors}
            onSelect={(color: string) => setSelectedColor(color)}
          />

          <button
            type="submit"
            disabled={submitting || !teamName.trim() || !selectedColor}
            className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-98"
          >
            {submitting ? 'Registrazione in corso...' : 'Inizia a Giocare'}
          </button>
        </form>

        <footer className="text-center text-xs text-slate-500 py-2">
          Il colore scelto distinguerà il tuo buzzer sul tabellone del conduttore.
        </footer>
      </div>
    );
  }

  // 2. Vista di Gioco Registrata: sul telefono SOLO categoria + testo domanda + Buzzer (senza punti né opzioni!)
  const currentQuestion = room.currentQuestion;
  const roundWinner = buzzerQueue.find((item) => item.status === 'CORRECT');
  const myQueueItem = buzzerQueue.find((item) => item.teamId === currentTeam.id);
  const firstActiveItem = buzzerQueue.find((item) => item.status === 'ACTIVE');
  const isMyTurn = Boolean(
    myQueueItem && firstActiveItem && myQueueItem.teamId === firstActiveItem.teamId
  );

  return (
    <div className="min-h-screen-safe flex flex-col justify-between max-w-lg mx-auto w-full p-4 sm:p-6 pt-safe pb-safe">
      {/* Top Bar con Info Giocatore (senza punteggio) */}
      <header className="flex items-center justify-between bg-card/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center space-x-3">
          <div
            className="w-9 h-9 rounded-full border-2 border-white/60 shadow-md shrink-0"
            style={{ backgroundColor: currentTeam.color }}
          />
          <div>
            <h3 className="font-extrabold text-white text-base leading-tight truncate max-w-[170px] sm:max-w-[240px]">
              {currentTeam.name}
            </h3>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <span>PIN: {room.code}</span>
              <span>•</span>
              {connected ? (
                <span className="flex items-center text-emerald-400 font-semibold">
                  <Wifi className="w-3 h-3 mr-0.5" /> Online
                </span>
              ) : (
                <span className="flex items-center text-rose-400 font-semibold animate-pulse">
                  <WifiOff className="w-3 h-3 mr-0.5" /> Riconnessione...
                </span>
              )}
            </div>
          </div>
        </div>

        <AudioToggle />
      </header>

      {/* Contenuto Dinamico */}
      <main className="my-auto py-5 flex flex-col items-center justify-center w-full">
        {/* STATO 1: LOBBY */}
        {room.status === 'LOBBY' && (
          <div className="text-center space-y-4 max-w-sm">
            <div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-lg border-4 border-white/40 animate-pulse"
              style={{ backgroundColor: currentTeam.color }}
            >
              <Clock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white">Sei in Partita!</h2>
            <p className="text-slate-400 text-sm">
              In attesa che il conduttore lanci la prossima domanda. Tieni lo schermo pronto!
            </p>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
              Giocatori collegati:{' '}
              <span className="font-bold text-white">
                {allTeams.filter((t: Team) => t.registered).length}
              </span>
            </div>
          </div>
        )}

        {/* STATO 2 & 3: DOMANDA ATTIVA O BUZZER APERTO -> SOLO CATEGORIA + TESTO DOMANDA + BUZZER */}
        {(room.status === 'QUESTION_ACTIVE' ||
          room.status === 'BUZZER_OPEN') && (
          <div className="w-full space-y-6">
            {/* Card Domanda (SOLO categoria e testo domanda; opzioni A/B/C/D solo su PC) */}
            <div className="bg-card border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {currentQuestion?.categoryName ? (
                  <span
                    className="inline-flex items-center space-x-1.5 text-xs font-extrabold px-2.5 py-1 rounded-full border"
                    style={{
                      backgroundColor: `${
                        currentQuestion.categoryColor || '#6366F1'
                      }22`,
                      borderColor: `${
                        currentQuestion.categoryColor || '#6366F1'
                      }66`,
                      color: '#F8FAFC',
                    }}
                  >
                    <Tag className="w-3 h-3 shrink-0" />
                    <span>{currentQuestion.categoryName}</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold uppercase text-indigo-400 tracking-wider flex items-center space-x-1.5">
                    {currentQuestion?.type === 'VOICE_ONLY' ||
                    room.status === 'BUZZER_OPEN' ? (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>Domanda a Voce</span>
                      </>
                    ) : (
                      <>
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Domanda in Corso</span>
                      </>
                    )}
                  </span>
                )}

                {currentQuestion?.totalQuestionsInCategory &&
                  currentQuestion.questionIndex !== undefined && (
                    <span className="text-[11px] font-bold bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full">
                      {currentQuestion.questionIndex + 1} /{' '}
                      {currentQuestion.totalQuestionsInCategory}
                    </span>
                  )}
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                {currentQuestion?.text || 'Ascolta la domanda del conduttore!'}
              </h2>

              {currentQuestion?.type === 'MULTIPLE_CHOICE' && (
                <div className="flex items-center space-x-2 text-xs text-amber-300/90 bg-amber-950/30 border border-amber-500/20 px-3 py-2 rounded-xl">
                  <Monitor className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Le opzioni di risposta sono mostrate sullo schermo del PC principale. Premi il Buzzer per rispondere!
                  </span>
                </div>
              )}
            </div>

            {roundWinner && (
              <div className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 text-sm font-bold animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  Risposta esatta di <strong>{roundWinner.teamName}</strong>!
                </span>
              </div>
            )}

            {/* Pulsante Buzzer */}
            <BuzzerButton
              state={buzzerState}
              teamColor={currentTeam.color}
              teamName={currentTeam.name}
              queuePosition={myBuzzPosition}
              buzzOutcome={myQueueItem?.status ?? null}
              isMyTurn={isMyTurn}
              onBuzz={() => buzz()}
            />

            {/* Coda prenotazioni */}
            {buzzerQueue.length > 0 && (
              <div className="w-full pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Ordine Prenotazioni
                </h4>
                <BuzzerQueueList queue={buzzerQueue} isAdmin={false} />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="pt-2 text-center">
        <button
          type="button"
          onClick={leaveRoom}
          className="text-xs text-slate-500 hover:text-rose-400 transition-colors inline-flex items-center space-x-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Abbandona Partita</span>
        </button>
      </footer>
    </div>
  );
};
