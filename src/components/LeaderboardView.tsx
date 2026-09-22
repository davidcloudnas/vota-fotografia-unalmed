import React, { useState } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { LeaderboardSort, Photo } from '../types';

interface LeaderboardViewProps {
  onGoToUpload?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onGoToUpload }) => {
  const { photos, openPhotoModal, toggleFavorite } = usePhotos();
  const [sortMode, setSortMode] = useState<LeaderboardSort>('points');

  const getSortedPhotos = (): Photo[] => {
    const list = [...photos];
    switch (sortMode) {
      case 'points':
        return list.sort((a, b) => b.points - a.points);
      case 'votes':
        return list.sort(
          (a, b) =>
            b.matchesPlayed + b.swipeLikes + b.swipePasses -
            (a.matchesPlayed + a.swipeLikes + a.swipePasses)
        );
      case 'winrate':
        return list.sort((a, b) => {
          const rateA = a.matchesPlayed > 0 ? a.matchesWon / a.matchesPlayed : 0;
          const rateB = b.matchesPlayed > 0 ? b.matchesWon / b.matchesPlayed : 0;
          return rateB - rateA;
        });
      case 'favorites':
        return list.filter((p) => p.isFavorite).sort((a, b) => b.points - a.points);
      default:
        return list;
    }
  };

  const sortedList = getSortedPhotos();
  const topThree = sortedList.slice(0, 3);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Clasificación Oficial
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Fotografías Más Valoradas
          </h1>
          <p className="text-sm text-neutral-400 font-light mt-1">
            Ranking según Puntos acumulados en duelos 1v1 y votos de la comunidad Unalmed.
          </p>
        </div>

        {/* Filter Pills (NO ICONS, NO BORDERS) */}
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-neutral-900 rounded-full self-start md:self-auto">
          <button
            onClick={() => setSortMode('points')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              sortMode === 'points'
                ? 'bg-white text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Puntos
          </button>
          <button
            onClick={() => setSortMode('votes')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              sortMode === 'votes'
                ? 'bg-white text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Más Votadas
          </button>
          <button
            onClick={() => setSortMode('winrate')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              sortMode === 'winrate'
                ? 'bg-white text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Efectividad Duelos
          </button>
          <button
            onClick={() => setSortMode('favorites')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              sortMode === 'favorites'
                ? 'bg-amber-400 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Mis Favoritas
          </button>
        </div>
      </div>

      {sortedList.length === 0 ? (
        <div className="py-20 text-center bg-neutral-900/50 rounded-3xl p-8 max-w-lg mx-auto">
          <h3 className="text-xl font-bold text-white mb-2">
            La tabla de clasificación está vacía
          </h3>
          <p className="text-sm text-neutral-400 font-light mb-6">
            Aún no se han publicado fotografías para este filtro. ¡Sé la primera persona en subir una foto y liderar el ranking con tus Puntos!
          </p>
          {onGoToUpload && (
            <button
              onClick={onGoToUpload}
              className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm transition cursor-pointer"
            >
              Subir fotografía ahora
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Top 3 Visual Showcase */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {topThree.map((photo, index) => {
                const rankLabels = ['Primer Lugar', 'Segundo Lugar', 'Tercer Lugar'];
                const rankColors = [
                  'bg-amber-400 text-neutral-950',
                  'bg-neutral-200 text-neutral-950',
                  'bg-amber-700 text-white',
                ];

                return (
                  <div
                    key={photo.id}
                    onClick={() => openPhotoModal(photo)}
                    className="group relative rounded-3xl overflow-hidden bg-neutral-900 cursor-pointer flex flex-col justify-end aspect-[4/5] shadow-xl transform transition-transform hover:-translate-y-1"
                  >
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent opacity-90" />

                    {/* Rank Badge */}
                    <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
                      <span
                        className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase ${rankColors[index]}`}
                      >
                        Puesto #{index + 1} • {rankLabels[index]}
                      </span>

                      <span className="px-3 py-1 rounded-full bg-neutral-950/80 backdrop-blur-md text-xs font-semibold text-neutral-200">
                        {photo.points} Puntos
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="relative z-10 p-6 flex flex-col gap-2">
                      <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block">
                        {photo.location}
                      </span>
                      <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
                        {photo.title}
                      </h3>
                      <p className="text-xs text-neutral-300 font-light">
                        Por {photo.author}
                      </p>

                      <div className="flex items-center justify-between pt-3 mt-2 text-xs text-neutral-400">
                        <span>
                          {photo.matchesWon} victorias ({photo.matchesPlayed} duelos)
                        </span>
                        <span>{photo.comments.length} comentarios</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Ranked List */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white mb-4">
              Tabla General ({sortedList.length} Fotografías)
            </h3>

            {sortedList.map((photo, index) => {
              const winRate =
                photo.matchesPlayed > 0
                  ? Math.round((photo.matchesWon / photo.matchesPlayed) * 100)
                  : 0;

              return (
                <div
                  key={photo.id}
                  onClick={() => openPhotoModal(photo)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 transition-all cursor-pointer gap-4"
                >
                  {/* Left: Position & Preview */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-lg sm:text-2xl font-black text-neutral-500 group-hover:text-white w-8 text-center transition-colors">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-neutral-950 shrink-0">
                      <img
                        src={photo.imageUrl}
                        alt={photo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div>
                      <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block">
                        {photo.location}
                      </span>
                      <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-neutral-100">
                        {photo.title}
                      </h4>
                      <p className="text-xs text-neutral-400 font-light">
                        Fotógrafo/a: {photo.author}
                      </p>
                    </div>
                  </div>

                  {/* Right: Scores & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="block text-lg font-black text-white">
                        {photo.points} Puntos
                      </span>
                      <span className="block text-xs text-neutral-400">
                        {winRate}% victorias ({photo.matchesWon}/{photo.matchesPlayed})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(photo.id);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          photo.isFavorite
                            ? 'bg-amber-400 text-neutral-950'
                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {photo.isFavorite ? 'Favorita' : 'Guardar'}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPhotoModal(photo);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition cursor-pointer"
                      >
                        Comentarios ({photo.comments.length})
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
