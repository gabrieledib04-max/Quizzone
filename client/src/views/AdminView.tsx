import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useGameStore } from '../store/gameStore';
import { useCategoryStore } from '../store/categoryStore';
import { BuzzerQueueList } from '../components/BuzzerQueueList';
import { AudioToggle } from '../components/AudioToggle';
import { QuestionLibraryManager } from '../components/QuestionLibraryManager';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dices,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Mic,
  Monitor,
  PartyPopper,
  Play,
  Radio,
  RotateCcw,
  Tag,
  Trash2,
  Unlock,
  Users,
  Zap,
} from 'lucide-react';
import { Category, SavedQuestion, Team } from '../types/shared';

type AdminTab = 'lobby' | 'live' | 'library';

export const AdminView: React.FC = () => {
  const room = useGameStore((s) => s.room);
  const buzzerQueue = useGameStore((s) => s.buzzerQueue);
  const buzzerState = useGameStore((s) => s.buzzerState);
  const networkInfo = useGameStore((s) => s.networkInfo);

  const setStatus = useGameStore((s) => s.setStatus);
  const armBuzzer = useGameStore((s) => s.armBuzzer);
  const lockBuzzer = useGameStore((s) => s.lockBuzzer);
  const resetBuzzer = useGameStore((s) => s.resetBuzzer);
  const evaluateBuzz = useGameStore((s) => s.evaluateBuzz);
  const kickTeam = useGameStore((s) => s.kickTeam);
  const launchSavedQuestion = useGameStore((s) => s.launchSavedQuestion);
  const revealAnswer = useGameStore((s) => s.revealAnswer);
  const triggerConfetti = useGameStore((s) => s.triggerConfetti);
  const leaveRoom = useGameStore((s) => s.leaveRoom);

  const categories = useCategoryStore((s) => s.categories);
  const loadCategories = useCategoryStore((s) => s.loadCategories);

  const [activeTab, setActiveTab] = useState<AdminTab>('lobby');
  const [selectedLiveCategoryId, setSelectedLiveCategoryId] = useState<string>('');
  const [voicePrompt, setVoicePrompt] = useState<string>('');
  const [hideCorrectInAdmin, setHideCorrectInAdmin] = useState<boolean>(false);
  const [armOnRandomLaunch, setArmOnRandomLaunch] = useState<boolean>(false);
  const [usedQuestionIdsByCat, setUsedQuestionIdsByCat] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (
      categories.length > 0 &&
      !categories.some((c) => c.id === selectedLiveCategoryId)
    ) {
      setSelectedLiveCategoryId(categories[0].id);
    }
  }, [categories, selectedLiveCategoryId]);

  if (!room) return null;

  const teams = Object.values(room.teams) as Team[];
  const registeredTeams = teams.filter((t: Team) => t.registered);
  const isBuzzerArmed = buzzerState === 'ARMED';
  const currentQuestion = room.currentQuestion;

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
  const displayUrl = `${
    typeof window !== 'undefined' ? window.location.origin : joinBaseUrl
  }/?display=${room.code}`;

  const activeCategory = currentQuestion?.categoryId
    ? categories.find((c) => c.id === currentQuestion.categoryId)
    : undefined;

  const livePickerCategory =
    categories.find((c) => c.id === selectedLiveCategoryId) ||
    activeCategory ||
    categories[0];

  const currentIdx = currentQuestion?.questionIndex ?? -1;
  const hasPrev = Boolean(activeCategory && currentIdx > 0);
  const hasNext = Boolean(
    activeCategory &&
      currentIdx >= 0 &&
      currentIdx < activeCategory.questions.length - 1
  );

  const markQuestionUsed = (categoryId: string, questionId: string) => {
    setUsedQuestionIdsByCat((prev) => {
      const existing = prev[categoryId] || [];
      if (existing.includes(questionId)) return prev;
      return {
        ...prev,
        [categoryId]: [...existing, questionId],
      };
    });
  };

  const handleLaunchFromLibrary = (
    question: SavedQuestion,
    category: Category,
    index: number,
    armImmediately: boolean
  ) => {
    setSelectedLiveCategoryId(category.id);
    markQuestionUsed(category.id, question.id);
    launchSavedQuestion(question, {
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      questionIndex: index,
      totalQuestionsInCategory: category.questions.length,
      armImmediately,
    });
    setActiveTab('live');
  };

  const handleStepCategory = (delta: -1 | 1, armImmediately = false) => {
    if (!activeCategory) return;
    const nextIndex = currentIdx + delta;
    const target = activeCategory.questions[nextIndex];
    if (!target) return;
    markQuestionUsed(activeCategory.id, target.id);
    launchSavedQuestion(target, {
      categoryId: activeCategory.id,
      categoryName: activeCategory.name,
      categoryColor: activeCategory.color,
      questionIndex: nextIndex,
      totalQuestionsInCategory: activeCategory.questions.length,
      armImmediately,
    });
  };

  const handleLaunchRandom = (targetCategory?: Category, armImmediately = armOnRandomLaunch) => {
    const cat = targetCategory || livePickerCategory;
    if (!cat || cat.questions.length === 0) return;

    const used = usedQuestionIdsByCat[cat.id] || [];
    let pool = cat.questions.filter((q) => !used.includes(q.id));
    let resetCycle = false;

    if (pool.length === 0) {
      resetCycle = true;
      const nonCurrent = cat.questions.filter((q) => q.id !== currentQuestion?.id);
      pool = nonCurrent.length > 0 ? nonCurrent : cat.questions;
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const chosenIdx = cat.questions.findIndex((q) => q.id === chosen.id);

    setUsedQuestionIdsByCat((prev) => ({
      ...prev,
      [cat.id]: resetCycle ? [chosen.id] : [...(prev[cat.id] || []), chosen.id],
    }));

    setSelectedLiveCategoryId(cat.id);
    launchSavedQuestion(chosen, {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryColor: cat.color,
      questionIndex: chosenIdx >= 0 ? chosenIdx : 0,
      totalQuestionsInCategory: cat.questions.length,
      armImmediately,
    });
  };

  const handleStartVoiceBuzzer = () => {
    armBuzzer({
      id: `voice_${Date.now()}`,
      type: 'VOICE_ONLY',
      mode: 'BUZZER_FIRST',
      text: voicePrompt.trim() || 'Domanda a voce del conduttore',
    });
    setActiveTab('live');
  };

  const usedInPicker = livePickerCategory
    ? (usedQuestionIdsByCat[livePickerCategory.id] || []).filter((id) =>
        livePickerCategory.questions.some((q) => q.id === id)
      ).length
    : 0;
  const totalInPicker = livePickerCategory?.questions.length || 0;

  return (
    <div className="min-h-screen-safe bg-background flex flex-col p-4 sm:p-6 max-w-6xl mx-auto w-full pt-safe pb-safe">
      {/* Top Header bar */}
      <header className="flex flex-col lg:flex-row items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
                Pannello Conduttore
              </span>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-black px-2 py-0.5 rounded-full border border-indigo-500/30">
                PIN: {room.code}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Regia Partita
            </h1>
          </div>
        </div>

        {/* Azioni & Tab Switcher */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center space-x-1.5 transition-all"
            title="Apri la vista pubblica da proiettare sul PC principale (senza risposte spoilerate)"
          >
            <Monitor className="w-4 h-4" />
            <span>Apri Tabellone PC</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex flex-wrap bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('lobby')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                activeTab === 'lobby'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Giocatori ({registeredTeams.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('live')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                activeTab === 'live'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Regia Live</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                activeTab === 'library'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Categorie & Domande</span>
            </button>
          </div>

          <AudioToggle />

          <button
            type="button"
            onClick={leaveRoom}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
            title="Chiudi Stanza"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="py-6 flex-1">
        {/* ================= TAB 1: LOBBY / GIOCATORI ================= */}
        {activeTab === 'lobby' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-900/40 via-card to-purple-900/40 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 flex flex-col items-center">
                <div className="bg-white p-3 rounded-2xl shadow-lg">
                  <QRCodeSVG value={joinUrlWithPin} size={150} />
                </div>
                <span className="text-[11px] text-slate-400 mt-2 text-center">
                  Scansiona da iPhone per entrare
                </span>
              </div>

              <div className="md:col-span-8 text-center md:text-left space-y-4">
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
                    Codice Stanza per i Giocatori
                  </span>
                  <div className="mt-2 text-4xl sm:text-5xl font-black text-white tracking-widest bg-black/40 py-3 px-6 rounded-2xl inline-block border border-white/10 select-all">
                    {room.code}
                  </div>
                </div>

                <p className="text-sm text-slate-300">
                  Indirizzo per i telefoni:{' '}
                  <strong className="text-indigo-300 select-all">
                    {joinBaseUrl}
                  </strong>
                </p>

                <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all active:scale-95 text-sm"
                  >
                    <Tag className="w-4 h-4" />
                    <span>Categorie & Domande</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('live')}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all active:scale-95 text-sm"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Vai alla Regia Live</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('LOBBY')}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition-all"
                  >
                    Mostra Lobby su Tabellone
                  </button>
                </div>
              </div>
            </div>

            {/* Lista Giocatori Connessi (senza punti) */}
            <div className="bg-card border border-slate-800 rounded-2xl p-6 shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-lg flex items-center space-x-2">
                  <span>Giocatori Iscritti</span>
                  <span className="text-xs font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                    {registeredTeams.length}
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {registeredTeams.map((team: Team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-xl"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: team.color }}
                      />
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {team.name}
                        </h4>
                        <span
                          className={`text-xs ${
                            team.connected ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {team.connected ? '● Connesso' : '○ Disconnesso'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => kickTeam(team.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Rimuovi giocatore dalla stanza"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {registeredTeams.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-500 text-sm">
                    In attesa che i giocatori inquadrino il QR Code o inseriscano il PIN {room.code}...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: REGIA LIVE ================= */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            {/* Barra Selettore Rapido Categoria & Pesca Casuale */}
            <div className="bg-card border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                    Selettore Rapido Categoria
                  </h3>
                </div>

                <label className="inline-flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={armOnRandomLaunch}
                    onChange={(e) => setArmOnRandomLaunch(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>Apri Buzzer subito quando peschi</span>
                </label>
              </div>

              {categories.length === 0 ? (
                <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl">
                  <span>Nessuna categoria creata al momento.</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg"
                  >
                    Crea Categoria
                  </button>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const isPicked = livePickerCategory?.id === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedLiveCategoryId(cat.id)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-2 transition-all ${
                            isPicked
                              ? 'bg-slate-800 border-white/60 text-white shadow'
                              : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span>{cat.name}</span>
                          <span className="text-[11px] opacity-75">
                            ({cat.questions.length})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {livePickerCategory && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={totalInPicker === 0}
                        onClick={() => handleLaunchRandom(livePickerCategory)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                      >
                        <Dices className="w-4 h-4" />
                        <span>
                          Domanda Casuale ({usedInPicker}/{totalInPicker})
                        </span>
                      </button>

                      {totalInPicker > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const first = livePickerCategory.questions[0];
                            if (first) {
                              handleLaunchFromLibrary(
                                first,
                                livePickerCategory,
                                0,
                                armOnRandomLaunch
                              );
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Dalla #1</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Domanda Attiva (se presente) */}
            {currentQuestion &&
            (room.status === 'QUESTION_ACTIVE' ||
              room.status === 'BUZZER_OPEN') ? (
              <div className="bg-gradient-to-r from-card to-indigo-950/30 border border-indigo-500/40 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {currentQuestion.categoryName && (
                      <span
                        className="inline-flex items-center space-x-1.5 text-xs font-black px-2.5 py-1 rounded-full border text-white"
                        style={{
                          backgroundColor: `${
                            currentQuestion.categoryColor || '#6366F1'
                          }28`,
                          borderColor: `${
                            currentQuestion.categoryColor || '#6366F1'
                          }88`,
                        }}
                      >
                        <Tag className="w-3 h-3" />
                        <span>{currentQuestion.categoryName}</span>
                      </span>
                    )}

                    <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
                      {currentQuestion.type === 'VOICE_ONLY'
                        ? 'Domanda a Voce'
                        : 'Domanda Multipla (Opzioni sul PC)'}
                    </span>

                    {activeCategory && currentIdx >= 0 && (
                      <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full">
                        {currentIdx + 1} / {activeCategory.questions.length}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {currentQuestion.type === 'MULTIPLE_CHOICE' && (
                      <button
                        type="button"
                        onClick={() => setHideCorrectInAdmin((v) => !v)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg flex items-center space-x-1"
                        title="Nascondi l'evidenziazione verde se stai usando lo stesso schermo per i giocatori"
                      >
                        {hideCorrectInAdmin ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Mostra Giusta</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Nascondi Giusta</span>
                          </>
                        )}
                      </button>
                    )}

                    {currentQuestion.type === 'MULTIPLE_CHOICE' &&
                      !currentQuestion.revealedAnswer && (
                        <button
                          type="button"
                          onClick={revealAnswer}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Rivela sul Tabellone</span>
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={triggerConfetti}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-lg flex items-center space-x-1"
                      title="Lancia coriandoli e suono vittoria"
                    >
                      <PartyPopper className="w-3.5 h-3.5" />
                      <span>Coriandoli</span>
                    </button>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {currentQuestion.text}
                </h2>

                {currentQuestion.type === 'MULTIPLE_CHOICE' &&
                  currentQuestion.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentQuestion.options.map((opt, idx) => {
                        const isRight =
                          currentQuestion.correctOptionIndex === idx;
                        const highlightRight =
                          isRight &&
                          (!hideCorrectInAdmin ||
                            Boolean(currentQuestion.revealedAnswer));

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-between ${
                              highlightRight
                                ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-200'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <span>
                              {String.fromCharCode(65 + idx)}. {opt}
                            </span>
                            {highlightRight && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                {currentQuestion.hostNote && !hideCorrectInAdmin && (
                  <p className="text-xs text-amber-300 bg-amber-950/30 border border-amber-500/20 px-3 py-2 rounded-xl">
                    📝 Nota conduttore: {currentQuestion.hostNote}
                  </p>
                )}

                {/* Navigazione Categoria */}
                {activeCategory && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        disabled={!hasPrev}
                        onClick={() => handleStepCategory(-1, false)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs font-bold flex items-center space-x-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Precedente</span>
                      </button>

                      <button
                        type="button"
                        disabled={activeCategory.questions.length < 2}
                        onClick={() => handleLaunchRandom(activeCategory)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 disabled:opacity-30 text-amber-300 text-xs font-bold flex items-center space-x-1"
                      >
                        <Dices className="w-4 h-4" />
                        <span>Casuale in Categoria</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        disabled={!hasNext}
                        onClick={() => handleStepCategory(1, false)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-xs font-bold flex items-center space-x-1 shadow"
                      >
                        <span>Prossima Domanda</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={!hasNext}
                        onClick={() => handleStepCategory(1, true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-xs font-bold flex items-center space-x-1 shadow"
                      >
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        <span>Prossima & Apri Buzzer</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card border border-slate-800 rounded-2xl p-6 text-center space-y-3">
                <p className="text-slate-300 font-bold">
                  {currentQuestion
                    ? 'Stai mostrando la Lobby sugli schermi.'
                    : 'Nessuna domanda attiva al momento.'}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {currentQuestion && (
                    <button
                      type="button"
                      onClick={() =>
                        setStatus(
                          currentQuestion.type === 'VOICE_ONLY'
                            ? 'BUZZER_OPEN'
                            : 'QUESTION_ACTIVE'
                        )
                      }
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Riprendi Domanda Precedente</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5"
                  >
                    <Tag className="w-4 h-4" />
                    <span>Scegli da Categorie & Domande</span>
                  </button>
                </div>
              </div>
            )}

            {/* Controlli Buzzer Live */}
            <div className="bg-card border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Controllo Buzzer Real-Time
                </h3>
                <p className="text-xs text-slate-400">
                  Sblocca i telefoni quando sei pronto a ricevere prenotazioni, oppure lancia al volo una domanda a voce.
                </p>
              </div>

              {/* Bottoni Azione Buzzer per la domanda corrente */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => armBuzzer()}
                  className={`py-4 px-6 rounded-xl font-black text-white text-base shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-98 ${
                    isBuzzerArmed
                      ? 'bg-emerald-600 ring-4 ring-emerald-500/50 animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  <Unlock className="w-5 h-5" />
                  <span>{isBuzzerArmed ? 'BUZZER ATTIVO!' : 'APRI BUZZER'}</span>
                </button>

                <button
                  type="button"
                  onClick={lockBuzzer}
                  className="py-4 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-2 active:scale-98"
                >
                  <Lock className="w-5 h-5 text-slate-400" />
                  <span>BLOCCA BUZZER</span>
                </button>

                <button
                  type="button"
                  onClick={resetBuzzer}
                  className="py-4 px-6 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-base rounded-xl border border-rose-900/50 transition-all flex items-center justify-center space-x-2 active:scale-98"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>SVUOTA CODA</span>
                </button>
              </div>

              {/* Lancio rapido domanda a voce improvvisata */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={voicePrompt}
                  onChange={(e) => setVoicePrompt(e.target.value)}
                  placeholder="Domanda a voce improvvisata (opzionale)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleStartVoiceBuzzer}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow transition-all shrink-0"
                >
                  <Mic className="w-4 h-4" />
                  <span>Nuova Domanda a Voce</span>
                </button>
              </div>
            </div>

            {/* Coda Prenotazioni Ordinata */}
            <div className="bg-card border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white text-lg">
                  Coda di Prenotazione al Millisecondo
                </h3>
                <span className="text-xs text-slate-400">
                  {buzzerQueue.length} prenotazioni registrate
                </span>
              </div>

              <BuzzerQueueList
                queue={buzzerQueue}
                isAdmin={true}
                onEvaluate={(teamId, res) => evaluateBuzz(teamId, res)}
              />
            </div>
          </div>
        )}

        {/* ================= TAB 3: CATEGORIE & DOMANDE ================= */}
        {activeTab === 'library' && (
          <QuestionLibraryManager
            onLaunchQuestion={handleLaunchFromLibrary}
            activeQuestionId={currentQuestion?.id || null}
          />
        )}
      </main>
    </div>
  );
};
