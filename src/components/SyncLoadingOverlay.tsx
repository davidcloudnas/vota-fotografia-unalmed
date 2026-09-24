import React from 'react';
import { usePhotos } from '../context/PhotoContext';

export const SyncLoadingOverlay: React.FC = () => {
  const { isGlobalUpdating, globalUpdateMessage } = usePhotos();

  if (!isGlobalUpdating) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-neutral-950/85 backdrop-blur-md select-none animate-fadeIn cursor-wait pointer-events-auto"
      style={{ touchAction: 'none' }}
    >
      <div className="relative flex flex-col items-center max-w-sm w-full bg-neutral-900/90 border border-neutral-800 p-8 rounded-3xl shadow-2xl text-center space-y-5">
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
          Por favor espera un instante mientras se aseguran los datos.
        </p>
      </div>
    </div>
  );
};
