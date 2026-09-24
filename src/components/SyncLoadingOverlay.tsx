import React, { useEffect, useState } from 'react';
import { usePhotos } from '../context/PhotoContext';

export const SyncLoadingOverlay: React.FC = () => {
  const { isGlobalUpdating, globalUpdateMessage } = usePhotos();
  const [showDismiss, setShowDismiss] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isGlobalUpdating) {
      setDismissed(false);
      setShowDismiss(false);
      // If updating takes longer than 2.2s, let the user click "Continuar"
      const t = setTimeout(() => setShowDismiss(true), 2200);
      return () => clearTimeout(t);
    } else {
      setShowDismiss(false);
      setDismissed(false);
    }
  }, [isGlobalUpdating]);

  if (!isGlobalUpdating || dismissed) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-neutral-950/85 backdrop-blur-md select-none animate-fadeIn pointer-events-auto"
      style={{ touchAction: 'none' }}
    >
      <div className="relative flex flex-col items-center max-w-sm w-full bg-neutral-900/95 border border-neutral-800 p-8 rounded-3xl shadow-2xl text-center space-y-5">
        {/* Animated Glow & Sync Spinner */}
        <div className="relative flex items-center justify-center w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl animate-pulse" />
          <div className="w-16 h-16 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin" />
          <span className="absolute text-xl">📸</span>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h3 className="text-white font-bold text-base tracking-wide">
            Sincronizando con la Nube
          </h3>
          <p className="text-neutral-400 text-xs leading-relaxed">
            {globalUpdateMessage || 'Actualizando fotos, votos y clasificaciones en Google Drive...'}
          </p>
        </div>

        {/* Pulsing Status Bar */}
        <div className="w-full bg-neutral-800/80 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full animate-indeterminate" />
        </div>

        <p className="text-[11px] text-neutral-400">
          Asegurando datos con Google Drive.
        </p>

        {showDismiss && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="mt-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
          >
            Continuar a la aplicación →
          </button>
        )}
      </div>
    </div>
  );
};
