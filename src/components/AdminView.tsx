import React, { useState, useEffect } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { AdminVoteModeSetting } from '../types';
import { APP_CONFIG } from '../config';
import { fetchVercelDiagnostics, VercelDiagnostics, testSyncUrlConnection } from '../services/sharedStore';

interface AdminViewProps {
  onGoToVoting: () => void;
  onGoToUpload: () => void;
  onGoToDynamics: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  onGoToVoting,
  onGoToUpload,
  onGoToDynamics,
}) => {
  const {
    isAdmin,
    loginAdmin,
    logoutAdmin,
    adminVoteMode,
    setAdminVoteMode,
    photos,
    deletePhoto,
    resetAllData,
    clearLocalCache,
    activeDynamic,
    isVotingOpen,
    timeRemainingSeconds,
    startNewDynamic,
    finishCurrentDynamic,
    dynamics,
    deleteDynamic,
    totalVotesCount,
    googleUser,
    driveFolder,
    isConnectingDrive,
    connectGoogleDrive,
    disconnectGoogleDrive,
    setManualDriveFolder,
    setManualToken,
    syncPhotosToDrive,
    loadPhotosFromDrive,
    refreshDriveFolderMetadata,
    importPhotosFromJson,
    isSyncConfigured,
    syncProviderName,
    isSyncingGlobalVotes,
    lastGlobalSyncTime,
    syncGlobalVotes,
    publishCurrentStateToGlobal,
    refreshFromCloud,
  } = usePhotos();

  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [driveAuthError, setDriveAuthError] = useState('');
  const [manualFolderInput, setManualFolderInput] = useState('');
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingDrivePhotos, setIsLoadingDrivePhotos] = useState(false);
  const [driveLoadStatus, setDriveLoadStatus] = useState('');
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');
  const [syncGlobalStatusMsg, setSyncGlobalStatusMsg] = useState('');
  const [syncUrlInput, setSyncUrlInput] = useState(APP_CONFIG.syncApiUrl);
  const [syncUrlSaved, setSyncUrlSaved] = useState(false);
  const [showGoogleScriptHelp, setShowGoogleScriptHelp] = useState(false);
  const [vercelDiag, setVercelDiag] = useState<VercelDiagnostics | null>(null);
  const [checkingVercel, setCheckingVercel] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [isPublishingLocal, setIsPublishingLocal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [testingSyncUrl, setTestingSyncUrl] = useState(false);
  const [testSyncResult, setTestSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [clearCacheMsg, setClearCacheMsg] = useState('');

  // Descarga del archivo JSON de auditoría completo (estado real de Drive y votos)
  const handleDownloadAuditJson = () => {
    const auditData = {
      appName: 'Fotografia Unalmed',
      exportedAt: new Date().toISOString(),
      syncProvider: syncProviderName,
      isSyncConfigured,
      driveFolderId: driveFolder?.folderId || APP_CONFIG.defaultDriveFolderId || null,
      totalVotesCount,
      activeDynamic,
      dynamicsHistory: dynamics,
      totalPhotos: photos.length,
      photos: photos.map((p) => ({
        id: p.id,
        title: p.title,
        author: p.author,
        location: p.location,
        description: p.description,
        points: p.points,
        matchesPlayed: p.matchesPlayed,
        matchesWon: p.matchesWon,
        swipeLikes: p.swipeLikes,
        swipePasses: p.swipePasses,
        imageUrl: p.imageUrl,
        driveFileId: p.driveFileId,
        driveWebViewLink: p.driveWebViewLink,
        createdAt: p.createdAt,
        commentsCount: (p.comments || []).length,
        comments: p.comments || [],
      })),
    };

    const jsonStr = JSON.stringify(auditData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unalmed_database_auditoria_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Form state for creating a new dynamic
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [durationMode, setDurationMode] = useState<'infinite' | 'custom'>('custom');
  const [customHours, setCustomHours] = useState('24');

  useEffect(() => {
    refreshDriveFolderMetadata();
  }, [refreshDriveFolderMetadata]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const success = loginAdmin(passwordInput);
    if (success) {
      setPasswordInput('');
      setSuccessNotice('Acceso de administrador concedido.');
      setTimeout(() => setSuccessNotice(''), 3000);
    } else {
      setErrorMessage('Contraseña incorrecta. Por favor intenta de nuevo.');
    }
  };

  const handleModeChange = (mode: AdminVoteModeSetting) => {
    setAdminVoteMode(mode);
    setSuccessNotice(
      `Modo de votación actualizado a: ${
        mode === '1v1'
          ? 'Solo 1v1'
          : mode === 'swipe'
          ? 'Solo Deslizar (Swipe)'
          : 'Ambos modos disponibles'
      }`
    );
    setTimeout(() => setSuccessNotice(''), 3500);
  };

  const handleStartDynamic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Por favor ingresa un título para la dinámica.');
      return;
    }

    const hours = durationMode === 'infinite' ? 0 : Math.max(0.1, parseFloat(customHours) || 24);
    startNewDynamic(newTitle.trim(), hours, newDescription.trim());
    setNewTitle('');
    setNewDescription('');
    setSuccessNotice(`¡Nueva dinámica iniciada con éxito! Duración: ${hours > 0 ? `${hours} horas` : 'Indefinida'}.`);
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  const handleCloseDynamicManually = () => {
    if (window.confirm('¿Deseas finalizar la dinámica activa ahora mismo? Se calculará el podio con el Top 3 y se archivarán los resultados en la pestaña de Dinámicas.')) {
      finishCurrentDynamic();
      setSuccessNotice('La dinámica se ha cerrado. Los resultados y el Top 3 ya están disponibles en "Dinámicas".');
      setTimeout(() => setSuccessNotice(''), 4000);
    }
  };

  const formatTimer = (totalSeconds: number | null): string => {
    if (totalSeconds === null) return 'Indefinido';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Administración de Fotografia Unalmed
        </h1>
      </div>

      {!isAdmin ? (
        /* Formulario de Login para Administrador */
        <div className="max-w-md mx-auto bg-neutral-900 rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Ingreso de Administrador
            </h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Ingresa tu clave de acceso"
                className="w-full px-4 py-3.5 rounded-2xl bg-neutral-950 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-sm transition-all active:scale-98 cursor-pointer shadow-lg text-center"
            >
              Ingresar
            </button>
          </form>
        </div>
      ) : (
        /* Panel de opciones desbloqueadas para el Administrador */
        <div className="space-y-8">
          {successNotice && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 text-emerald-200 text-sm font-medium">
              {successNotice}
            </div>
          )}

          {/* Estado de sesión admin */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-neutral-900">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-1">
                Sesión Activa
              </span>
              <p className="text-sm font-semibold text-white">
                Modo Administrador Desbloqueado
              </p>
              <p className="text-xs text-neutral-400">
                Tienes permisos exclusivos para gestionar dinámicas por tiempo, horas de votación y moderar contenido.
              </p>
            </div>

            <button
              onClick={logoutAdmin}
              className="px-5 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer self-start sm:self-auto"
            >
              Cerrar sesión de administrador
            </button>
          </div>

          {/* SECCIÓN GOOGLE DRIVE: ALMACENAMIENTO DE ADMINISTRADOR EN LA NUBE */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block mb-1">
                  Google Drive • Repositorio
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Carpeta Google Drive ({driveFolder?.folderName || 'Fotografia Unalmed'})
                </h2>
                <p className="text-xs text-neutral-400 font-light mt-0.5 max-w-2xl">
                  Las fotos de la comunidad se archivan en tu carpeta de Google Drive como administrador. Los estudiantes no necesitan conectar ninguna cuenta.
                </p>
              </div>

              {googleUser ? (
                <div className="flex flex-wrap items-center gap-3">
                  {driveFolder?.webViewLink && (
                    <a
                      href={driveFolder.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold transition inline-flex items-center gap-1.5"
                    >
                      Abrir carpeta en Drive ↗
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm('¿Deseas desconectar tu cuenta de Google Drive?')) {
                        disconnectGoogleDrive();
                      }
                    }}
                    className="px-4 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Desconectar cuenta
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:items-end gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setDriveAuthError('');
                      try {
                        await connectGoogleDrive();
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : String(err);
                        setDriveAuthError(msg);
                      }
                    }}
                    disabled={isConnectingDrive}
                    className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-xs transition cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>{isConnectingDrive ? 'Conectando con Google...' : 'Vincular mi Google Drive'}</span>
                  </button>
                </div>
              )}
            </div>

            {driveAuthError && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs space-y-1">
                <p className="font-semibold">Aviso de conexión con Google:</p>
                <p>{driveAuthError}</p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Nota: Si tu navegador bloquea la ventana emergente de Google, permite las ventanas emergentes en tu navegador o abre la aplicación en una pestaña nueva.
                </p>
              </div>
            )}

            <div className="p-5 rounded-2xl bg-neutral-950 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-neutral-400">Estado de Google Drive del Administrador:</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    googleUser
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {googleUser ? `Conectado (${googleUser.email})` : 'Sesión pendiente'}
                </span>
              </div>

              {driveFolder && (
                <div className="space-y-2 pt-2 border-t border-neutral-900">
                  <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                    <span className="text-neutral-400">Nombre de la carpeta:</span>
                    <span className="text-white font-semibold">{driveFolder.folderName}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                    <span className="text-neutral-400">ID de carpeta:</span>
                    <span className="text-neutral-300 font-mono text-[11px]">{driveFolder.folderId}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                    <span className="text-neutral-400">Visibilidad pública:</span>
                    <span className="text-emerald-400 font-semibold">Pública (Cualquiera con el enlace puede ver)</span>
                  </div>
                </div>
              )}

              {/* Sincronización de fotos de estudiantes a la carpeta de Drive */}
              <div className="pt-3 border-t border-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Sincronización de Fotografías
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Fotos registradas en la app:{' '}
                    <strong className="text-white">{photos.length}</strong> • Fotos con enlace a tu Drive:{' '}
                    <strong className="text-amber-400">
                      {photos.filter((p) => p.driveFileId).length}
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setSyncStatusMsg('');
                    setIsSyncing(true);
                    try {
                      const res = await syncPhotosToDrive();
                      setSyncStatusMsg(
                        `¡Sincronización terminada! ${res.success} fotos añadidas a tu carpeta pública en Drive.`
                      );
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : String(err);
                      setSyncStatusMsg(`Aviso: ${msg}`);
                    } finally {
                      setIsSyncing(false);
                    }
                  }}
                  disabled={isSyncing || !googleUser}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-bold text-xs transition cursor-pointer self-start sm:self-auto"
                >
                  {isSyncing ? 'Sincronizando a Drive...' : 'Sincronizar fotos a mi Drive'}
                </button>
              </div>

              {syncStatusMsg && (
                <div className="p-3 rounded-xl bg-neutral-900 text-amber-400 text-xs font-medium">
                  {syncStatusMsg}
                </div>
              )}

              {/* Vincular manualmente una carpeta existente */}
              <div className="pt-3 border-t border-neutral-900 space-y-2">
                <span className="text-xs font-semibold text-neutral-300 block">
                  O vincula manualmente una carpeta de Drive existente:
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={manualFolderInput}
                    onChange={(e) => setManualFolderInput(e.target.value)}
                    placeholder="Pega el enlace o ID de tu carpeta pública de Google Drive"
                    className="flex-1 px-4 py-2 rounded-xl bg-neutral-900 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualFolderInput.trim()) {
                        setManualDriveFolder(manualFolderInput);
                        setManualFolderInput('');
                        alert('Carpeta vinculada correctamente para la aplicación.');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition"
                  >
                    Guardar Carpeta
                  </button>
                </div>
              </div>

              {/* O ingresar directamente un token de acceso OAuth */}
              <div className="pt-3 border-t border-neutral-900 space-y-2">
                <span className="text-xs font-semibold text-neutral-300 block">
                  O ingresa un Token de Acceso de Google directamente:
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    placeholder="Pega un token de acceso OAuth de Google Drive"
                    className="flex-1 px-4 py-2 rounded-xl bg-neutral-900 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualTokenInput.trim()) {
                        setManualToken(manualTokenInput.trim());
                        setManualTokenInput('');
                        alert('Token de Google configurado para sincronizar.');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition"
                  >
                    Guardar Token
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN MULTI-USUARIO: SINCRONIZACIÓN EN LA NUBE EN TIEMPO REAL */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 space-y-6 border border-amber-400/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block">
                    Votación Compartida y Tiempo Real
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      isSyncConfigured
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {isSyncConfigured ? '🟢 Sincronización Global Activa' : '🟡 Modo Local'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Sincronización de Votos y Fotografías
                </h2>
                <p className="text-xs text-neutral-400 font-light mt-0.5 max-w-2xl">
                  Los votos, duelos, comentarios y nuevas fotografías se sincronizan automáticamente en tiempo real entre todos los usuarios y dispositivos.
                </p>
              </div>

              {/* Botones de acción del administrador */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadAuditJson}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  title="Descarga un archivo JSON con todos los votos, fotos, IDs, comentarios y dinámicas tal como deben estar en Google Drive"
                >
                  📥 Descargar JSON de Auditoría (Drive)
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setSyncGlobalStatusMsg('');
                    setIsPublishingLocal(true);
                    try {
                      const ok = await publishCurrentStateToGlobal();
                      setSyncGlobalStatusMsg(
                        ok
                          ? '✓ ¡Votos, fotos, dinámicas y cambios publicados exitosamente a todos los usuarios!'
                          : 'Aviso: No se pudo subir. Verifica la conexión o URL de sincronización.'
                      );
                    } finally {
                      setIsPublishingLocal(false);
                    }
                  }}
                  disabled={isPublishingLocal || isSyncingGlobalVotes}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-neutral-950 font-extrabold text-xs transition cursor-pointer shadow-lg"
                  title="Envía el estado actual del administrador a Google Drive para que todos los usuarios lo reciban al refrescar"
                >
                  {isPublishingLocal ? 'Publicando a la Nube...' : '↑ Forzar Sincronización Global'}
                </button>
              </div>
            </div>

            {driveLoadStatus && (
              <div className="p-3 rounded-xl bg-neutral-950 text-amber-400 text-xs font-medium">
                {driveLoadStatus}
              </div>
            )}

            {syncGlobalStatusMsg && (
              <div className="p-3 rounded-xl bg-neutral-950 text-amber-400 text-xs font-medium">
                {syncGlobalStatusMsg}
              </div>
            )}

            {/* Métricas de estado global */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-950 text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px]">Proveedor activo:</span>
                <span className="text-white font-semibold">{syncProviderName}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[11px]">Fotos en catálogo:</span>
                <span className="text-amber-400 font-bold">{photos.length} fotos</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[11px]">Total de votos:</span>
                <span className="text-amber-400 font-bold">{totalVotesCount}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[11px]">Última sincronización:</span>
                <span className="text-neutral-300">
                  {lastGlobalSyncTime ? new Date(lastGlobalSyncTime).toLocaleTimeString() : 'Automática'}
                </span>
              </div>
            </div>

            {/* Configuración de URL de Sincronización y Diagnóstico Vercel */}
            <div className="p-4 rounded-2xl bg-neutral-950 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-white font-bold">
                  Conexión en Tiempo Real (Google Apps Script / Vercel):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setCheckingVercel(true);
                      const diag = await fetchVercelDiagnostics();
                      setVercelDiag(diag);
                      setCheckingVercel(false);
                    }}
                    disabled={checkingVercel}
                    className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-medium transition cursor-pointer"
                  >
                    {checkingVercel ? 'Consultando...' : '🔍 Verificar Variables en Vercel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGoogleScriptHelp(!showGoogleScriptHelp)}
                    className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-[11px] font-medium transition cursor-pointer"
                  >
                    {showGoogleScriptHelp ? 'Ocultar código' : '📄 Ver Código Google Script'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="url"
                  value={syncUrlInput}
                  onChange={(e) => {
                    setSyncUrlInput(e.target.value);
                    setSyncUrlSaved(false);
                    setTestSyncResult(null);
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    APP_CONFIG.setCustomSyncUrl(syncUrlInput);
                    setSyncUrlSaved(true);
                    setTimeout(() => setSyncUrlSaved(false), 4000);
                  }}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition cursor-pointer shrink-0"
                >
                  {syncUrlSaved ? '✓ URL Guardada' : 'Guardar URL'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setTestingSyncUrl(true);
                    setTestSyncResult(null);
                    const targetUrl = syncUrlInput.trim() || APP_CONFIG.syncApiUrl;
                    const res = await testSyncUrlConnection(targetUrl);
                    setTestSyncResult(res);
                    setTestingSyncUrl(false);
                    if (res.success) {
                      await syncGlobalVotes();
                    }
                  }}
                  disabled={testingSyncUrl}
                  className="px-4 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 font-bold text-xs transition cursor-pointer shrink-0"
                >
                  {testingSyncUrl ? 'Probando...' : '🧪 Probar Conexión'}
                </button>
              </div>

              {/* Resultado de la prueba de conexión */}
              {testSyncResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    testSyncResult.success
                      ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/70 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  {testSyncResult.message}
                </div>
              )}

              {/* Resultado del diagnóstico de Vercel */}
              {vercelDiag && (
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-1.5 text-[11px]">
                  <span className="font-bold text-neutral-200 block">
                    Estado detectado en servidor Vercel:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-neutral-400">
                    <div>
                      • URL de Script en Vercel:{' '}
                      <span className={vercelDiag.vercelEnvDetected.hasSyncApiUrl || vercelDiag.vercelEnvDetected.hasGoogleScriptUrl ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {vercelDiag.vercelEnvDetected.hasSyncApiUrl || vercelDiag.vercelEnvDetected.hasGoogleScriptUrl
                          ? '✓ Configurada en Vercel'
                          : 'No detectada en backend'}
                      </span>
                    </div>
                    <div>
                      • Carpeta Drive en Vercel:{' '}
                      <span className={vercelDiag.vercelEnvDetected.hasDriveFolderId ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                        {vercelDiag.vercelEnvDetected.hasDriveFolderId ? '✓ Configurada' : 'No configurada'}
                      </span>
                    </div>
                    <div>
                      • Proveedor activo:{' '}
                      <span className="text-white font-semibold">
                        {vercelDiag.vercelEnvDetected.activeProvider}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Instrucciones y código de Google Apps Script */}
              {showGoogleScriptHelp && (
                <div className="p-4 rounded-xl bg-neutral-900 border border-amber-400/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">
                      Código probado para Google Apps Script (Almacena en tu Drive el archivo unalmed_database.json):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const code = `// Google Apps Script para Fotografia Unalmed
// Guarda la base de datos completa directamente en tu Google Drive
var DB_FILENAME = "unalmed_database.json";

function doGet(e) {
  var state = getSavedState();
  return ContentService.createTextOutput(JSON.stringify(state))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var parsed = JSON.parse(contents);
    saveState(parsed);
    return ContentService.createTextOutput(JSON.stringify({ success: true, timestamp: Date.now() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSavedState() {
  var files = DriveApp.getFilesByName(DB_FILENAME);
  if (files.hasNext()) {
    var file = files.next();
    var content = file.getBlob().getDataAsString();
    try {
      return JSON.parse(content);
    } catch (err) {
      return { photos: [], totalVotesCount: 0 };
    }
  }
  return { photos: [], totalVotesCount: 0 };
}

function saveState(data) {
  var files = DriveApp.getFilesByName(DB_FILENAME);
  var jsonStr = JSON.stringify(data);
  if (files.hasNext()) {
    var file = files.next();
    file.setContent(jsonStr);
  } else {
    // Se crea en la raíz de tu Drive la primera vez que se sincroniza
    DriveApp.createFile(DB_FILENAME, jsonStr, MimeType.PLAIN_TEXT);
  }
}`;
                        navigator.clipboard.writeText(code);
                        setScriptCopied(true);
                        setTimeout(() => setScriptCopied(false), 3000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-400 text-neutral-950 font-bold text-[11px] transition cursor-pointer"
                    >
                      {scriptCopied ? '✓ Copiado' : 'Copiar Código'}
                    </button>
                  </div>

                  <ol className="list-decimal pl-4 space-y-1 text-neutral-300 text-[11px]">
                    <li>Ve a <strong>script.google.com</strong> e inicia sesión con tu cuenta Google (la misma de tu Drive).</li>
                    <li>Crea un nuevo proyecto, pega el código y guárdalo (Ctrl+S).</li>
                    <li>Haz clic en <strong>Implementar &gt; Nueva implementación</strong>.</li>
                    <li>Tipo: <strong>Aplicación web</strong>.</li>
                    <li><em>Ejecutar como:</em> <strong>Yo (tu cuenta)</strong>.</li>
                    <li><em>Quién tiene acceso:</em> <strong>Cualquier usuario (incluso anónimos)</strong>.</li>
                    <li>Copia la <strong>URL de la aplicación web</strong> (terminada en <code>/exec</code>), pégala arriba y haz clic en <strong>Guardar URL</strong> y luego en <strong>🧪 Probar Conexión</strong>.</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Herramientas discretas de respaldo JSON */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-neutral-800/80">
              <span className="text-neutral-400">Respaldo manual:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(photos, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'fotografia-unalmed-respaldo.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium transition cursor-pointer"
                >
                  Descargar JSON ({photos.length} fotos)
                </button>
                <button
                  type="button"
                  onClick={() => setShowJsonImport(!showJsonImport)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium transition cursor-pointer"
                >
                  {showJsonImport ? 'Cerrar importador' : 'Importar JSON'}
                </button>
              </div>
            </div>

            {showJsonImport && (
              <div className="p-4 rounded-2xl bg-neutral-950 space-y-3">
                <p className="text-xs text-neutral-400">
                  Pega aquí el contenido JSON para cargar fotos manualmente:
                </p>
                <textarea
                  rows={4}
                  value={jsonImportText}
                  onChange={(e) => setJsonImportText(e.target.value)}
                  placeholder="[{ id: ..., title: ..., imageUrl: ... }]"
                  className="w-full p-3 rounded-xl bg-neutral-900 text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const success = importPhotosFromJson(jsonImportText);
                    if (success) {
                      alert('¡Catálogo importado exitosamente!');
                      setJsonImportText('');
                      setShowJsonImport(false);
                    } else {
                      alert('El formato JSON no es válido. Debe ser un arreglo de fotografías.');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs transition cursor-pointer"
                >
                  Confirmar Importación
                </button>
              </div>
            )}
          </div>

          {/* SECCIÓN CREAR DINÁMICA */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Crear Dinámica
              </h2>

              {activeDynamic && !activeDynamic.isClosed && (
                <button
                  type="button"
                  onClick={handleCloseDynamicManually}
                  className="px-4 py-2 rounded-full bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
                >
                  Finalizar dinámica activa
                </button>
              )}
            </div>

            {activeDynamic && !activeDynamic.isClosed && (
              <div className="p-4 rounded-2xl bg-neutral-950 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                    Activa
                  </span>
                  <span className="font-bold text-white">{activeDynamic.title}</span>
                </div>
                <span className="text-amber-400 font-medium">
                  {activeDynamic.durationHours > 0
                    ? `Tiempo restante: ${formatTimer(timeRemainingSeconds)}`
                    : 'Duración: Indefinida'}
                </span>
              </div>
            )}

            <form onSubmit={handleStartDynamic} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Título de la dinámica"
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-950 text-white text-xs placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setDurationMode('custom')}
                  className={`p-3.5 rounded-2xl cursor-pointer transition ${
                    durationMode === 'custom'
                      ? 'bg-white text-neutral-950 font-bold'
                      : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-850'
                  }`}
                >
                  <span className="block text-xs">Tiempo Límite en Horas</span>
                </div>

                <div
                  onClick={() => setDurationMode('infinite')}
                  className={`p-3.5 rounded-2xl cursor-pointer transition ${
                    durationMode === 'infinite'
                      ? 'bg-white text-neutral-950 font-bold'
                      : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-850'
                  }`}
                >
                  <span className="block text-xs">Tiempo Indefinido</span>
                </div>
              </div>

              {durationMode === 'custom' && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      required
                      value={customHours}
                      onChange={(e) => setCustomHours(e.target.value)}
                      placeholder="Número de horas"
                      className="w-full px-4 py-3 rounded-2xl bg-neutral-950 text-white text-xs placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <span className="text-xs text-neutral-400 font-medium">horas</span>

                  <button
                    type="button"
                    onClick={() => setCustomHours('1')}
                    className="px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-[11px] text-neutral-300 cursor-pointer"
                  >
                    1h
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomHours('24')}
                    className="px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-[11px] text-neutral-300 cursor-pointer"
                  >
                    24h
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomHours('72')}
                    className="px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-[11px] text-neutral-300 cursor-pointer"
                  >
                    72h
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm transition cursor-pointer shadow-md text-center"
              >
                Crear Dinámica
              </button>
            </form>
          </div>

          {/* SECCIÓN 2: CONFIGURACIÓN DE MODO DE VOTACIÓN (1v1, Swipe o Ambos) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Modalidad de Votación Permitida
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => handleModeChange('1v1')}
                className={`p-6 rounded-2xl cursor-pointer transition-all ${
                  adminVoteMode === '1v1'
                    ? 'bg-white text-neutral-950 shadow-xl'
                    : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-850'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wider font-bold">
                    Opción A
                  </span>
                  {adminVoteMode === '1v1' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-neutral-950 text-white text-[11px] font-bold">
                      Activo
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-1">Solo Duelos 1v1</h3>
                <p className={`text-xs leading-relaxed ${adminVoteMode === '1v1' ? 'text-neutral-700' : 'text-neutral-400'}`}>
                  Duelos directos entre dos fotos al azar. El modo swipe queda oculto.
                </p>
              </div>

              <div
                onClick={() => handleModeChange('swipe')}
                className={`p-6 rounded-2xl cursor-pointer transition-all ${
                  adminVoteMode === 'swipe'
                    ? 'bg-white text-neutral-950 shadow-xl'
                    : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-850'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wider font-bold">
                    Opción B
                  </span>
                  {adminVoteMode === 'swipe' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-neutral-950 text-white text-[11px] font-bold">
                      Activo
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-1">Solo Deslizar (Swipe)</h3>
                <p className={`text-xs leading-relaxed ${adminVoteMode === 'swipe' ? 'text-neutral-700' : 'text-neutral-400'}`}>
                  Calificación una a una deslizando a los lados. El modo 1v1 queda oculto.
                </p>
              </div>

              <div
                onClick={() => handleModeChange('both')}
                className={`p-6 rounded-2xl cursor-pointer transition-all ${
                  adminVoteMode === 'both'
                    ? 'bg-white text-neutral-950 shadow-xl'
                    : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-850'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wider font-bold">
                    Opción C
                  </span>
                  {adminVoteMode === 'both' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-neutral-950 text-white text-[11px] font-bold">
                      Activo
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-1">Ambos Métodos</h3>
                <p className={`text-xs leading-relaxed ${adminVoteMode === 'both' ? 'text-neutral-700' : 'text-neutral-400'}`}>
                  Los votantes eligen libremente cómo votar entre 1v1 y Swipe.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={onGoToVoting}
                className="px-6 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Ir a probar pantalla de votación
              </button>
            </div>
          </div>

          {/* SECCIÓN 3: GESTIÓN DE FOTOGRAFÍAS */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                  Moderación de Contenido
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Fotografías en la Plataforma ({photos.length})
                </h2>
                <p className="text-xs text-neutral-400 font-light mt-0.5">
                  Cualquier usuario puede subir fotos. Como administrador puedes eliminar aquellas inapropiadas.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={clearingCache}
                  onClick={async () => {
                    setClearingCache(true);
                    setClearCacheMsg('Actualizando todo desde Drive...');
                    try {
                      await refreshFromCloud();
                      setClearCacheMsg('✓ Todo actualizado (fotos, puntajes, dinámicas y tiempos) desde Google Drive.');
                    } catch {
                      setClearCacheMsg('Error al sincronizar con Drive.');
                    } finally {
                      setClearingCache(false);
                      setTimeout(() => setClearCacheMsg(''), 4500);
                    }
                  }}
                  className="px-4 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition cursor-pointer flex items-center gap-1.5"
                  title="Descarga y actualiza de inmediato todas las fotos, puntajes, dinámicas, horas y estado desde Google Drive"
                >
                  {clearingCache ? 'Actualizando todo...' : '🔄 Actualizar todo desde Drive (Nube)'}
                </button>
                <button
                  onClick={onGoToUpload}
                  className="px-4 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition cursor-pointer"
                >
                  Subir nueva foto
                </button>
                {photos.length > 0 && (
                  confirmDeleteAll ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          resetAllData();
                          setConfirmDeleteAll(false);
                        }}
                        className="px-3.5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition cursor-pointer"
                      >
                        Sí, Vaciar Todo
                      </button>
                      <button
                        onClick={() => setConfirmDeleteAll(false)}
                        className="px-3 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteAll(true)}
                      className="px-4 py-2.5 rounded-full bg-rose-950/70 hover:bg-rose-900 text-xs font-semibold text-rose-300 transition cursor-pointer"
                    >
                      Borrar todas
                    </button>
                  )
                )}
              </div>
            </div>

            {clearCacheMsg && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium animate-fadeIn">
                {clearCacheMsg}
              </div>
            )}

            {/* Automatic refresh tip */}
            <div className="p-3.5 bg-neutral-900/70 border border-neutral-800/80 rounded-xl text-xs text-neutral-400 flex items-center gap-2.5">
              <span className="text-amber-400 text-sm">💡</span>
              <p className="leading-relaxed">
                <strong className="text-neutral-200">Sincronización automática:</strong> Cada vez que un usuario o tú refrescan la página (o deslizan hacia abajo en el celular), la app limpia fotos viejas y descarga la versión oficial guardada en tu Google Drive. También puedes pulsar el botón <strong>↻</strong> en la barra superior en cualquier momento.
              </p>
            </div>

            {photos.length === 0 ? (
              <div className="p-8 text-center bg-neutral-950 rounded-2xl">
                <p className="text-neutral-400 text-sm">
                  No hay fotografías en la plataforma en este momento.
                </p>
                <p className="text-neutral-500 text-xs mt-1">
                  Los usuarios pueden usar la pestaña "Subir foto" para añadir sus capturas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-900 shrink-0">
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{p.title}</h4>
                        <p className="text-xs text-neutral-400">
                          Por {p.author} • {p.location} • {p.points} Puntos
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-500">
                        {p.matchesWon}/{p.matchesPlayed} duelos
                      </span>
                      {confirmDeleteId === p.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              deletePhoto(p.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer"
                          >
                            Sí, Eliminar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(p.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-semibold transition cursor-pointer"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
