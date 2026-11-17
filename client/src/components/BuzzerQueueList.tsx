import React from 'react';
import { BuzzerQueueItem } from '../types/shared';
import { Check, X, Clock } from 'lucide-react';

interface BuzzerQueueListProps {
  queue: BuzzerQueueItem[];
  isAdmin: boolean;
  large?: boolean;
  onEvaluate?: (teamId: string, result: 'CORRECT' | 'WRONG') => void;
}

export const BuzzerQueueList: React.FC<BuzzerQueueListProps> = ({
  queue,
  isAdmin,
  large = false,
  onEvaluate,
}) => {
  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-center">
        <Clock className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
        <p className="text-slate-400 font-medium text-sm">
          Nessuna prenotazione ricevuta
        </p>
        <p className="text-xs text-slate-500 mt-1">
          La coda apparirà qui non appena i giocatori premeranno il Buzzer.
        </p>
      </div>
    );
  }

  const currentActiveIndex = queue.findIndex((item) => item.status === 'ACTIVE');

  return (
    <div className="space-y-3 w-full">
      {queue.map((item, index) => {
        const isCurrentTurn = index === currentActiveIndex;
        const isCorrect = item.status === 'CORRECT';
        const isWrong = item.status === 'WRONG';

        return (
          <div
            key={`${item.teamId}-${item.serverTimestamp}-${item.sequence}`}
            className={`flex flex-col sm:flex-row sm:items-center justify-between ${
              large ? 'p-5' : 'p-4'
            } rounded-xl border transition-all ${
              isCurrentTurn
                ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                : isCorrect
                ? 'bg-emerald-950/35 border-emerald-500/60 opacity-95'
                : isWrong
                ? 'bg-rose-950/20 border-rose-900/50 opacity-50'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span
                className={`${
                  large ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm'
                } rounded-full flex items-center justify-center font-black shrink-0 ${
                  isCurrentTurn
                    ? 'bg-indigo-500 text-white animate-pulse'
                    : isCorrect
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                #{index + 1}
              </span>

              <div
                className={`${large ? 'w-5 h-5' : 'w-4 h-4'} rounded-full shrink-0 shadow-sm`}
                style={{ backgroundColor: item.teamColor }}
              />

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4
                    className={`font-bold text-white ${
                      large ? 'text-xl' : 'text-base'
                    }`}
                  >
                    {item.teamName}
                  </h4>
                  {isCurrentTurn && (
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">
                      IN RISPOSTA
                    </span>
                  )}
                  {isCorrect && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Corretta!
                    </span>
                  )}
                  {isWrong && (
                    <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <X className="w-3 h-3" /> Errata
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center space-x-2">
                  <span>⏱️ Reazione: +{item.responseTimeMs} ms</span>
                </div>
              </div>
            </div>

            {isAdmin && isCurrentTurn && onEvaluate && (
              <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                <button
                  type="button"
                  onClick={() => onEvaluate(item.teamId, 'CORRECT')}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Corretta</span>
                </button>
                <button
                  type="button"
                  onClick={() => onEvaluate(item.teamId, 'WRONG')}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1 px-3 py-2 bg-rose-600/80 hover:bg-rose-500 text-white rounded-lg font-semibold text-sm shadow-md transition-all active:scale-95"
                  title="Marca errata e passa al giocatore successivo"
                >
                  <X className="w-4 h-4" />
                  <span>Errata (Passa)</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
