import React, { useState, useEffect } from 'react';
import { VoteMode } from '../types';
import { TournamentDuel } from './TournamentDuel';
import { SwipeCardMode } from './SwipeCardMode';
import { usePhotos } from '../context/PhotoContext';

interface VoteViewProps {
  onGoToUpload: () => void;
  onGoToAdmin: () => void;
  onGoToDynamics: () => void;
}

export const VoteView: React.FC<VoteViewProps> = ({
  onGoToUpload,
  onGoToAdmin,
  onGoToDynamics,
}) => {
  const {
    adminVoteMode,
    activeDynamic,
    isVotingOpen,
    timeRemainingSeconds,
  } = usePhotos();

  // Internal tab mode if both are allowed
  const [internalMode, setInternalMode] = useState<VoteMode>('1v1');

  // Synchronize when admin setting changes
  useEffect(() => {
    if (adminVoteMode === '1v1') {
      setInternalMode('1v1');
    } else if (adminVoteMode === 'swipe') {
      setInternalMode('swipe');
    }
  }, [adminVoteMode]);

  const activeMode: VoteMode =
    adminVoteMode === '1v1'
      ? '1v1'
      : adminVoteMode === 'swipe'
      ? 'swipe'
      : internalMode;

  const formatTimer = (totalSeconds: number | null): string => {
    if (totalSeconds === null) return 'Indefinido';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full pb-16">
      {/* Dynamic Banner Header */}
      {activeDynamic && (
        <div className="w-full max-w-5xl mx-auto px-4 pt-4 pb-2">
          <div className="p-4 sm:p-5 rounded-3xl bg-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    isVotingOpen
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {isVotingOpen ? 'Dinámica Activa' : 'Votaciones Concluidas'}
                </span>
                <span className="text-xs text-neutral-400 font-medium">
                  {activeDynamic.durationHours > 0
                    ? `Tiempo restante: ${formatTimer(timeRemainingSeconds)}`
                    : 'Tiempo: Indefinido'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {activeDynamic.title}
              </h2>
            </div>

            <button
              onClick={onGoToDynamics}
              className="px-4 py-2 rounded-full bg-neutral-950 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer self-start sm:self-auto shrink-0"
            >
              Ver todas las dinámicas →
            </button>
          </div>
        </div>
      )}

      {/* If voting is closed, show banner and prompt to view top 3 */}
      {!isVotingOpen ? (
        <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
          <div className="p-8 sm:p-10 rounded-3xl bg-neutral-900 space-y-4 shadow-xl">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
              Ronda Finalizada
            </span>
            <h2 className="text-2xl font-black text-white">
              Las votaciones de esta dinámica han concluido
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
              El tiempo programado para esta dinámica llegó a su límite. Ya se encuentran calculados los resultados oficiales y el podio con las Top 3 fotografías.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onGoToDynamics}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs transition cursor-pointer"
              >
                Consultar el Top 3 y resultados
              </button>
              <button
                onClick={onGoToAdmin}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Panel de Administrador
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Mode Switch or Badge */}
          {adminVoteMode === 'both' ? (
            <div className="flex justify-center pt-3 pb-2">
              <div className="inline-flex p-1.5 bg-neutral-900 rounded-full">
                <button
                  onClick={() => setInternalMode('1v1')}
                  className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeMode === '1v1'
                      ? 'bg-white text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Duelos 1v1
                </button>
                <button
                  onClick={() => setInternalMode('swipe')}
                  className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeMode === 'swipe'
                      ? 'bg-white text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Deslizar (Swipe)
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center pt-3 pb-2">
              <div className="px-4 py-1.5 rounded-full bg-neutral-900 text-xs text-neutral-400 font-medium">
                Modo fijado por administración:{' '}
                <span className="text-white font-semibold">
                  {adminVoteMode === '1v1'
                    ? 'Torneo Duelos 1v1'
                    : 'Deslizar Tarjetas (Swipe)'}
                </span>
              </div>
            </div>
          )}

          {/* Render active tournament component */}
          {activeMode === '1v1' ? (
            <TournamentDuel onGoToUpload={onGoToUpload} onGoToAdmin={onGoToAdmin} />
          ) : (
            <SwipeCardMode onGoToUpload={onGoToUpload} onGoToAdmin={onGoToAdmin} />
          )}
        </>
      )}
    </div>
  );
};
