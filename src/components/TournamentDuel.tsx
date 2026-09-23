import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Photo } from '../types';
import { usePhotos } from '../context/PhotoContext';

interface TournamentDuelProps {
  onGoToUpload?: () => void;
  onGoToAdmin?: () => void;
}

export const TournamentDuel: React.FC<TournamentDuelProps> = ({ onGoToUpload, onGoToAdmin }) => {
  const { activeDuel, voteDuel, nextDuel, openPhotoModal, photos, hasUserVotedDuelPair } = usePhotos();
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);

  if (photos.length < 2 || !activeDuel || activeDuel.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 max-w-xl mx-auto">
        <span className="px-4 py-1.5 rounded-full bg-neutral-900 text-xs text-amber-400 font-semibold mb-3">
          Torneo Duelos 1v1
        </span>
        <h3 className="text-2xl font-bold text-white mb-2">
          {photos.length === 0
            ? 'Aún no hay fotografías registradas'
            : photos.length === 1
            ? 'Se requiere al menos otra fotografía para competir'
            : 'Preparando duelos'}
        </h3>
        <p className="text-sm text-neutral-400 font-light mb-6 leading-relaxed">
          {photos.length < 2
            ? 'Cualquier estudiante o miembro de la comunidad puede subir sus fotos sin restricciones para comenzar los duelos de Unalmed.'
            : 'Haz clic para seleccionar un par aleatorio de fotografías.'}
        </p>

        {photos.length < 2 ? (
          <div className="flex flex-col sm:flex-row gap-3">
            {onGoToUpload && (
              <button
                onClick={onGoToUpload}
                className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm transition cursor-pointer"
              >
                Subir primera fotografía
              </button>
            )}
            {onGoToAdmin && (
              <button
                onClick={onGoToAdmin}
                className="px-6 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-sm font-medium transition cursor-pointer"
              >
                Ajustes de Administrador
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={nextDuel}
            className="px-6 py-3 rounded-2xl bg-white text-neutral-950 font-bold text-sm hover:bg-neutral-200 transition cursor-pointer"
          >
            Generar enfrentamiento
          </button>
        )}
      </div>
    );
  }

  const [photoA, photoB] = activeDuel;
  const isPairAlreadyVoted = Boolean(photoA && photoB && hasUserVotedDuelPair(photoA.id, photoB.id));

  const handleVote = (winner: Photo, loser: Photo) => {
    if (isPairAlreadyVoted) return;
    setSelectedWinnerId(winner.id);
    setTimeout(() => {
      voteDuel(winner.id, loser.id);
      setSelectedWinnerId(null);
    }, 400);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Contextual instruction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold block">
            Torneo de Selección 1v1
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ¿Cuál fotografía representa mejor a Unalmed?
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={nextDuel}
            className="px-4 py-2 text-sm rounded-full bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            Saltar duelo
          </button>
        </div>
      </div>

      {isPairAlreadyVoted && (
        <div className="w-full mb-6 p-4 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-300 text-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            Ya registraste tu voto en este enfrentamiento. Para garantizar un conteo limpio, no se permite el voto duplicado.
          </span>
          <button
            onClick={nextDuel}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shrink-0 cursor-pointer"
          >
            Siguiente duelo →
          </button>
        </div>
      )}

      {/* Duel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[580px]">
        {/* Photo A */}
        <AnimatePresence mode="wait">
          <motion.div
            key={photoA.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{
              opacity: 1,
              scale: selectedWinnerId === photoA.id ? 1.02 : 1,
            }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            className={`group relative rounded-3xl overflow-hidden bg-neutral-900 flex flex-col justify-end aspect-[4/5] sm:aspect-[16/11] lg:aspect-[4/5] shadow-2xl ${
              selectedWinnerId === photoA.id ? 'ring-4 ring-emerald-500' : ''
            }`}
          >
            {/* Visual content */}
            <img
              src={photoA.imageUrl}
              alt={photoA.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              referrerPolicy="no-referrer"
            />

            {/* Gradient Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />

            {/* Points & Metrics Tag at top */}
            <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
              <span className="px-3.5 py-1.5 rounded-full bg-neutral-950/80 backdrop-blur-md text-xs font-semibold text-neutral-200">
                {photoA.points} Puntos
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openPhotoModal(photoA);
                }}
                className="px-3.5 py-1.5 rounded-full bg-neutral-950/80 backdrop-blur-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
              >
                Comentarios ({photoA.comments.length})
              </button>
            </div>

            {/* Bottom Content & Selection */}
            <div className="relative z-10 p-6 sm:p-8 flex flex-col gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block mb-1">
                  {photoA.location}
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                  {photoA.title}
                </h3>
                <p className="text-sm text-neutral-300 font-light mt-1">
                  Por {photoA.author}
                </p>
                {photoA.description && (
                  <p className="text-xs text-neutral-400 line-clamp-2 mt-2 leading-relaxed">
                    {photoA.description}
                  </p>
                )}
              </div>

              {/* Action Buttons (NO ICONS, NO BORDERS) */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => !isPairAlreadyVoted && handleVote(photoA, photoB)}
                  disabled={isPairAlreadyVoted}
                  className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-base transition-transform active:scale-95 text-center shadow-lg ${
                    isPairAlreadyVoted
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-white hover:bg-neutral-100 text-neutral-950 cursor-pointer'
                  }`}
                >
                  {isPairAlreadyVoted ? 'Ya votaste en este duelo' : 'Elegir esta fotografía'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openPhotoModal(photoA);
                  }}
                  className="py-3.5 px-4 rounded-2xl bg-neutral-800/90 hover:bg-neutral-700 text-white font-medium text-sm transition cursor-pointer"
                >
                  Detalles
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Photo B */}
        <AnimatePresence mode="wait">
          <motion.div
            key={photoB.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{
              opacity: 1,
              scale: selectedWinnerId === photoB.id ? 1.02 : 1,
            }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            className={`group relative rounded-3xl overflow-hidden bg-neutral-900 flex flex-col justify-end aspect-[4/5] sm:aspect-[16/11] lg:aspect-[4/5] shadow-2xl ${
              selectedWinnerId === photoB.id ? 'ring-4 ring-emerald-500' : ''
            }`}
          >
            {/* Visual content */}
            <img
              src={photoB.imageUrl}
              alt={photoB.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              referrerPolicy="no-referrer"
            />

            {/* Gradient Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />

            {/* Points & Metrics Tag */}
            <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
              <span className="px-3.5 py-1.5 rounded-full bg-neutral-950/80 backdrop-blur-md text-xs font-semibold text-neutral-200">
                {photoB.points} Puntos
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openPhotoModal(photoB);
                }}
                className="px-3.5 py-1.5 rounded-full bg-neutral-950/80 backdrop-blur-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
              >
                Comentarios ({photoB.comments.length})
              </button>
            </div>

            {/* Bottom Content & Selection */}
            <div className="relative z-10 p-6 sm:p-8 flex flex-col gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block mb-1">
                  {photoB.location}
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                  {photoB.title}
                </h3>
                <p className="text-sm text-neutral-300 font-light mt-1">
                  Por {photoB.author}
                </p>
                {photoB.description && (
                  <p className="text-xs text-neutral-400 line-clamp-2 mt-2 leading-relaxed">
                    {photoB.description}
                  </p>
                )}
              </div>

              {/* Action Buttons (NO ICONS, NO BORDERS) */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => !isPairAlreadyVoted && handleVote(photoB, photoA)}
                  disabled={isPairAlreadyVoted}
                  className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-base transition-transform active:scale-95 text-center shadow-lg ${
                    isPairAlreadyVoted
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-white hover:bg-neutral-100 text-neutral-950 cursor-pointer'
                  }`}
                >
                  {isPairAlreadyVoted ? 'Ya votaste en este duelo' : 'Elegir esta fotografía'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openPhotoModal(photoB);
                  }}
                  className="py-3.5 px-4 rounded-2xl bg-neutral-800/90 hover:bg-neutral-700 text-white font-medium text-sm transition cursor-pointer"
                >
                  Detalles
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Minimalist footer tip */}
      <div className="mt-8 text-center text-xs text-neutral-500 font-light">
        El sistema de duelos otorga Puntos según el rendimiento en cada enfrentamiento, actualizando la tabla de clasificación.
      </div>
    </div>
  );
};
