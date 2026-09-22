import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { usePhotos } from '../context/PhotoContext';
import { Photo } from '../types';

interface SwipeCardModeProps {
  onGoToUpload?: () => void;
  onGoToAdmin?: () => void;
}

export const SwipeCardMode: React.FC<SwipeCardModeProps> = ({ onGoToUpload, onGoToAdmin }) => {
  const { photos, voteSwipe, toggleFavorite, openPhotoModal } = usePhotos();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Motion values for swipe drag
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-15, 15]);
  const opacityLike = useTransform(x, [20, 150], [0, 1]);
  const opacityPass = useTransform(x, [-20, -150], [0, 1]);

  if (photos.length === 0) {
    return (
      <div className="py-20 text-center px-4 max-w-md mx-auto">
        <span className="px-4 py-1.5 rounded-full bg-neutral-900 text-xs text-amber-400 font-semibold mb-3 inline-block">
          Modo Deslizar (Swipe)
        </span>
        <h3 className="text-2xl font-bold text-white mb-2">
          Aún no hay fotografías para calificar
        </h3>
        <p className="text-sm text-neutral-400 font-light mb-6 leading-relaxed">
          Cualquiera puede subir sus capturas de Unalmed para que aparezcan en la baraja de votación.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
      </div>
    );
  }

  const currentPhoto: Photo | undefined = photos[currentIndex % photos.length];
  const nextPhoto: Photo | undefined = photos[(currentIndex + 1) % photos.length];

  const handleSwipeAction = (liked: boolean) => {
    if (!currentPhoto) return;
    voteSwipe(currentPhoto.id, liked);
    setCurrentIndex((prev) => prev + 1);
    x.set(0);
  };

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      handleSwipeAction(true);
    } else if (info.offset.x < -threshold) {
      handleSwipeAction(false);
    } else {
      x.set(0);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 flex flex-col items-center">
      {/* Header Info */}
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold block">
            Modo Deslizar (Swipe)
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Descubre y Califica
          </h2>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-neutral-900 text-xs font-medium text-neutral-300">
          {(currentIndex % photos.length) + 1} de {photos.length}
        </span>
      </div>

      {/* Swipe Stack Container */}
      <div className="relative w-full h-[520px] sm:h-[580px] flex items-center justify-center select-none">
        {/* Next card in stack (preview underneath) */}
        {nextPhoto && photos.length > 1 && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden bg-neutral-900 scale-95 opacity-50 blur-[1px] pointer-events-none">
            <img
              src={nextPhoto.imageUrl}
              alt={nextPhoto.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Active Draggable Card */}
        {currentPhoto && (
          <motion.div
            key={currentPhoto.id}
            style={{ x, rotate }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 rounded-3xl overflow-hidden bg-neutral-900 shadow-2xl cursor-grab active:cursor-grabbing flex flex-col justify-end"
          >
            {/* Visual is hero */}
            <img
              src={currentPhoto.imageUrl}
              alt={currentPhoto.title}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              referrerPolicy="no-referrer"
            />

            {/* Gradient Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent opacity-85 pointer-events-none" />

            {/* Swipe Indicators on Card (NO ICONS, NO BORDERS) */}
            <motion.div
              style={{ opacity: opacityLike }}
              className="absolute top-8 right-8 z-20 pointer-events-none px-5 py-2.5 rounded-2xl bg-emerald-500 text-white font-black text-xl tracking-wider shadow-xl transform rotate-12"
            >
              VOTAR
            </motion.div>

            <motion.div
              style={{ opacity: opacityPass }}
              className="absolute top-8 left-8 z-20 pointer-events-none px-5 py-2.5 rounded-2xl bg-rose-500 text-white font-black text-xl tracking-wider shadow-xl transform -rotate-12"
            >
              PASAR
            </motion.div>

            {/* Top Stats Tag */}
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
              <span className="px-3.5 py-1.5 rounded-full bg-neutral-950/80 backdrop-blur-md text-xs font-semibold text-neutral-200">
                {currentPhoto.points} Puntos
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openPhotoModal(currentPhoto);
                }}
                className="px-3.5 py-1.5 rounded-full bg-neutral-950/80 backdrop-blur-md text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-900 transition cursor-pointer"
              >
                Comentarios ({currentPhoto.comments.length})
              </button>
            </div>

            {/* Card Information */}
            <div className="relative z-10 p-6 sm:p-8 flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block">
                {currentPhoto.location}
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {currentPhoto.title}
              </h3>
              <p className="text-sm text-neutral-300 font-light">
                Por {currentPhoto.author}
              </p>
              {currentPhoto.description && (
                <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                  {currentPhoto.description}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Control Buttons (NO ICONS, NO BORDERS) */}
      <div className="w-full flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => handleSwipeAction(false)}
          className="flex-1 max-w-[130px] py-4 px-6 rounded-2xl bg-neutral-900 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-400 font-bold text-sm transition-all active:scale-95 cursor-pointer text-center"
        >
          Pasar
        </button>

        {currentPhoto && (
          <button
            onClick={() => toggleFavorite(currentPhoto.id)}
            className={`py-4 px-6 rounded-2xl font-bold text-sm transition-all active:scale-95 cursor-pointer text-center ${
              currentPhoto.isFavorite
                ? 'bg-amber-400 text-neutral-950 shadow-md'
                : 'bg-neutral-900 text-neutral-300 hover:text-amber-400 hover:bg-neutral-800'
            }`}
          >
            {currentPhoto.isFavorite ? 'En Favoritos' : 'Favorito'}
          </button>
        )}

        <button
          onClick={() => handleSwipeAction(true)}
          className="flex-1 max-w-[130px] py-4 px-6 rounded-2xl bg-white hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-all active:scale-95 cursor-pointer text-center shadow-lg"
        >
          Votar
        </button>
      </div>

      <p className="text-xs text-neutral-500 font-light mt-4 text-center">
        Arrastra a la derecha para sumar Puntos, a la izquierda para pasar, o utiliza los botones de acción.
      </p>
    </div>
  );
};
