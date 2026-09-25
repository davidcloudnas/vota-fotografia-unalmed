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
    deviceId,
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
    purgeEverythingToZero,
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
  const [isPurgingAll, setIsPurgingAll] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmInput, setPurgeConfirmInput] = useState('');

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
                  onClick={async () => {
                    setSyncGlobalStatusMsg('');
                    setIsPublishingLocal(true);
                    try {
                      await refreshFromCloud();
                      setSyncGlobalStatusMsg('✓ ¡Fotos, votos y clasificaciones cargadas y recuperadas desde Google Drive!');
                    } catch {
                      setSyncGlobalStatusMsg('Aviso: No se pudo conectar a Google Drive. Revisa tu URL de sincronización.');
                    } finally {
                      setIsPublishingLocal(false);
                    }
                  }}
                  disabled={isPublishingLocal || isSyncingGlobalVotes}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-neutral-700"
                  title="Descarga todas las fotos, votos y datos guardados en Google Drive hacia la aplicación"
                >
                  🔄 Cargar / Recuperar Fotos de Drive
                </button>

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
                {(syncUrlInput.trim() || APP_CONFIG.syncApiUrl) && (
                  <a
                    href={(syncUrlInput.trim() || APP_CONFIG.syncApiUrl).includes('?') ? `${(syncUrlInput.trim() || APP_CONFIG.syncApiUrl)}&ping=1` : `${(syncUrlInput.trim() || APP_CONFIG.syncApiUrl)}?ping=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-medium text-xs transition flex items-center justify-center gap-1 shrink-0"
                    title="Abre la URL en una nueva pestaña para verificar directamente que Google responda con JSON y sin pedir clave"
                  >
                    🌐 Abrir en Navegador
                  </a>
                )}
              </div>

              {/* Identificador de Dispositivo actual */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 bg-neutral-900/60 p-2 rounded-xl border border-neutral-800/60">
                <span className="text-neutral-300 font-semibold">ID de este dispositivo:</span>
                <code className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-amber-400 font-mono text-[10px]">
                  {deviceId}
                </code>
                <span className="text-neutral-500 text-[10px]">
                  (Cada teléfono o computador tiene su propio ID único para registrar emparejamientos y evitar votos duplicados)
                </span>
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
                      • VITE_SYNC_API_URL:{' '}
                      <span className={vercelDiag.vercelEnvDetected.hasSyncApiUrl ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {vercelDiag.vercelEnvDetected.hasSyncApiUrl
                          ? '✓ Configurada en Vercel'
                          : 'No detectada en backend (usando URL personalizada)'}
                      </span>
                    </div>
                    <div>
                      • VITE_DRIVE_FOLDER_ID:{' '}
                      <span className={vercelDiag.vercelEnvDetected.hasDriveFolderId ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                        {vercelDiag.vercelEnvDetected.hasDriveFolderId ? '✓ Configurada' : 'No configurada'}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      • Proveedor activo:{' '}
                      <span className="text-white font-semibold">
                        {vercelDiag.vercelEnvDetected.activeProvider}
                      </span>
                    </div>
                    {vercelDiag.scriptAccessible && (
                      <div className="sm:col-span-2 text-emerald-400">
                        • Conexión Google Apps Script en backend:{' '}
                        <span className="font-bold">
                          ✓ En línea (HTTP {vercelDiag.scriptStatus}) — {vercelDiag.totalPhotos ?? 0} fotos, {vercelDiag.totalVotes ?? 0} votos globales
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Instrucciones y código de Google Apps Script */}
              {showGoogleScriptHelp && (
                <div className="p-4 rounded-xl bg-neutral-900 border border-amber-400/30 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-400 text-sm block">
                        Código Google Apps Script (Versión 5.2 — Puntuaciones Exactas & Duelos Consistentes):
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Puntuaciones ELO reales sin límite inferior, conteo exacto de duelos (1 voto = 1 duelo) y anti-duplicación.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const code = `// =========================================================================================
// GOOGLE APPS SCRIPT PARA FOTOGRAFÍA UNALMED (VERSIÓN 5.2 - PUNTUACIONES EXACTAS Y SIN DUPLICAR DUELOS)
// =========================================================================================
// CARACTERÍSTICAS DE LA VERSIÓN 5.2:
// 1. Puntuaciones Reales sin Límite Inferior: Los puntajes ELO se guardan con total precisión en Google Drive.
// 2. Conteo de Duelos Consistente (1 voto = 1 duelo): Elimina el conteo doble en los enfrentamientos.
// 3. Detección Inteligente de Nombres: Si un archivo tiene formato <titulo>_<unal-user-XXXXX>,
//    el script lo vincula a la foto canónica en vez de duplicarla.
// 4. Muro Temporal Inmutable (lastPurgeTimestamp) y Reutilización de Archivos en Drive.

var FOLDER_ID = "ID_DE_TU_CARPETA_DE_DRIVE_AQUI"; // Pega aquí el ID de tu carpeta de Google Drive
var DB_FILENAME = "unalmed_database.json";

// In-Memory RAM Cache Key (máximo 45 segundos para que los cambios se reflejen de inmediato)
var CACHE_KEY = "UNALMED_GLOBAL_STATE_V5_2";

function doGet(e) {
  var isPing = e && e.parameter && (e.parameter.ping === "1" || e.parameter.test === "1");
  var isForceRefresh = e && e.parameter && (e.parameter.refresh === "1" || e.parameter.nocache === "1");
  
  var cache = CacheService.getScriptCache();
  var cached = isForceRefresh ? null : cache.get(CACHE_KEY);
  var state = null;
  
  if (cached) {
    try {
      state = JSON.parse(cached);
    } catch(err) {}
  }
  
  // Si no estaba en RAM o se forzó refresco, lee de Google Drive
  if (!state) {
    state = getSavedStateFromDrive();
    try {
      cache.put(CACHE_KEY, JSON.stringify(state), 45); // 45 segundos en caché RAM
    } catch(err) {}
  }

  if (isPing) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      version: "5.0-anti-ghost",
      message: "Google Apps Script activo con muro temporal y protección anti-duplicación",
      folderConfigured: Boolean(FOLDER_ID && FOLDER_ID !== "ID_DE_TU_CARPETA_DE_DRIVE_AQUI"),
      totalPhotos: (state.photos || []).length,
      totalVotes: state.totalVotesCount || 0,
      deletedPhotosCount: (state.deletedPhotoIds || []).length,
      deletedDynamicsCount: (state.deletedDynamicIds || []).length,
      lastPurgeTimestamp: state.lastPurgeTimestamp || null,
      devicesCount: Object.keys(state.devices || {}).length,
      cachedRAM: Boolean(cached),
      timestamp: Date.now()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify(state))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(5000); // Espera de 5s para concurrencia segura
  
  try {
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var parsed = JSON.parse(contents);
    var result = saveState(parsed);
    
    // Invalida e inserta en caché inmediatamente
    try {
      CacheService.getScriptCache().put(CACHE_KEY, JSON.stringify(result), 45);
    } catch(err) {}

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      timestamp: Date.now(),
      totalPhotos: result.photos.length,
      deletedCount: (result.deletedPhotoIds || []).length,
      deletedDynamicsCount: (result.deletedDynamicIds || []).length,
      lastPurgeTimestamp: result.lastPurgeTimestamp || null,
      devicesCount: Object.keys(result.devices || {}).length
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}

function getTargetFolder() {
  if (FOLDER_ID && FOLDER_ID !== "ID_DE_TU_CARPETA_DE_DRIVE_AQUI") {
    try {
      return DriveApp.getFolderById(FOLDER_ID.trim());
    } catch(err) {
      console.warn("No se pudo abrir carpeta por FOLDER_ID:", err);
    }
  }
  return DriveApp.getRootFolder();
}

function getDatabaseFile() {
  var folder = getTargetFolder();
  
  // 1. Buscar en la carpeta configurada
  try {
    var files = folder.getFilesByName(DB_FILENAME);
    if (files.hasNext()) {
      return files.next();
    }
  } catch(e) {}

  // 2. Buscar en el root si no estaba en la carpeta
  try {
    var rootFiles = DriveApp.getRootFolder().getFilesByName(DB_FILENAME);
    if (rootFiles.hasNext()) {
      return rootFiles.next();
    }
  } catch(e) {}

  return null;
}

// Extrae marca de tiempo numérica de un elemento (foto, dinámica o voto)
function extractItemTimestamp(item) {
  if (!item) return 0;
  if (typeof item.createdAt === "number") return item.createdAt;
  if (typeof item.startedAt === "number") return item.startedAt;
  if (typeof item.timestamp === "number") return item.timestamp;
  if (typeof item.createdAt === "string" && item.createdAt !== "Hoy") {
    var parsed = Date.parse(item.createdAt);
    if (!isNaN(parsed)) return parsed;
  }
  if (item.id && typeof item.id === "string") {
    var match = item.id.match(/(\\d{10,13})/);
    if (match) {
      var val = parseInt(match[1], 10);
      if (val > 1500000000000) return val;
      if (val > 1500000000) return val * 1000;
    }
  }
  return 0;
}

// Escanea archivos de imagen (.jpg, .png, .webp) directamente de la carpeta de Drive
function scanDriveFolderImages(folder, existingMap, deletedMap, lastPurgeTimestamp) {
  var newPhotos = [];
  try {
    var allowedTypes = [
      MimeType.JPEG,
      MimeType.PNG,
      MimeType.GIF,
      "image/webp",
      "image/jpeg",
      "image/png"
    ];
    for (var t = 0; t < allowedTypes.length; t++) {
      var files = folder.getFilesByType(allowedTypes[t]);
      while (files.hasNext()) {
        var file = files.next();
        var fid = file.getId();
        var pId = "drive-" + fid;
        
        // Si el archivo fue creado antes de la última purga total, ignorar completamente
        try {
          var fileCreated = file.getDateCreated ? file.getDateCreated().getTime() : 0;
          if (lastPurgeTimestamp && fileCreated > 0 && fileCreated < lastPurgeTimestamp) {
            continue;
          }
        } catch(eDate) {}

        // Si ya fue eliminada por admin o ya está registrada, omitir
        if (deletedMap[fid] || deletedMap[pId] || existingMap[pId] || existingMap[fid]) {
          continue;
        }

        // Anti-duplicación de fotos de la aplicación:
        // Los nombres de archivos creados por la app contienen su ID: <titulo>_<unal-user-XXXXX>.<ext>
        var nameMatch = file.getName().match(/(unal-user-\d+)/);
        var embeddedId = nameMatch ? nameMatch[1] : null;

        if (embeddedId) {
          // Si está en lista negra, no resucitar
          if (deletedMap[embeddedId] || deletedMap[fid]) {
            continue;
          }
          // Si la foto ya está registrada en el catálogo, solo enlazar driveFileId y no duplicar
          if (existingMap[embeddedId]) {
            existingMap[embeddedId].driveFileId = fid;
            existingMap[embeddedId].imageUrl = "https://lh3.googleusercontent.com/d/" + fid;
            existingMap[embeddedId].syncedToDrive = true;
            existingMap[fid] = existingMap[embeddedId];
            continue; // ¡NO CREAR FOTO DUPLICADA!
          }
          // Si no existía en existingMap, usar el ID embebido y limpiar el título del sufijo de ID
          var cleanTitle = file.getName().replace(/_unal-user-\d+.*$/, "").replace(/\.[^/.]+$/, "").replace(/_/g, " ").trim();
          var photoObj = {
            id: embeddedId,
            title: cleanTitle || "Fotografía Campus Unalmed",
            author: "Comunidad Unalmed",
            location: "Medellín",
            description: "Fotografía de la comunidad.",
            imageUrl: "https://lh3.googleusercontent.com/d/" + fid,
            driveFileId: fid,
            driveWebViewLink: file.getUrl(),
            points: 1200,
            matchesPlayed: 0,
            matchesWon: 0,
            swipeLikes: 0,
            swipePasses: 0,
            comments: [],
            isFavorite: false,
            syncedToDrive: true,
            createdAt: new Date().toISOString()
          };
          newPhotos.push(photoObj);
          existingMap[embeddedId] = photoObj;
          existingMap[fid] = photoObj;
          continue;
        }

        var cleanName = file.getName().replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        var photoObj = {
          id: pId,
          title: cleanName || "Fotografía Campus Unalmed",
          author: "Comunidad Unalmed",
          location: "Medellín",
          description: "Fotografía sincronizada desde la carpeta de Google Drive.",
          imageUrl: "https://lh3.googleusercontent.com/d/" + fid + "=s1600",
          driveFileId: fid,
          driveWebViewLink: file.getUrl(),
          points: 1200,
          matchesPlayed: 0,
          matchesWon: 0,
          swipeLikes: 0,
          swipePasses: 0,
          comments: [],
          isFavorite: false,
          syncedToDrive: true,
          createdAt: new Date().toISOString()
        };
        newPhotos.push(photoObj);
        existingMap[pId] = photoObj;
      }
    }
  } catch(err) {
    console.warn("Aviso escaneando imágenes de la carpeta:", err);
  }
  return newPhotos;
}

// Deduplica fotos para evitar que existan simultáneamente la foto original ('si') y el escaneo de Drive ('si unal-user-XXXX')
function deduplicatePhotoList(photosList) {
  var userMap = {};
  var driveIdMap = {};
  for (var i = 0; i < photosList.length; i++) {
    var p = photosList[i];
    if (p && p.id && !p.id.startsWith("drive-")) {
      userMap[p.id] = p;
      if (p.driveFileId) driveIdMap[p.driveFileId] = p;
      var m = p.imageUrl ? p.imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) : null;
      if (m && m[1]) driveIdMap[m[1]] = p;
    }
  }
  var result = [];
  var seenDriveFids = {};
  for (var j = 0; j < photosList.length; j++) {
    var item = photosList[j];
    if (!item || !item.id) continue;
    var dfid = item.driveFileId || (item.id.startsWith("drive-") ? item.id.replace("drive-", "") : "");
    if (!dfid && item.imageUrl) {
      var imgMatch = item.imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (imgMatch && imgMatch[1]) dfid = imgMatch[1];
    }

    if (item.id.startsWith("drive-")) {
      var match = item.title ? item.title.match(/(unal-user-\d+)/) : null;
      var canonical = (match && userMap[match[1]]) || (dfid && driveIdMap[dfid]);
      if (canonical && canonical.id !== item.id) {
        var canAct = (canonical.matchesPlayed || 0) + (canonical.swipeLikes || 0) + (canonical.swipePasses || 0);
        var itemAct = (item.matchesPlayed || 0) + (item.swipeLikes || 0) + (item.swipePasses || 0);
        if (itemAct > canAct) {
          canonical.points = item.points !== undefined ? item.points : canonical.points;
          canonical.matchesPlayed = item.matchesPlayed || 0;
          canonical.matchesWon = item.matchesWon || 0;
          canonical.swipeLikes = item.swipeLikes || 0;
          canonical.swipePasses = item.swipePasses || 0;
        }
        if (dfid && !canonical.driveFileId) canonical.driveFileId = dfid;
        if (item.driveWebViewLink && !canonical.driveWebViewLink) canonical.driveWebViewLink = item.driveWebViewLink;
        continue; // OMITIR DUPLICADO
      }

      if (dfid && seenDriveFids[dfid]) {
        continue; // OMITIR SEGUNDO ARCHIVO DE DRIVE DUPLICADO
      }

      // Si el título contiene unal-user-XXXX, limpiarlo para que se vea limpio en la interfaz
      if (item.title) {
        item.title = item.title.replace(/_?unal-user-\d+.*$/, "").replace(/_/g, " ").trim() || "Fotografía Campus Unalmed";
      }
    }

    if (dfid) seenDriveFids[dfid] = true;
    result.push(item);
  }
  return result;
}

function getSavedStateFromDrive() {
  var state = {
    version: 3,
    photos: [],
    totalVotesCount: 0,
    deletedPhotoIds: [],
    deletedDynamicIds: [],
    lastPurgeTimestamp: 0,
    devices: {},
    activeDynamic: null,
    dynamics: []
  };
  var file = getDatabaseFile();

  if (file) {
    try {
      var content = file.getBlob().getDataAsString();
      if (content && content.trim().length > 0) {
        var parsed = JSON.parse(content);
        if (parsed && typeof parsed === "object") {
          state = parsed;
          if (!Array.isArray(state.photos)) state.photos = [];
          if (!Array.isArray(state.deletedPhotoIds)) state.deletedPhotoIds = [];
          if (!Array.isArray(state.deletedDynamicIds)) state.deletedDynamicIds = [];
          if (typeof state.lastPurgeTimestamp !== "number") state.lastPurgeTimestamp = 0;
        }
      }
    } catch (err) {
      console.warn("Aviso al leer archivo de base de datos:", err);
    }
  }

  var lastPurgeTs = state.lastPurgeTimestamp || 0;

  // Mapa de fotos eliminadas (lista negra)
  var deletedMap = {};
  var delArr = state.deletedPhotoIds || [];
  for (var d = 0; d < delArr.length; d++) {
    deletedMap[delArr[d]] = true;
  }

  // Mapa de dinámicas eliminadas
  var deletedDynMap = {};
  var delDynArr = state.deletedDynamicIds || [];
  for (var dd = 0; dd < delDynArr.length; dd++) {
    deletedDynMap[delDynArr[dd]] = true;
  }

  var existingMap = {};
  var cleanPhotos = [];
  var existingPhotos = state.photos || [];
  for (var p = 0; p < existingPhotos.length; p++) {
    var item = existingPhotos[p];
    if (item && item.id && !deletedMap[item.id]) {
      if (lastPurgeTs > 0) {
        var itemTs = extractItemTimestamp(item);
        if (itemTs > 0 && itemTs < lastPurgeTs) {
          continue;
        }
      }
      existingMap[item.id] = item;
      if (item.driveFileId) existingMap[item.driveFileId] = item;
      cleanPhotos.push(item);
    }
  }
  state.photos = cleanPhotos;

  // Escaneo automático de la carpeta de Drive respetando el muro temporal
  if (FOLDER_ID && FOLDER_ID !== "ID_DE_TU_CARPETA_DE_DRIVE_AQUI") {
    try {
      var folder = getTargetFolder();
      var discovered = scanDriveFolderImages(folder, existingMap, deletedMap, lastPurgeTs);
      if (discovered.length > 0) {
        state.photos = state.photos.concat(discovered);
        var updatedJson = JSON.stringify(state, null, 2);
        if (file) {
          file.setContent(updatedJson);
        } else {
          folder.createFile(DB_FILENAME, updatedJson, MimeType.PLAIN_TEXT);
        }
      }
    } catch(err) {
      console.warn("Aviso escaneando carpeta:", err);
    }
  }

  state.photos = deduplicatePhotoList(state.photos || []);
  return state;
}

function saveState(data) {
  var folder = getTargetFolder();

  // 0. RESET TOTAL Y PURGA ABSOLUTA A CERO CON MURO TEMPORAL INMUTABLE
  if (data && (data.action === "RESET_EVERYTHING_PURGE_ALL" || data.purgeAll === true)) {
    var purgeTs = data.lastPurgeTimestamp || Date.now();
    
    // Mover a la papelera todos los archivos de fotos dentro de la carpeta para no dejar rastro
    try {
      var allFiles = folder.getFiles();
      while (allFiles.hasNext()) {
        var f = allFiles.next();
        if (f.getName() !== DB_FILENAME) {
          try {
            f.setTrashed(true);
          } catch(errTrash) {}
        }
      }
    } catch(errFiles) {
      console.warn("Aviso limpiando archivos de Drive:", errFiles);
    }

    var cleanZeroState = {
      version: 3,
      updatedAt: purgeTs,
      totalVotesCount: 0,
      photos: [],
      deletedPhotoIds: (data.deletedPhotoIds && data.deletedPhotoIds.length > 0) ? data.deletedPhotoIds : [],
      deletedDynamicIds: (data.deletedDynamicIds && data.deletedDynamicIds.length > 0) ? data.deletedDynamicIds : [],
      lastPurgeTimestamp: purgeTs, // Muro temporal inmutable permanente
      devices: {},
      activeDynamic: null,
      dynamics: [],
      recordedDuels: {},
      recordedSwipes: {}
    };

    var cleanJson = JSON.stringify(cleanZeroState, null, 2);
    var dbFile = getDatabaseFile();
    if (dbFile) {
      dbFile.setContent(cleanJson);
    } else {
      folder.createFile(DB_FILENAME, cleanJson, MimeType.PLAIN_TEXT);
    }

    try {
      CacheService.getScriptCache().remove(CACHE_KEY);
    } catch(e) {}

    return cleanZeroState;
  }

  var existing = getSavedStateFromDrive();

  // 0.1 Muro temporal: el más reciente entre el existente y el recibido
  var lastPurgeTs = Math.max(existing.lastPurgeTimestamp || 0, data.lastPurgeTimestamp || 0);

  // 1. Unir IDs de fotos eliminadas (lista negra permanente)
  var deletedMap = {};
  var existingDeleted = existing.deletedPhotoIds || [];
  for (var d1 = 0; d1 < existingDeleted.length; d1++) {
    deletedMap[existingDeleted[d1]] = true;
  }
  var incomingDeleted = data.deletedPhotoIds || [];
  for (var d2 = 0; d2 < incomingDeleted.length; d2++) {
    deletedMap[incomingDeleted[d2]] = true;
  }
  if (data.action === "deletePhoto" && data.photoId) {
    deletedMap[data.photoId] = true;
  }

  // 1.1 Unir IDs de dinámicas eliminadas (lista negra permanente de dinámicas)
  var deletedDynMap = {};
  var existingDynDeleted = existing.deletedDynamicIds || [];
  for (var dd1 = 0; dd1 < existingDynDeleted.length; dd1++) {
    deletedDynMap[existingDynDeleted[dd1]] = true;
  }
  var incomingDynDeleted = data.deletedDynamicIds || [];
  for (var dd2 = 0; dd2 < incomingDynDeleted.length; dd2++) {
    deletedDynMap[incomingDynDeleted[dd2]] = true;
  }
  if (data.action === "deleteDynamic" && data.dynamicId) {
    deletedDynMap[data.dynamicId] = true;
  }

  // Si se eliminó una foto específica, intentar mover su archivo en Drive a la papelera
  if (data.action === "deletePhoto" && data.photoId) {
    var exPhotos = existing.photos || [];
    for (var xp = 0; xp < exPhotos.length; xp++) {
      if (exPhotos[xp] && (exPhotos[xp].id === data.photoId || exPhotos[xp].driveFileId === data.photoId)) {
        if (exPhotos[xp].driveFileId) {
          try {
            DriveApp.getFileById(exPhotos[xp].driveFileId).setTrashed(true);
          } catch(errDelDrive) {}
        }
      }
    }
  }

  var allDeletedIds = Object.keys(deletedMap);
  var allDeletedDynamicIds = Object.keys(deletedDynMap);

  // 2. FUSIÓN SEGURA DE FOTOGRAFÍAS CON FILTRADO CONTRA RESURRECCIÓN:
  var photoMap = {};
  var existingPhotos = existing.photos || [];
  for (var ep = 0; ep < existingPhotos.length; ep++) {
    var p = existingPhotos[ep];
    if (p && p.id && !deletedMap[p.id]) {
      if (lastPurgeTs > 0) {
        var pts = extractItemTimestamp(p);
        if (pts > 0 && pts < lastPurgeTs) continue;
      }
      photoMap[p.id] = p;
    }
  }

  var incomingPhotos = Array.isArray(data.photos) ? data.photos : [];
  for (var ip = 0; ip < incomingPhotos.length; ip++) {
    var inc = incomingPhotos[ip];
    if (inc && inc.id && !deletedMap[inc.id]) {
      // Si la foto entrante fue creada antes de la purga general, descartarla en el acto!
      if (lastPurgeTs > 0) {
        var incts = extractItemTimestamp(inc);
        if (incts > 0 && incts < lastPurgeTs) {
          continue; // BLOQUEADO: Foto zombie descartada
        }
      }

      if (!photoMap[inc.id]) {
        photoMap[inc.id] = inc;
      } else {
        var cur = photoMap[inc.id];
        var curActivity = (cur.matchesPlayed || 0) + (cur.swipeLikes || 0) + (cur.swipePasses || 0);
        var incActivity = (inc.matchesPlayed || 0) + (inc.swipeLikes || 0) + (inc.swipePasses || 0);

        var finalPts = cur.points !== undefined ? cur.points : 1200;
        var finalMatches = cur.matchesPlayed || 0;
        var finalWins = cur.matchesWon || 0;
        var finalLikes = cur.swipeLikes || 0;
        var finalPasses = cur.swipePasses || 0;

        if (incActivity >= curActivity) {
          finalPts = inc.points !== undefined ? inc.points : finalPts;
          finalMatches = inc.matchesPlayed || 0;
          finalWins = inc.matchesWon || 0;
          finalLikes = inc.swipeLikes || 0;
          finalPasses = inc.swipePasses || 0;
        }

        photoMap[inc.id] = {
          id: inc.id,
          title: inc.title || cur.title,
          author: inc.author || cur.author,
          location: inc.location || cur.location,
          description: inc.description || cur.description,
          imageUrl: inc.imageUrl || cur.imageUrl,
          driveFileId: inc.driveFileId || cur.driveFileId,
          driveWebViewLink: inc.driveWebViewLink || cur.driveWebViewLink,
          syncedToDrive: inc.syncedToDrive || cur.syncedToDrive,
          points: finalPts,
          matchesPlayed: finalMatches,
          matchesWon: finalWins,
          swipeLikes: finalLikes,
          swipePasses: finalPasses,
          comments: (cur.comments && cur.comments.length >= (inc.comments || []).length) ? cur.comments : (inc.comments || []),
          createdAt: cur.createdAt || inc.createdAt || "Hoy"
        };
      }
    }
  }

  var finalPhotos = [];
  var allKeys = Object.keys(photoMap);
  for (var k = 0; k < allKeys.length; k++) {
    finalPhotos.push(photoMap[allKeys[k]]);
  }

  // 2.1 CONVERSIÓN DE BASE64 A GOOGLE DRIVE CON ANTI-DUPLICACIÓN ESTRICTA (FIN A LAS 5 COPIAS):
  for (var fp = 0; fp < finalPhotos.length; fp++) {
    var photoItem = finalPhotos[fp];
    if (photoItem && photoItem.imageUrl && photoItem.imageUrl.indexOf("data:image/") === 0 && !photoItem.driveFileId) {
      try {
        var matches = photoItem.imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (matches && matches[2]) {
          var mimeType = matches[1];
          var base64Data = matches[2];
          var safeTitle = (photoItem.title || "foto").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
          var ext = mimeType.indexOf("png") !== -1 ? ".png" : (mimeType.indexOf("webp") !== -1 ? ".webp" : ".jpg");
          var fileName = safeTitle + "_" + photoItem.id + ext;
          
          // COMPROBACIÓN CRÍTICA: ¿Ya existe un archivo con este nombre exacto en Drive?
          var existingFiles = folder.getFilesByName(fileName);
          var targetDriveFile = null;
          if (existingFiles.hasNext()) {
            // Reutilizar el archivo existente en Drive, ¡cero duplicados!
            targetDriveFile = existingFiles.next();
          } else {
            // Solo si no existe físicamente, crearlo una única vez
            var decodedBytes = Utilities.base64Decode(base64Data);
            var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
            targetDriveFile = folder.createFile(blob);
            try {
              targetDriveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            } catch(eShare) {}
          }

          if (targetDriveFile) {
            photoItem.driveFileId = targetDriveFile.getId();
            photoItem.driveWebViewLink = targetDriveFile.getUrl();
            photoItem.imageUrl = "https://lh3.googleusercontent.com/d/" + targetDriveFile.getId();
            photoItem.syncedToDrive = true;
          }
        }
      } catch(errUpload) {
        console.warn("No se pudo procesar archivo en Drive:", errUpload);
      }
    }
  }

  // 3. LEDGER INMUTABLE DE ENFRENTAMIENTOS Y VOTOS POR DISPOSITIVO
  var recordedDuels = existing.recordedDuels || {};
  var recordedSwipes = existing.recordedSwipes || {};

  // 3.1 Procesar nuevo enfrentamiento único
  if (data.duelRecord && data.duelRecord.voteId) {
    var vId = String(data.duelRecord.voteId);
    var duelTs = data.duelRecord.timestamp || Date.now();
    // Solo si es posterior al muro temporal de purga
    if (lastPurgeTs === 0 || duelTs >= lastPurgeTs) {
      if (!recordedDuels[vId]) {
        recordedDuels[vId] = {
          winnerId: data.duelRecord.winnerId,
          loserId: data.duelRecord.loserId,
          deviceId: data.duelRecord.deviceId,
          pairKey: data.duelRecord.pairKey,
          dynamicId: data.duelRecord.dynamicId,
          timestamp: duelTs
        };

        // Si incomingPhotos no incluía las fotos (p. ej. llamada API directa sin catálogo),
        // actualizar estadísticas aquí sin límite inferior.
        var wId = data.duelRecord.winnerId;
        var lId = data.duelRecord.loserId;
        if ((!incomingPhotos || incomingPhotos.length === 0) && photoMap[wId] && photoMap[lId]) {
          photoMap[wId].matchesPlayed = (photoMap[wId].matchesPlayed || 0) + 1;
          photoMap[wId].matchesWon = (photoMap[wId].matchesWon || 0) + 1;
          photoMap[lId].matchesPlayed = (photoMap[lId].matchesPlayed || 0) + 1;
          var pw = photoMap[wId].points !== undefined ? photoMap[wId].points : 1200;
          var pl = photoMap[lId].points !== undefined ? photoMap[lId].points : 1200;
          var expW = 1 / (1 + Math.pow(10, (pl - pw) / 400));
          var expL = 1 / (1 + Math.pow(10, (pw - pl) / 400));
          photoMap[wId].points = Math.round(pw + 32 * (1 - expW));
          photoMap[lId].points = Math.round(pl + 32 * (0 - expL));
        }

        if (!data.totalVotesCount) {
          existing.totalVotesCount = (existing.totalVotesCount || 0) + 1;
        }
      }
    }
  }

  // 3.2 Procesar nuevo swipe único
  if (data.swipeRecord && data.swipeRecord.swipeId) {
    var sId = String(data.swipeRecord.swipeId);
    var swipeTs = data.swipeRecord.timestamp || Date.now();
    if (lastPurgeTs === 0 || swipeTs >= lastPurgeTs) {
      if (!recordedSwipes[sId]) {
        recordedSwipes[sId] = {
          photoId: data.swipeRecord.photoId,
          liked: Boolean(data.swipeRecord.liked),
          deviceId: data.swipeRecord.deviceId,
          dynamicId: data.swipeRecord.dynamicId,
          timestamp: swipeTs
        };

        var targetPhoto = photoMap[data.swipeRecord.photoId];
        if (targetPhoto && (!incomingPhotos || incomingPhotos.length === 0)) {
          if (data.swipeRecord.liked) {
            targetPhoto.swipeLikes = (targetPhoto.swipeLikes || 0) + 1;
            targetPhoto.points = (targetPhoto.points !== undefined ? targetPhoto.points : 1200) + 10;
          } else {
            targetPhoto.swipePasses = (targetPhoto.swipePasses || 0) + 1;
            targetPhoto.points = (targetPhoto.points !== undefined ? targetPhoto.points : 1200) - 4;
          }
        }

        if (!data.totalVotesCount) {
          existing.totalVotesCount = (existing.totalVotesCount || 0) + 1;
        }
      }
    }
  }

  // 3.3 Votos totales acumulados
  var totalVotes = Math.max(existing.totalVotesCount || 0, data.totalVotesCount || 0);

  // 4. Registro de dispositivos
  var devices = existing.devices || {};
  if (data.deviceId) {
    devices[data.deviceId] = {
      lastSeen: Date.now(),
      votedCount: (data.userVotedPhotos || []).length || (devices[data.deviceId] ? devices[data.deviceId].votedCount + 1 : 1)
    };
  }

  // 5. Dinámicas: purgar permanentemente dinámicas y fotos eliminadas
  var rawActive = data.activeDynamic !== undefined ? data.activeDynamic : existing.activeDynamic;
  var rawDynamics = Array.isArray(data.dynamics) && data.dynamics.length > 0 ? data.dynamics : (existing.dynamics || []);

  function cleanDynamic(dyn) {
    if (!dyn || !dyn.id) return null;
    if (deletedDynMap[dyn.id]) return null;
    if (lastPurgeTs > 0 && (dyn.startedAt || 0) < lastPurgeTs) return null;

    var filteredRanked = (dyn.allRankedPhotos || []).filter(function(p) {
      if (!p || !p.id || deletedMap[p.id]) return false;
      if (lastPurgeTs > 0) {
        var pts = extractItemTimestamp(p);
        if (pts > 0 && pts < lastPurgeTs) return false;
      }
      return true;
    });
    var newTop3 = filteredRanked.slice(0, 3);
    return {
      id: dyn.id,
      title: dyn.title,
      description: dyn.description,
      startedAt: dyn.startedAt,
      durationHours: dyn.durationHours,
      closedAt: dyn.closedAt,
      isClosed: dyn.isClosed,
      totalVotesAtClose: dyn.totalVotesAtClose,
      allRankedPhotos: filteredRanked,
      top3: newTop3
    };
  }

  var activeDyn = rawActive ? cleanDynamic(rawActive) : null;
  var cleanDynamics = [];
  for (var cdi = 0; cdi < rawDynamics.length; cdi++) {
    var cd = cleanDynamic(rawDynamics[cdi]);
    if (cd) cleanDynamics.push(cd);
  }

  var finalState = {
    version: 3,
    updatedAt: Date.now(),
    totalVotesCount: totalVotes,
    photos: deduplicatePhotoList(finalPhotos),
    deletedPhotoIds: allDeletedIds,
    deletedDynamicIds: allDeletedDynamicIds,
    lastPurgeTimestamp: lastPurgeTs,
    devices: devices,
    activeDynamic: activeDyn,
    dynamics: cleanDynamics,
    recordedDuels: recordedDuels,
    recordedSwipes: recordedSwipes
  };

  var jsonStr = JSON.stringify(finalState, null, 2);
  var file = getDatabaseFile();
  if (file) {
    file.setContent(jsonStr);
  } else {
    folder.createFile(DB_FILENAME, jsonStr, MimeType.PLAIN_TEXT);
  }
  return finalState;
}

// Para probar permisos y funcionamiento manualmente desde el editor de Apps Script:
function testDrive() {
  var folder = getTargetFolder();
  var file = getDatabaseFile();
  var state = getSavedStateFromDrive();
  Logger.log("✓ Google Drive conectado correctamente!");
  Logger.log("✓ Carpeta seleccionada: " + folder.getName() + " (ID: " + folder.getId() + ")");
  if (file) {
    Logger.log("✓ Archivo unalmed_database.json encontrado dentro de la carpeta: " + file.getName());
    Logger.log("✓ Enlace directo a la base de datos: " + file.getUrl());
  } else {
    Logger.log("Aviso: Aún no existe unalmed_database.json, se creará al guardar.");
  }
  Logger.log("✓ Total de fotos activas en el catálogo: " + (state.photos || []).length);
  Logger.log("✓ Total de votos globales: " + (state.totalVotesCount || 0));
  Logger.log("✓ Fotos eliminadas en lista negra: " + (state.deletedPhotoIds || []).length);
  Logger.log("✓ Dinámicas eliminadas en lista negra: " + (state.deletedDynamicIds || []).length);
  Logger.log("✓ Muro temporal de purga activa: " + (state.lastPurgeTimestamp ? new Date(state.lastPurgeTimestamp).toISOString() : "Ninguno (catálogo activo)"));
  Logger.log("✓ Dispositivos registrados: " + Object.keys(state.devices || {}).length);
}

// FUNCIÓN PARA EJECUTAR MANUALMENTE EN APPS SCRIPT Y BORRARLO TODO A CERO:
function BORRAR_TODO_Y_RESETEAR_A_CERO() {
  saveState({
    action: "RESET_EVERYTHING_PURGE_ALL",
    purgeAll: true,
    lastPurgeTimestamp: Date.now()
  });
  Logger.log("✓ SE HA BORRADO TODO SIN EXCEPCIÓN: Todas las fotos, duelos, dinámicas y votos reseteados a 0 con muro temporal permanente.");
}`;
                        navigator.clipboard.writeText(code);
                        setScriptCopied(true);
                        setTimeout(() => setScriptCopied(false), 3000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 text-neutral-950 font-bold text-xs transition cursor-pointer"
                    >
                      {scriptCopied ? '✓ Copiado' : 'Copiar Código'}
                    </button>
                  </div>

                  {/* Guía rápida de configuración en 4 pasos */}
                  <div className="space-y-2 text-neutral-300">
                    <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1.5">
                      <span className="font-bold text-white block">
                        Paso a paso para desplegar / actualizar en script.google.com:
                      </span>
                      <ol className="list-decimal pl-4 space-y-1 text-neutral-300 text-[11px]">
                        <li>Abre <strong>script.google.com</strong> con tu cuenta Google (la de tu Drive).</li>
                        <li>Pega el código anterior y guárdalo (Ctrl+S).</li>
                        <li>
                          Haz clic en <strong>Implementar &gt; Gestionar implementaciones</strong> (o Nueva implementación si es la primera vez).
                        </li>
                        <li>Haz clic en el icono del <strong>Lápiz (Editar)</strong>.</li>
                        <li>
                          En <em>Versión</em>, selecciona <strong>Nueva versión</strong> (¡Paso crítico! Si no creas nueva versión, Google sigue ejecutando el código viejo).
                        </li>
                        <li><em>Ejecutar como:</em> <strong>Yo (tu cuenta de Google)</strong>.</li>
                        <li><em>Quién tiene acceso:</em> <strong>Cualquier usuario (incluso anónimos)</strong>.</li>
                        <li>Haz clic en <strong>Implementar</strong>. Copia la <strong>URL de la aplicación web</strong> (terminada en <code>/exec</code>), pégala en el campo de arriba y pulsa <strong>Guardar URL</strong> y <strong>🧪 Probar Conexión</strong>.</li>
                      </ol>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-1">
                        <span className="font-bold text-amber-400 block">
                          100% Certeza: ¿Cómo probar el script?
                        </span>
                        <ul className="list-disc pl-3.5 space-y-1 text-neutral-400">
                          <li>
                            <strong>En Apps Script:</strong> En la barra superior elige la función <code>testDrive</code> y pulsa <em>Ejecutar</em>. En el registro verás si creó el archivo en tu Drive.
                          </li>
                          <li>
                            <strong>En tu navegador:</strong> Pulsa el botón <em>🌐 Abrir en Navegador</em>. Debes ver el JSON con tus fotos sin que Google te pida iniciar sesión.
                          </li>
                          <li>
                            <strong>En la app:</strong> Pulsa <em>🧪 Probar Conexión</em>. El semáforo verde confirma que la base de datos está conectada.
                          </li>
                        </ul>
                      </div>

                      <div className="p-3 bg-neutral-950 rounded-xl border border-emerald-800/80 space-y-1">
                        <span className="font-bold text-emerald-400 block">
                          Diferencias de Sincronización, Dinámicas y Google Drive (Versión 4.1)
                        </span>
                        <ul className="list-disc pl-3.5 space-y-1 text-neutral-400">
                          <li>
                            <strong>¿Por qué una foto eliminada seguía apareciendo en el Top?</strong> Las dinámicas guardan un resumen de resultados (podio Top 3) en el momento del cierre. Ahora, la app y el script purgan automáticamente cualquier fotografía eliminada de los podios y clasificaciones pasadas y presentes, reemplazándola de inmediato por la siguiente foto válida en el ranking.
                          </li>
                          <li>
                            <strong>¿Por qué antes no aparecían archivos de foto en la carpeta de Drive y solo estaba el JSON?</strong> Los estudiantes suben fotos desde sus navegadores sin iniciar sesión en Google. La app enviaba la imagen codificada en base64 dentro de <code>unalmed_database.json</code>. En esta <strong>Versión 4.1</strong>, el script de Google (que corre con tus permisos de Admin) extrae automáticamente ese base64 y crea el archivo físico <code>.jpg</code> dentro de tu carpeta de Drive, guardando solo el enlace directo en la base de datos para que no pese nada.
                          </li>
                          <li>
                            <strong>Diferencia: Sincronización Normal vs Forzar Sincronización:</strong>
                            <br />• <em>Sincronización Normal (Background):</em> Se ejecuta sola cada 8 segundos y cuando alguien vota. Lee lo de Drive y lo combina (merge) con lo nuevo de cada usuario sin sobreescribir.
                            <br />• <em>Forzar Sincronización (Admin Push):</em> Es un comando exclusivo del administrador que envía todo lo que tienes en pantalla para que la base de datos en Drive sea exactamente idéntica a tu vista.
                          </li>
                          <li>
                            <strong>¿Por qué algunos enfrentamientos de otros dispositivos no eran registrados?</strong> Si varios dispositivos votaban casi al mismo tiempo, el script anterior comparaba con <code>Math.max</code> en vez de sumar enfrentamientos concurrentes, o si el Administrador pulsaba "Forzar Sincronización" teniendo en su pantalla datos antiguos (ej: 0 votos), su estado desactualizado aplastaba los duelos que otros dispositivos habían registrado. <em>Consejo:</em> Antes de forzar una sincronización, pulsa siempre <strong>"🔄 Cargar / Recuperar Fotos de Drive"</strong> para tener en tu pantalla los votos más recientes de la comunidad.
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-3 bg-neutral-950 rounded-xl border border-blue-500/20 space-y-1 text-[11px]">
                      <span className="font-bold text-blue-400 block">
                        Paso a paso para configurar Vercel y que se actualice fácilmente:
                      </span>
                      <ol className="list-decimal pl-4 space-y-1 text-neutral-400">
                        <li>
                          Ve a tu proyecto en <strong>vercel.com</strong> &gt; pestaña <strong>Settings</strong> &gt; <strong>Environment Variables</strong>.
                        </li>
                        <li>
                          Agrega <code>VITE_SYNC_API_URL</code> con el valor de tu URL de Google Script (terminada en <code>/exec</code>).
                        </li>
                        <li>
                          Agrega <code>VITE_DRIVE_FOLDER_ID</code> con el ID de tu carpeta de Google Drive.
                        </li>
                        <li>
                          <strong>PASO CLAVE DE VERCEL:</strong> Ve a la pestaña <strong>Deployments</strong>, haz clic en los 3 puntos <code>...</code> del despliegue más reciente y selecciona <strong>Redeploy</strong> (Vite compila las variables al construir; si no redespliegas, la app web seguirá usando la configuración anterior).
                        </li>
                        <li>
                          <strong>Actualizaciones continuas:</strong> Cada vez que hagas <code>git push</code> a GitHub, Vercel compila y despliega automáticamente la última versión sin que tengas que hacer nada manual.
                        </li>
                      </ol>
                    </div>
                  </div>
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

              {activeDynamic && (
                <div className="flex flex-wrap items-center gap-2">
                  {!activeDynamic.isClosed && (
                    <button
                      type="button"
                      onClick={handleCloseDynamicManually}
                      className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold transition cursor-pointer"
                    >
                      Finalizar y calcular podio
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Estás seguro de que deseas cancelar y eliminar permanentemente la dinámica activa "${activeDynamic.title}"?`)) {
                        deleteDynamic(activeDynamic.id);
                        setSuccessNotice(`Dinámica "${activeDynamic.title}" eliminada.`);
                        setTimeout(() => setSuccessNotice(''), 4000);
                      }
                    }}
                    className="px-4 py-2 rounded-full bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800/40 transition cursor-pointer"
                  >
                    🗑️ Eliminar dinámica activa
                  </button>
                </div>
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
                      step="any"
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

            {/* LISTA Y GESTIÓN DE DINÁMICAS HISTÓRICAS */}
            {dynamics.length > 0 && (
              <div className="pt-6 border-t border-neutral-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Historial de Dinámicas Concluidas ({dynamics.length})
                  </h3>
                  <span className="text-xs text-neutral-400">
                    Como administrador puedes borrar dinámicas que ya no desees conservar
                  </span>
                </div>

                <div className="space-y-2">
                  {dynamics.map((dyn) => (
                    <div
                      key={dyn.id}
                      className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{dyn.title}</span>
                          <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 text-[10px] font-semibold">
                            {dyn.totalVotesAtClose ?? 0} votos
                          </span>
                        </div>
                        {dyn.description && (
                          <p className="text-neutral-400 text-[11px] line-clamp-1">{dyn.description}</p>
                        )}
                        <span className="text-neutral-500 text-[10px] block">
                          Iniciada: {new Date(dyn.startedAt).toLocaleDateString('es-CO')} • {dyn.closedAt ? `Finalizada: ${new Date(dyn.closedAt).toLocaleDateString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : 'Cerrada'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la dinámica "${dyn.title}"? Esta acción borrará el registro del historial.`)) {
                            deleteDynamic(dyn.id);
                            setSuccessNotice(`Dinámica "${dyn.title}" eliminada.`);
                            setTimeout(() => setSuccessNotice(''), 4000);
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold border border-rose-800/40 transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

          {/* SECCIÓN 4: ZONA DE PELIGRO • RESET TOTAL Y PURGA ABSOLUTA A CERO */}
          <div className="p-6 sm:p-8 rounded-3xl bg-rose-950/20 border border-rose-800/40 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-rose-600/30 text-rose-300 text-xs font-bold mb-1">
                  Zona de Peligro • Irreversible
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Borrar TODO sin excepción y resetear a 0
                </h2>
                <p className="text-xs text-rose-200/80 font-light mt-1 max-w-2xl leading-relaxed">
                  Elimina permanentemente todo el catálogo de fotografías, limpia los archivos de imagen dentro de tu carpeta de Google Drive, reinicia el contador de votos a 0, vacía el historial de duelos (ledger) y elimina todas las dinámicas pasadas y activas.
                </p>
              </div>

              {!showPurgeModal && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPurgeModal(true);
                    setPurgeConfirmInput('');
                  }}
                  className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition cursor-pointer shadow-lg shrink-0 self-start sm:self-auto"
                >
                  🔴 Borrar TODO sin excepción
                </button>
              )}
            </div>

            {/* Modal / Caja de confirmación explícita para evitar accidentes */}
            {showPurgeModal && (
              <div className="p-5 rounded-2xl bg-neutral-950 border border-rose-700/60 space-y-4 animate-fadeIn">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                    <span>⚠️</span> ¿Estás completamente seguro de borrar absolutamente TODO?
                  </h4>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Se borrarán las <strong className="text-white">{photos.length} fotos</strong>, los <strong className="text-white">{totalVotesCount} votos</strong>, todas las dinámicas y se moverán a la papelera los archivos de imagen en tu carpeta de Drive. Para proceder, escribe la palabra <strong className="text-rose-400 font-mono">BORRAR</strong> a continuación:
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="text"
                    value={purgeConfirmInput}
                    onChange={(e) => setPurgeConfirmInput(e.target.value)}
                    placeholder='Escribe "BORRAR" aquí'
                    className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />

                  <button
                    type="button"
                    disabled={purgeConfirmInput.trim().toUpperCase() !== 'BORRAR' || isPurgingAll}
                    onClick={async () => {
                      setIsPurgingAll(true);
                      try {
                        const ok = await purgeEverythingToZero();
                        if (ok) {
                          setShowPurgeModal(false);
                          setPurgeConfirmInput('');
                          setSuccessNotice('✓ Se ha borrado absolutamente TODO sin excepción. Base de datos reseteada a 0.');
                          setTimeout(() => setSuccessNotice(''), 6000);
                        }
                      } finally {
                        setIsPurgingAll(false);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed shadow-md"
                  >
                    {isPurgingAll ? 'Borrando todo...' : 'Confirmar y Purgar Todo a 0'}
                  </button>

                  <button
                    type="button"
                    disabled={isPurgingAll}
                    onClick={() => {
                      setShowPurgeModal(false);
                      setPurgeConfirmInput('');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
