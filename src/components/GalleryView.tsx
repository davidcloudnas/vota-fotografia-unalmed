import React from 'react';
import { usePhotos } from '../context/PhotoContext';

interface GalleryViewProps {
  onGoToUpload?: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ onGoToUpload }) => {
  const { photos, openPhotoModal } = usePhotos();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div>
          <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Galería Fotográfica
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Fotografia Unalmed
          </h1>
          <p className="text-sm text-neutral-400 font-light mt-1">
            Catálogo fotográfico oficial de la comunidad Unalmed.
          </p>
        </div>

        {photos.length > 0 && onGoToUpload && (
          <button
            type="button"
            onClick={onGoToUpload}
            className="px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs transition cursor-pointer"
          >
            Subir Fotografía
          </button>
        )}
      </div>

      {/* Visual Photography Grid */}
      {photos.length === 0 ? (
        <div className="py-24 text-center bg-neutral-900/50 rounded-3xl p-8 max-w-lg mx-auto">
          <h3 className="text-xl font-bold text-white mb-2">
            No hay fotografías registradas aún
          </h3>
          <p className="text-neutral-400 text-sm font-light mb-6">
            Sube tus fotografías o sincronízalas desde el panel de administración para verlas aquí.
          </p>
          {onGoToUpload && (
            <button
              onClick={onGoToUpload}
              className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm transition cursor-pointer"
            >
              Subir fotografía
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => openPhotoModal(photo)}
              className="group relative rounded-3xl overflow-hidden bg-neutral-900 cursor-pointer aspect-[4/5] flex flex-col justify-end shadow-lg transition-transform duration-500 hover:-translate-y-1"
            >
              <img
                src={photo.imageUrl}
                alt={photo.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
                referrerPolicy="no-referrer"
              />

              {/* Gradient scrim for text */}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

              {/* Floating badges */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-neutral-950/80 backdrop-blur-md text-xs font-semibold text-neutral-200">
                  {photo.points} Puntos
                </span>
                {photo.isFavorite && (
                  <span className="px-3 py-1 rounded-full bg-amber-400 text-neutral-950 text-xs font-bold">
                    Favorita
                  </span>
                )}
                {photo.driveWebViewLink && (
                  <span className="px-2.5 py-1 rounded-full bg-neutral-900/80 backdrop-blur text-neutral-300 text-[11px] font-medium">
                    Drive Público
                  </span>
                )}
              </div>

              {/* Info text */}
              <div className="relative z-10 p-6 flex flex-col gap-1.5">
                <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
                  {photo.title}
                </h3>
                <p className="text-xs text-neutral-300 font-light">
                  Por {photo.author}
                </p>

                <div className="flex items-center justify-between pt-2 mt-1 text-xs text-neutral-400">
                  <span>{photo.matchesWon} victorias en duelos</span>
                  <span className="text-neutral-300 font-medium group-hover:text-white">
                    Ver y comentar ({photo.comments.length})
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
