import React, { useState } from 'react';
import { usePhotos } from '../context/PhotoContext';

export const PhotoDetailModal: React.FC = () => {
  const {
    selectedPhoto,
    closePhotoModal,
    toggleFavorite,
    addComment,
    likeComment,
  } = usePhotos();

  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');

  if (!selectedPhoto) return null;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(selectedPhoto.id, authorName, commentText);
    setCommentText('');
  };

  return (
    <div
      onClick={closePhotoModal}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl rounded-3xl bg-neutral-950 overflow-hidden shadow-2xl my-auto flex flex-col lg:flex-row max-h-[92vh]"
      >
        {/* Left Side: Pure High-Res Visual */}
        <div className="relative lg:w-3/5 bg-neutral-900 flex items-center justify-center min-h-[300px] lg:min-h-[600px] overflow-hidden">
          <img
            src={selectedPhoto.imageUrl}
            alt={selectedPhoto.title}
            className="w-full h-full object-contain max-h-[600px] lg:max-h-[90vh]"
            referrerPolicy="no-referrer"
          />

          {/* Close button for mobile inside image */}
          <button
            onClick={closePhotoModal}
            className="absolute top-4 left-4 lg:hidden px-3.5 py-1.5 rounded-full bg-neutral-950/80 backdrop-blur-md text-xs font-semibold text-white cursor-pointer"
          >
            Cerrar
          </button>
        </div>

        {/* Right Side: Information, Favorite & Comments */}
        <div className="lg:w-2/5 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto max-h-[500px] lg:max-h-[90vh] bg-neutral-950">
          <div>
            {/* Header with Close button for desktop */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block">
                  {selectedPhoto.location}
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight leading-tight mt-0.5">
                  {selectedPhoto.title}
                </h2>
                <p className="text-sm text-neutral-400 font-light mt-0.5">
                  Fotografía por{' '}
                  <span className="text-neutral-200 font-medium">
                    {selectedPhoto.author}
                  </span>
                </p>

                {selectedPhoto.driveWebViewLink && (
                  <div className="mt-2">
                    <a
                      href={selectedPhoto.driveWebViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 hover:bg-neutral-850 text-amber-400 text-xs font-semibold transition"
                    >
                      Alojada en Google Drive (Pública) ↗
                    </a>
                  </div>
                )}
              </div>

              <button
                onClick={closePhotoModal}
                className="hidden lg:inline-block px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {/* Description */}
            {selectedPhoto.description && (
              <p className="text-sm text-neutral-300 leading-relaxed font-light mb-5 bg-neutral-900/60 p-4 rounded-2xl">
                {selectedPhoto.description}
              </p>
            )}

            {/* Statistics Row (NO BORDERS) */}
            <div className="grid grid-cols-3 gap-2.5 mb-6 text-center">
              <div className="p-3 rounded-2xl bg-neutral-900">
                <span className="block text-xs text-neutral-400 font-medium">
                  Puntuación
                </span>
                <span className="block text-base font-black text-white mt-0.5">
                  {selectedPhoto.points} Puntos
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-900">
                <span className="block text-xs text-neutral-400 font-medium">
                  Duelos
                </span>
                <span className="block text-base font-black text-white mt-0.5">
                  {selectedPhoto.matchesWon} / {selectedPhoto.matchesPlayed}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-900">
                <span className="block text-xs text-neutral-400 font-medium">
                  Votos Swipe
                </span>
                <span className="block text-base font-black text-white mt-0.5">
                  {selectedPhoto.swipeLikes}
                </span>
              </div>
            </div>

            {/* Favorite Action Button (NO ICONS, NO BORDERS) */}
            <div className="mb-6">
              <button
                onClick={() => toggleFavorite(selectedPhoto.id)}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-sm transition-all cursor-pointer text-center ${
                  selectedPhoto.isFavorite
                    ? 'bg-amber-400 text-neutral-950 shadow-md'
                    : 'bg-neutral-900 text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {selectedPhoto.isFavorite
                  ? 'Guardada en tus Favoritas (Clic para quitar)'
                  : 'Marcar como Favorita'}
              </button>
            </div>

            {/* Comments Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Comentarios de la Comunidad ({selectedPhoto.comments.length})
                </h3>
              </div>

              {/* Comment input form */}
              <form onSubmit={handleCommentSubmit} className="space-y-3 mb-6">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Tu nombre o carrera..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                />

                <textarea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Comparte tu opinión sobre la luz, encuadre o historia..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition resize-none"
                />

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-bold transition active:scale-98 cursor-pointer text-center"
                >
                  Publicar Comentario
                </button>
              </form>

              {/* Comments list */}
              <div className="space-y-3">
                {selectedPhoto.comments.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-4">
                    Aún no hay comentarios en esta fotografía. ¡Sé el primero en opinar!
                  </p>
                ) : (
                  selectedPhoto.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3.5 rounded-2xl bg-neutral-900/70 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-200">
                          {comment.author}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {comment.createdAt}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-300 font-light leading-relaxed">
                        {comment.text}
                      </p>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => likeComment(selectedPhoto.id, comment.id)}
                          className="text-[11px] font-medium text-neutral-400 hover:text-amber-400 transition cursor-pointer"
                        >
                          Me gusta ({comment.likes})
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
