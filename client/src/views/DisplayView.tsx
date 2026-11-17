import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useGameStore } from '../store/gameStore';
import { BuzzerQueueList } from '../components/BuzzerQueueList';
import { AudioToggle } from '../components/AudioToggle';
import {
  CheckCircle2,
  Lock,
  LogOut,
  Monitor,
  Radio,
  Sparkles,
  Tag,
  Trophy,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { Team } from '../types/shared';

export const DisplayView: React.FC = () => {
  const room = useGameStore((s) => s.room);
  const connected = useGameStore((s) => s.connected);
  const buzzerState = useGameStore((s) => s.buzzerState);
  const buzzerQueue = useGameStore((s) => s.buzzerQueue);
  const networkInfo = useGameStore((s) => s.networkInfo);
  const leaveRoom = useGameStore((s) => s.leaveRoom);

  if (!room) return null;

  const teams = (Object.values(room.teams) as Team[]).filter(
    (t) => t.registered
  );
  const currentQuestion = room.currentQuestion;
  const isBuzzerArmed = buzzerState === 'ARMED';
  const roundWinner = buzzerQueue.find((item) => item.status === 'CORRECT');

  const lanIp = networkInfo?.ips?.[0];
  const clientPort =
    typeof window !== 'undefined' && window.location.port
      ? window.location.port
      : String(networkInfo?.clientPort || 5173);
  const joinBaseUrl = lanIp
    ? `http://${lanIp}:${clientPort}`
    : typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:5173';
  const joinUrlWithPin = `${joinBaseUrl}/?pin=${room.code}`;

  return (
    <div className="min-h-screen-safe bg-background flex flex-col p-4 sm:p-8 max-w-7xl mx-auto w-full pt-safe pb-safe">
      {/* Header Tabellone */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-800/80 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-xl text-white tracking-tight">
                LiveQuiz Tabellone
              </span>
              <span className="text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                PIN: {room.code}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span>{teams.length} giocatori collegati</span>
              <span>•</span>
              {connected ? (
                <span className="flex items-center text-emerald-400 font-semibold">
                  <Wifi className="w-3 h-3 mr-1" /> Live
                </span>
              ) : (
                <span className="flex items-center text-rose-400 font-semibold animate-pulse">
                  <WifiOff className="w-3 h-3 mr-1" /> Riconnessione...
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <AudioToggle />
          <button
            type="button"
            onClick={leaveRoom}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
            title="Esci dalla vista Tabellone"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Display Area */}
      <main className="flex-1 flex flex-col justify-center py-6">
        {/* 1. LOBBY: QR Code + PIN gigante + Giocatori */}
        {room.status === 'LOBBY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 bg-gradient-to-br from-indigo-950/60 via-card to-purple-950/40 border border-indigo-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
              <div className="inline-flex items-center space-x-2 text-xs font-extrabold uppercase tracking-widest text-indigo-300 bg-indigo-500/15 px-3 py-1 rounded-full border border-indigo-500/30">
                <Sparkles className="w-4 h-4" />
                <span>Unisciti dal tuo Smartphone</span>
              </div>

              <div className="bg-white p-4 rounded-2xl inline-block shadow-xl">
                <QRCodeSVG value={joinUrlWithPin} size={180} />
              </div>

              <div>
                <p className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-2">
                  Codice Stanza (PIN)
                </p>
                <div className="text-5xl sm:text-6xl font-black text-white tracking-[0.2em] bg-black/40 py-4 px-6 rounded-2xl border border-white/10 inline-block">
                  {room.code}
                </div>
              </div>

              <p className="text-sm text-slate-300 break-all">
                Oppure apri:{' '}
                <strong className="text-indigo-300">{joinBaseUrl}</strong>
              </p>
            </div>

            <div className="lg:col-span-6 bg-card border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl min-h-[340px] flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-6 h-6 text-emerald-400" />
                  <h2 className="text-2xl font-black text-white">
                    Giocatori in Partita
                  </h2>
                </div>
                <span className="text-sm font-black bg-slate-800 text-white px-3 py-1 rounded-full">
                  {teams.length}
                </span>
              </div>

              {teams.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                  <p className="text-lg font-bold">In attesa dei giocatori...</p>
                  <p className="text-sm">
                    Inquadra il QR Code dall'iPhone o inserisci il codice PIN.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className="w-5 h-5 rounded-full shrink-0 ring-2 ring-white/40"
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="font-extrabold text-white text-lg truncate">
                          {team.name}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          team.connected ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {team.connected ? '●' : '○'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. DOMANDA A SCELTA MULTIPLA (Opzioni visibili SOLO su PC) */}
        {room.status === 'QUESTION_ACTIVE' && currentQuestion && (
          <div className="space-y-6">
            {/* Barra Categoria + Stato Buzzer */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {currentQuestion.categoryName && (
                  <span
                    className="inline-flex items-center space-x-2 text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border text-white"
                    style={{
                      backgroundColor: `${
                        currentQuestion.categoryColor || '#6366F1'
                      }28`,
                      borderColor: `${
                        currentQuestion.categoryColor || '#6366F1'
                      }88`,
                    }}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>{currentQuestion.categoryName}</span>
                  </span>
                )}

                {currentQuestion.totalQuestionsInCategory &&
                  currentQuestion.questionIndex !== undefined && (
                    <span className="text-xs font-black uppercase tracking-wider bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full">
                      Domanda {currentQuestion.questionIndex + 1} /{' '}
                      {currentQuestion.totalQuestionsInCategory}
                    </span>
                  )}
              </div>

              <div
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                  isBuzzerArmed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isBuzzerArmed ? (
                  <>
                    <Zap className="w-4 h-4 fill-emerald-300" />
                    <span>Buzzer Aperto sui Telefoni!</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Buzzer Bloccato</span>
                  </>
                )}
              </div>
            </div>

            {/* Testo Domanda Grande */}
            <div className="bg-card border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl text-center">
              <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                {currentQuestion.text}
              </h1>
            </div>

            {roundWinner && (
              <div className="flex items-center justify-center space-x-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-emerald-900/50 to-emerald-950/70 border border-emerald-500/60 text-emerald-100 text-lg sm:text-xl font-black shadow-lg">
                <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
                <span>Risposta esatta: {roundWinner.teamName}!</span>
              </div>
            )}

            {/* Opzioni A, B, C, D in Grande (SOLO SU PC) */}
            {currentQuestion.options.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isRevealed = Boolean(currentQuestion.revealedAnswer);
                  const isCorrect =
                    isRevealed && currentQuestion.correctOptionIndex === idx;

                  let cardStyle =
                    'bg-slate-900/90 border-slate-700/80 text-white';
                  if (isRevealed) {
                    cardStyle = isCorrect
                      ? 'bg-emerald-600 border-emerald-300 text-white ring-4 ring-emerald-400/50 shadow-2xl shadow-emerald-500/30 scale-[1.01]'
                      : 'bg-slate-950/60 border-slate-800/60 text-slate-500 opacity-45';
                  }

                  return (
                    <div
                      key={idx}
                      className={`flex items-center space-x-4 p-5 sm:p-6 rounded-2xl border-2 transition-all ${cardStyle}`}
                    >
                      <span
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${
                          isCorrect
                            ? 'bg-white text-emerald-700'
                            : 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-lg sm:text-2xl font-bold flex-1 leading-snug">
                        {opt}
                      </span>
                      {isCorrect && (
                        <CheckCircle2 className="w-8 h-8 text-white shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Coda Buzzer in Diretta */}
            <div className="bg-card/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider">
                  Prenotazioni Buzzer in Tempo Reale
                </h3>
                <span className="text-xs text-slate-400">
                  {buzzerQueue.length} prenotati
                </span>
              </div>
              <BuzzerQueueList
                queue={buzzerQueue}
                isAdmin={false}
                large={true}
              />
            </div>
          </div>
        )}

        {/* 3. BUZZER A VOCE */}
        {room.status === 'BUZZER_OPEN' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-950/60 via-card to-purple-950/40 border border-indigo-500/40 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {currentQuestion?.categoryName && (
                  <span
                    className="inline-flex items-center space-x-1.5 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border text-white"
                    style={{
                      backgroundColor: `${
                        currentQuestion.categoryColor || '#6366F1'
                      }28`,
                      borderColor: `${
                        currentQuestion.categoryColor || '#6366F1'
                      }88`,
                    }}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>{currentQuestion.categoryName}</span>
                  </span>
                )}
                <div className="inline-flex items-center space-x-2 text-xs font-extrabold uppercase tracking-widest text-indigo-300 bg-indigo-500/15 px-3 py-1 rounded-full">
                  <Radio className="w-4 h-4" />
                  <span>Domanda a Voce</span>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white">
                {currentQuestion?.text || 'Domanda a voce del conduttore'}
              </h1>

              <div className="flex items-center justify-center gap-3 pt-2">
                <span
                  className={`text-sm font-black px-4 py-1.5 rounded-full border ${
                    isBuzzerArmed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isBuzzerArmed ? '⚡ BUZZER APERTO' : '🔒 BUZZER BLOCCATO'}
                </span>
              </div>
            </div>

            {roundWinner && (
              <div className="flex items-center justify-center space-x-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-emerald-900/50 to-emerald-950/70 border border-emerald-500/60 text-emerald-100 text-lg sm:text-xl font-black shadow-lg">
                <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
                <span>Risposta esatta: {roundWinner.teamName}!</span>
              </div>
            )}

            <div className="bg-card border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider">
                Ordine di Prenotazione
              </h3>
              <BuzzerQueueList
                queue={buzzerQueue}
                isAdmin={false}
                large={true}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
