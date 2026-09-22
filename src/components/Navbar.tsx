import React from 'react';
import { ActiveTab } from '../types';
import { usePhotos } from '../context/PhotoContext';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { totalVotesCount, photos, isAdmin, adminVoteMode, dynamics } = usePhotos();

  return (
    <header className="sticky top-0 z-30 w-full bg-neutral-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand Name */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('vote')}
            className="text-left group cursor-pointer"
          >
            <span className="block text-2xl font-bold tracking-tight text-white group-hover:text-neutral-200 transition-colors">
              Fotografia Unalmed
            </span>
          </button>
          <span className="hidden md:inline-block px-3 py-1 text-xs rounded-full bg-neutral-900 text-neutral-300 font-medium">
            {totalVotesCount} votos registrados
          </span>
        </div>

        {/* Minimalist Navigation Tabs (NO ICONS, NO BORDERS) */}
        <nav className="flex items-center gap-1.5 p-1 bg-neutral-900 rounded-full flex-wrap sm:flex-nowrap justify-center">
          <button
            onClick={() => setActiveTab('vote')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all cursor-pointer ${
              activeTab === 'vote'
                ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
            }`}
          >
            Votar
            {adminVoteMode !== 'both' && (
              <span className="ml-1 text-[11px] opacity-70">
                ({adminVoteMode === '1v1' ? '1v1' : 'Swipe'})
              </span>
            )}
          </button>

          {/* Dinamicas Tab */}
          <button
            onClick={() => setActiveTab('dynamics')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all cursor-pointer ${
              activeTab === 'dynamics'
                ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
            }`}
          >
            Dinámicas
            {dynamics.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-neutral-800 text-neutral-300">
                {dynamics.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
            }`}
          >
            Clasificación
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
            }`}
          >
            Galería
            {photos.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-neutral-800 text-neutral-300">
                {photos.length}
              </span>
            )}
          </button>

          {/* Public Upload Tab: any user can upload */}
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-amber-400 text-neutral-950 font-semibold shadow-sm'
                : 'text-neutral-300 bg-neutral-800/80 hover:bg-neutral-700/80 hover:text-white'
            }`}
          >
            Subir foto
          </button>

          {/* Admin Tab */}
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3.5 py-2 text-sm font-medium rounded-full transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-white text-neutral-950 font-bold shadow-sm'
                : isAdmin
                ? 'text-emerald-400 hover:text-emerald-300 hover:bg-neutral-800/70'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/70'
            }`}
          >
            {isAdmin ? 'Admin • Activo' : 'Admin'}
          </button>
        </nav>
      </div>
    </header>
  );
};
