import React, { useState } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { DynamicSession, PhotoSnapshot } from '../types';

interface DynamicsViewProps {
  onGoToVoting: () => void;
  onGoToAdmin: () => void;
}

export const DynamicsView: React.FC<DynamicsViewProps> = ({ onGoToVoting, onGoToAdmin }) => {
  const {
    dynamics,
    activeDynamic,
    isVotingOpen,
    timeRemainingSeconds,
    isAdmin,
  } = usePhotos();

  const [selectedSession, setSelectedSession] = useState<DynamicSession | null>(null);

  // Format seconds to hh:mm:ss
  const formatTimer = (totalSeconds: number | null): string => {
    if (totalSeconds === null) return 'Indefinido';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (ms: number): string => {
    return new Date(ms).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // If a specific session top 3 modal/page is selected
  if (selectedSession) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        {/* Back header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={() => setSelectedSession(null)}
            className="px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
          >
            ← Volver a lista de dinámicas
          </button>

          <span className="text-xs text-neutral-400">
            Finalizada el {selectedSession.closedAt ? formatDate(selectedSession.closedAt) : 'Recientemente'}
          </span>
        </div>

        {/* Dynamic Title */}
        <div className="mb-8">
          <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold block mb-1">
            Resultados Oficiales • Cuadro de Honor
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {selectedSession.title}
          </h1>
          {selectedSession.description && (
            <p className="text-sm text-neutral-400 font-light mt-1 max-w-3xl">
              {selectedSession.description}
            </p>
          )}
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-neutral-400">
            <span>Votos totales emitidos: <strong className="text-white">{selectedSession.totalVotesAtClose}</strong></span>
            <span>•</span>
            <span>Fotografías participantes: <strong className="text-white">{selectedSession.allRankedPhotos.length}</strong></span>
          </div>
        </div>

        {/* TOP 3 HERO SECTION */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">
            Podio de Honor • Top 3 Fotografías Ganadoras
          </h2>

          {selectedSession.top3.length === 0 ? (
            <div className="p-8 text-center bg-neutral-900 rounded-3xl text-neutral-400 text-sm">
              No hubo fotografías registradas en el cierre de esta dinámica.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {selectedSession.top3.map((photo: PhotoSnapshot, idx: number) => {
                const medals = ['1er Lugar', '2do Lugar', '3er Lugar'];
                const badges = [
                  'bg-amber-400 text-neutral-950',
                  'bg-neutral-200 text-neutral-950',
                  'bg-amber-700 text-white',
                ];

                return (
                  <div
                    key={photo.id}
                    className="group relative rounded-3xl overflow-hidden bg-neutral-900 flex flex-col justify-end aspect-[4/5] shadow-2xl"
                  >
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent opacity-90" />

                    <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
                      <span
                        className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase ${badges[idx]}`}
                      >
                        {medals[idx]}
                      </span>
                      <span className="px-3.5 py-1.5 rounded-full bg-neutral-950/80 backdrop-blur-md text-xs font-semibold text-neutral-200">
                        {photo.points} Puntos
                      </span>
                    </div>

                    <div className="relative z-10 p-6 flex flex-col gap-2">
                      <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block">
                        {photo.location}
                      </span>
                      <h3 className="text-2xl font-bold text-white tracking-tight leading-tight">
                        {photo.title}
                      </h3>
                      <p className="text-xs text-neutral-300 font-light">
                        Por {photo.author}
                      </p>

                      <div className="flex items-center justify-between pt-3 mt-2 text-xs text-neutral-400">
                        <span>
                          {photo.matchesWon} victorias ({photo.matchesPlayed} duelos)
                        </span>
                        <span>{photo.swipeLikes} likes swipe</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* REST OF RANKING */}
        {selectedSession.allRankedPhotos.length > 3 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white mb-4">
              Puestos Restantes ({selectedSession.allRankedPhotos.length - 3})
            </h3>

            {selectedSession.allRankedPhotos.slice(3).map((photo, index) => (
              <div
                key={photo.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl bg-neutral-900/80 gap-4"
              >
                <div className="flex items-center gap-4 sm:gap-6">
                  <span className="text-base sm:text-xl font-black text-neutral-500 w-8 text-center">
                    {String(index + 4).padStart(2, '0')}
                  </span>

                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-950 shrink-0">
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div>
                    <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block">
                      {photo.location}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-white">
                      {photo.title}
                    </h4>
                    <p className="text-xs text-neutral-400 font-light">
                      Por {photo.author}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="block text-base font-bold text-white">
                    {photo.points} Puntos
                  </span>
                  <span className="block text-xs text-neutral-400">
                    {photo.matchesWon} victorias / {photo.matchesPlayed} duelos
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Torneos y Desafíos Temporales
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Dinámicas de Votación
          </h1>
          <p className="text-sm text-neutral-400 font-light mt-1">
            Cada dinámica reúne los duelos de la comunidad durante un tiempo determinado o hasta su cierre, inmortalizando a los Top 3 ganadores.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={onGoToAdmin}
            className="px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-amber-400 transition cursor-pointer self-start md:self-auto"
          >
            Configurar / Iniciar nueva dinámica
          </button>
        )}
      </div>

      {/* ACTIVE DYNAMIC BANNER */}
      {activeDynamic && (
        <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-neutral-900 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isVotingOpen
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {isVotingOpen ? 'Dinámica Activa' : 'Dinámica Cerrada'}
                </span>

                {isVotingOpen && (
                  <span className="px-3 py-1 rounded-full bg-neutral-950 text-xs font-semibold text-amber-400">
                    {activeDynamic.durationHours > 0
                      ? `Tiempo restante: ${formatTimer(timeRemainingSeconds)}`
                      : 'Duración: Indefinida'}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {activeDynamic.title}
              </h2>

              {activeDynamic.description && (
                <p className="text-sm text-neutral-300 font-light max-w-2xl">
                  {activeDynamic.description}
                </p>
              )}

              <p className="text-xs text-neutral-500 pt-1">
                Iniciada el {formatDate(activeDynamic.startedAt)} • {activeDynamic.durationHours > 0 ? `${activeDynamic.durationHours} horas programadas` : 'Cierre manual por el administrador'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {isVotingOpen ? (
                <button
                  onClick={onGoToVoting}
                  className="px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm transition cursor-pointer shadow-lg text-center"
                >
                  Ir a votar en esta dinámica
                </button>
              ) : (
                <button
                  onClick={() => setSelectedSession(activeDynamic)}
                  className="px-6 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-sm transition cursor-pointer shadow-lg text-center"
                >
                  Ver Podio y Top 3 Ganadores
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HISTORICAL FINISHED DYNAMICS */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6">
          Historial de Dinámicas Concluidas ({dynamics.length})
        </h2>

        {dynamics.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-neutral-900/60 rounded-3xl max-w-md mx-auto">
            <h3 className="text-base font-bold text-white mb-1">
              Aún no hay dinámicas finalizadas
            </h3>
            <p className="text-xs text-neutral-400 font-light">
              Cuando el temporizador de una dinámica llegue a su fin o el administrador concluya la ronda, aquí se archivarán con sus respectivos Top 3.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dynamics.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="group p-6 rounded-3xl bg-neutral-900 hover:bg-neutral-850 transition-all cursor-pointer flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-neutral-950 text-neutral-400 text-xs font-semibold">
                      Finalizada
                    </span>
                    <span className="text-xs text-neutral-500">
                      {session.closedAt ? formatDate(session.closedAt) : ''}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors mb-2">
                    {session.title}
                  </h3>

                  {session.description && (
                    <p className="text-xs text-neutral-400 font-light line-clamp-2 mb-4 leading-relaxed">
                      {session.description}
                    </p>
                  )}

                  {/* Top 3 mini previews */}
                  <div className="flex items-center gap-2 mb-4">
                    {session.top3.slice(0, 3).map((p, i) => (
                      <div
                        key={p.id}
                        className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-950 shrink-0"
                      >
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                    {session.top3.length === 0 && (
                      <span className="text-xs text-neutral-600">Sin imágenes registradas</span>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between text-xs text-neutral-400">
                  <span>{session.totalVotesAtClose} votos</span>
                  <span className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                    Ver Top 3 y Resultados →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
