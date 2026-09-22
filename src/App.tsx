/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PhotoProvider, usePhotos } from './context/PhotoContext';
import { ActiveTab } from './types';
import { Navbar } from './components/Navbar';
import { VoteView } from './components/VoteView';
import { LeaderboardView } from './components/LeaderboardView';
import { GalleryView } from './components/GalleryView';
import { UploadView } from './components/UploadView';
import { AdminView } from './components/AdminView';
import { DynamicsView } from './components/DynamicsView';
import { PhotoDetailModal } from './components/PhotoDetailModal';

function MainContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('vote');
  const { resetAllData, photos } = usePhotos();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-400 selection:text-neutral-950">
      {/* Minimalist Navigation (NO ICONS, NO BORDERS) */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'vote' && (
          <VoteView
            onGoToUpload={() => setActiveTab('upload')}
            onGoToAdmin={() => setActiveTab('admin')}
            onGoToDynamics={() => setActiveTab('dynamics')}
          />
        )}
        {activeTab === 'dynamics' && (
          <DynamicsView
            onGoToVoting={() => setActiveTab('vote')}
            onGoToAdmin={() => setActiveTab('admin')}
          />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardView onGoToUpload={() => setActiveTab('upload')} />
        )}
        {activeTab === 'gallery' && (
          <GalleryView onGoToUpload={() => setActiveTab('upload')} />
        )}
        {activeTab === 'upload' && (
          <UploadView onUploaded={(tab) => setActiveTab(tab)} />
        )}
        {activeTab === 'admin' && (
          <AdminView
            onGoToVoting={() => setActiveTab('vote')}
            onGoToUpload={() => setActiveTab('upload')}
            onGoToDynamics={() => setActiveTab('dynamics')}
          />
        )}
      </main>

      {/* Photo Detail & Commenting Modal */}
      <PhotoDetailModal />

      {/* Minimalist Footer */}
      <footer className="w-full py-8 mt-auto bg-neutral-950 text-neutral-500 text-xs text-center px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-end gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('dynamics')}
              className="text-neutral-400 hover:text-white transition cursor-pointer"
            >
              Dinámicas y Top 3
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className="text-neutral-400 hover:text-white transition cursor-pointer"
            >
              Acceso Administrador
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <PhotoProvider>
      <MainContent />
    </PhotoProvider>
  );
}
