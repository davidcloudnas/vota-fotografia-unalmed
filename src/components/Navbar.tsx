import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab } from '../types';
import { usePhotos } from '../context/PhotoContext';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const {
    totalVotesCount,
    photos,
    isAdmin,
    adminVoteMode,
    dynamics,
    isSyncingGlobalVotes,
    refreshFromCloud,
    userNotice,
    setUserNotice,
  } = usePhotos();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on route/tab change
  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const getTabLabel = (tab: ActiveTab) => {
    switch (tab) {
      case 'vote':
        return adminVoteMode !== 'both'
          ? `Votar (${adminVoteMode === '1v1' ? '1v1' : 'Swipe'})`
          : 'Votar';
      case 'dynamics':
        return 'Dinámicas';
      case 'leaderboard':
        return 'Clasificación';
      case 'gallery':
        return 'Galería';
      case 'upload':
        return 'Subir foto';
      case 'admin':
        return isAdmin ? 'Admin • Activo' : 'Admin';
      default:
        return '';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Name & Quick Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSelectTab('vote')}
            className="text-left group cursor-pointer"
          >
            <span className="block text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-neutral-200 transition-colors">
              Fotografia Unalmed
            </span>
          </button>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="px-3 py-1 text-xs rounded-full bg-neutral-900 text-neutral-300 font-medium">
              {totalVotesCount} votos
            </span>
            <button
              type="button"
              onClick={() => refreshFromCloud()}
              disabled={isSyncingGlobalVotes}
              title="Refrescar catálogo y sincronizar con Google Drive"
              className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg
                className={`w-3.5 h-3.5 ${isSyncingGlobalVotes ? 'animate-spin text-amber-400' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          {/* Active section indicator for mobile */}
          <span className="sm:hidden text-xs px-2.5 py-1 rounded-full bg-neutral-900 text-neutral-400 font-medium truncate max-w-[120px]">
            {getTabLabel(activeTab)}
          </span>
        </div>

        {/* Desktop Navigation Tabs (Visible on sm screens and up) */}
        <nav className="hidden sm:flex items-center gap-1.5 p-1 bg-neutral-900 rounded-full flex-nowrap justify-center">
          <button
            onClick={() => handleSelectTab('vote')}
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
            onClick={() => handleSelectTab('dynamics')}
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
            onClick={() => handleSelectTab('leaderboard')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
            }`}
          >
            Clasificación
          </button>

          <button
            onClick={() => handleSelectTab('gallery')}
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

          {/* Public Upload Tab */}
          <button
            onClick={() => handleSelectTab('upload')}
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
            onClick={() => handleSelectTab('admin')}
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

        {/* Mobile Corner Actions (sm:hidden) */}
        <div className="sm:hidden flex items-center gap-2" ref={menuRef}>
          {/* Quick mobile refresh button */}
          <button
            type="button"
            onClick={() => refreshFromCloud()}
            disabled={isSyncingGlobalVotes}
            aria-label="Refrescar catálogo desde Drive"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${isSyncingGlobalVotes ? 'animate-spin text-amber-400' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* 3-Dots Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menú de navegación"
            aria-expanded={mobileMenuOpen}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              mobileMenuOpen
                ? 'bg-white text-neutral-950'
                : 'bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800'
            }`}
          >
            {/* 3 Dots Icon (vertical) */}
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="21" r="2" />
            </svg>
          </button>

          {/* Backdrop overlay for closing */}
          {mobileMenuOpen && (
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
            />
          )}

          {/* Floating Corner Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 z-50 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-neutral-800/80 mb-1 flex items-center justify-between text-xs text-neutral-400">
                <span>Navegación</span>
                <span className="font-semibold text-neutral-300">{totalVotesCount} votos</span>
              </div>

              <button
                onClick={() => handleSelectTab('vote')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                  activeTab === 'vote'
                    ? 'bg-white text-neutral-950 font-semibold'
                    : 'text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                <span>Votar</span>
                {adminVoteMode !== 'both' && (
                  <span className="text-xs opacity-75">
                    {adminVoteMode === '1v1' ? '1v1' : 'Swipe'}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleSelectTab('dynamics')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                  activeTab === 'dynamics'
                    ? 'bg-white text-neutral-950 font-semibold'
                    : 'text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                <span>Dinámicas</span>
                {dynamics.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                    {dynamics.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleSelectTab('leaderboard')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                  activeTab === 'leaderboard'
                    ? 'bg-white text-neutral-950 font-semibold'
                    : 'text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                <span>Clasificación</span>
              </button>

              <button
                onClick={() => handleSelectTab('gallery')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer flex items-center justify-between ${
                  activeTab === 'gallery'
                    ? 'bg-white text-neutral-950 font-semibold'
                    : 'text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                <span>Galería</span>
                {photos.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                    {photos.length}
                  </span>
                )}
              </button>

              <div className="my-1 border-t border-neutral-800/80" />

              <button
                onClick={() => handleSelectTab('upload')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center justify-between ${
                  activeTab === 'upload'
                    ? 'bg-amber-400 text-neutral-950'
                    : 'bg-amber-400/15 text-amber-300 hover:bg-amber-400/25'
                }`}
              >
                <span>+ Subir fotografía</span>
              </button>

              <button
                onClick={() => handleSelectTab('admin')}
                className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                  activeTab === 'admin'
                    ? 'bg-neutral-800 text-white font-bold'
                    : isAdmin
                    ? 'text-emerald-400 hover:bg-neutral-800/60'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60'
                }`}
              >
                <span>Panel de Administración</span>
                {isAdmin && <span className="text-[10px] text-emerald-400 font-bold">ACTIVO</span>}
              </button>

              <div className="my-1 border-t border-neutral-800/80" />

              <button
                type="button"
                onClick={() => {
                  refreshFromCloud();
                  setMobileMenuOpen(false);
                }}
                disabled={isSyncingGlobalVotes}
                className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition cursor-pointer flex items-center justify-between disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <svg className={`w-3.5 h-3.5 ${isSyncingGlobalVotes ? 'animate-spin text-amber-400' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refrescar fotos desde Drive</span>
                </span>
                {isSyncingGlobalVotes && <span className="text-[10px] text-amber-400">Actualizando...</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Sync / Notice Banner */}
      {userNotice && (
        <div className="w-full bg-amber-400 text-neutral-950 px-4 py-2 text-xs font-semibold shadow-md border-b border-amber-500/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm">🔔</span>
              <span className="truncate">{userNotice}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => refreshFromCloud()}
                className="px-2.5 py-1 rounded-md bg-neutral-950 text-white hover:bg-neutral-800 text-[11px] font-bold cursor-pointer transition flex items-center gap-1"
              >
                <span>↻ Refrescar</span>
              </button>
              <button
                type="button"
                onClick={() => setUserNotice(null)}
                className="p-1 hover:bg-amber-500 rounded-md text-neutral-950 cursor-pointer"
                aria-label="Cerrar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
