import React, { useState } from 'react';
import { BuzzerState } from '../types/shared';
import { soundManager } from '../services/audio';
import { Zap, Lock, CheckCircle2, XCircle, Trophy } from 'lucide-react';

interface BuzzerButtonProps {
  state: BuzzerState;
  teamColor: string;
  teamName: string;
  queuePosition: number | null;
  buzzOutcome?: 'ACTIVE' | 'WRONG' | 'CORRECT' | null;
  isMyTurn?: boolean;
  onBuzz: () => void;
}

export const BuzzerButton: React.FC<BuzzerButtonProps> = ({
  state,
  teamColor,
  teamName,
  queuePosition,
  buzzOutcome = null,
  isMyTurn = false,
  onBuzz,
}) => {
  const [justPressed, setJustPressed] = useState(false);

  const handleClick = () => {
    soundManager.enableAudio();

    if (state !== 'ARMED') return;

    setJustPressed(true);
    setTimeout(() => setJustPressed(false), 400);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 80]);
      } catch {
        // Ignora su browser non compatibili
      }
    }

    onBuzz();
  };

  const isArmed = state === 'ARMED';
  const isBuzzed = state === 'BUZZED';
  const isWrong = isBuzzed && buzzOutcome === 'WRONG';
  const isCorrect = isBuzzed && buzzOutcome === 'CORRECT';

  const circleColor = isArmed
    ? teamColor || '#3B82F6'
    : isWrong
    ? '#BE123C'
    : isCorrect
    ? '#059669'
    : isBuzzed
    ? isMyTurn
      ? '#4F46E5'
      : '#059669'
    : '#1E293B';

  const circleShadow = isArmed
    ? `0 0 60px ${teamColor || '#3B82F6'}88, 0 10px 25px rgba(0,0,0,0.5)`
    : isWrong
    ? '0 0 35px rgba(225, 29, 72, 0.45)'
    : isCorrect
    ? '0 0 55px rgba(16, 185, 129, 0.7)'
    : isBuzzed
    ? isMyTurn
      ? '0 0 50px rgba(99, 102, 241, 0.65)'
      : '0 0 35px rgba(16, 185, 129, 0.4)'
    : 'none';

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto select-none">
      {justPressed && (
        <div
          className="fixed inset-0 pointer-events-none z-50 animate-ping opacity-30"
          style={{ backgroundColor: teamColor || '#6366F1' }}
        />
      )}

      <button
        type="button"
        disabled={!isArmed}
        onClick={handleClick}
        className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-full flex flex-col items-center justify-center p-6 text-center font-black transition-all duration-150 transform active:scale-95 shadow-2xl ${
          isArmed
            ? 'animate-pulse cursor-pointer hover:scale-102 ring-8 ring-white/40'
            : isWrong
            ? 'cursor-default ring-8 ring-rose-500/40 opacity-90'
            : isCorrect
            ? 'cursor-default ring-8 ring-emerald-400/70'
            : isBuzzed
            ? isMyTurn
              ? 'cursor-default ring-8 ring-indigo-400/70 animate-pulse'
              : 'cursor-default ring-8 ring-emerald-500/40'
            : 'cursor-not-allowed opacity-50 bg-slate-800 ring-4 ring-slate-700'
        }`}
        style={{
          backgroundColor: circleColor,
          boxShadow: circleShadow,
        }}
      >
        {isArmed && (
          <>
            <Zap className="w-16 h-16 sm:w-20 sm:h-20 text-white fill-white drop-shadow-lg mb-2 animate-bounce-short" />
            <span className="text-3xl sm:text-4xl text-white tracking-wider drop-shadow-md">
              PREMI!
            </span>
            <span className="text-xs text-white/90 mt-1 uppercase tracking-widest font-bold">
              {teamName}
            </span>
          </>
        )}

        {isWrong && (
          <>
            <XCircle className="w-14 h-14 sm:w-16 sm:h-16 text-white mb-2" />
            <span className="text-xl sm:text-2xl text-white uppercase tracking-wider">
              ERRATA
            </span>
            <span className="text-xs text-rose-100 mt-1 font-bold">
              Attendi il prossimo round
            </span>
          </>
        )}

        {isCorrect && (
          <>
            <Trophy className="w-14 h-14 sm:w-16 sm:h-16 text-amber-300 mb-2 animate-bounce-short" />
            <span className="text-xl sm:text-2xl text-white uppercase tracking-wider">
              ESATTA!
            </span>
            <span className="text-xs text-emerald-100 mt-1 font-bold">
              Ottima risposta, {teamName}!
            </span>
          </>
        )}

        {isBuzzed && !isWrong && !isCorrect && (
          <>
            <CheckCircle2 className="w-14 h-14 sm:w-16 sm:h-16 text-white mb-2" />
            <span className="text-xl sm:text-2xl text-white uppercase tracking-wider">
              {isMyTurn ? 'TOCCA A TE!' : 'PRENOTATO'}
            </span>
            {queuePosition !== null && (
              <span className="text-3xl sm:text-4xl font-extrabold text-white mt-1 bg-black/30 px-4 py-1 rounded-full">
                {queuePosition}° in coda
              </span>
            )}
          </>
        )}

        {!isArmed && !isBuzzed && (
          <>
            <Lock className="w-12 h-12 text-slate-500 mb-2" />
            <span className="text-lg sm:text-xl text-slate-400 uppercase tracking-wider">
              BUZZER BLOCCATO
            </span>
            <span className="text-xs text-slate-500 mt-2">
              In attesa dell'Admin...
            </span>
          </>
        )}
      </button>

      <div className="mt-6 text-center">
        {isArmed && (
          <p className="text-emerald-400 font-bold text-sm tracking-wide animate-pulse">
            ● Buzzer Aperto! Premi per rispondere!
          </p>
        )}
        {isWrong && (
          <p className="text-rose-300 font-medium text-sm">
            La risposta è stata valutata errata. La parola passa a chi è dopo in coda.
          </p>
        )}
        {isCorrect && (
          <p className="text-emerald-300 font-bold text-sm">
            Hai dato la risposta corretta!
          </p>
        )}
        {isBuzzed && !isWrong && !isCorrect && (
          <p className="text-slate-300 font-medium text-sm">
            {isMyTurn
              ? '🌟 È il tuo turno di rispondere! Guarda le opzioni sul PC principale!'
              : `Sei in posizione #${queuePosition}. Attendi il tuo turno se chi è davanti sbaglia.`}
          </p>
        )}
        {!isArmed && !isBuzzed && (
          <p className="text-slate-500 text-sm">
            Leggi la domanda e guarda le risposte sul PC principale. Il buzzer si sbloccherà al segnale!
          </p>
        )}
      </div>
    </div>
  );
};
