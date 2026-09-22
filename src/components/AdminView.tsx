import React, { useState } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { AdminVoteModeSetting } from '../types';

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
    activeDynamic,
    isVotingOpen,
    timeRemainingSeconds,
    startNewDynamic,
    finishCurrentDynamic,
    dynamics,
    deleteDynamic,
    googleUser,
    driveFolder,
    isConnectingDrive,
    connectGoogleDrive,
    disconnectGoogleDrive,
    setManualDriveFolder,
    syncPhotosToDrive,
  } = usePhotos();

  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [driveAuthError, setDriveAuthError] = useState('');
  const [manualFolderInput, setManualFolderInput] = useState('');
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Form state for creating a new dynamic
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [durationMode, setDurationMode] = useState<'infinite' | 'custom'>('custom');
  const [customHours, setCustomHours] = useState('24');

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
        <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
          Panel de Control
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Administración de Fotografia Unalmed
        </h1>
        <p className="text-sm text-neutral-400 font-light mt-1">
          Control de dinámicas por tiempo, selección de top 3, duración de votaciones y reglas de torneo.
        </p>
      </div>

      {!isAdmin ? (
        /* Formulario de Login para Administrador */
        <div className="max-w-md mx-auto bg-neutral-900 rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="text-center mb-6">
            <span className="inline-block px-4 py-1.5 rounded-full bg-neutral-800 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
              Área Restringida
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Ingreso de Administrador
            </h2>
            <p className="text-xs text-neutral-400 font-light mt-2">
              Ingresa la contraseña para programar la duración de las votaciones en horas, abrir/cerrar dinámicas y fijar modos de torneo.
            </p>
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
              Desbloquear opciones
            </button>
          </form>

          <div className="mt-6 pt-6 text-center text-xs text-neutral-500 font-light space-y-2">
            <p>
              Clave de acceso sugerida: <code className="text-neutral-300">unalmed2026</code> o <code className="text-neutral-300">admin</code>
            </p>
            <p>
              Los estudiantes pueden participar en las votaciones y subir fotos libremente sin requerir contraseña.
            </p>
          </div>
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
                  Cuenta de Administrador • Google Drive
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Carpeta Pública Oficial del Campus
                </h2>
                <p className="text-xs text-neutral-400 font-light mt-0.5 max-w-2xl">
                  Las fotos de los estudiantes se archivan en tu carpeta de Google Drive como administrador. Los estudiantes no necesitan conectar ninguna cuenta ni crear carpetas.
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
                  Nota: Si tu navegador bloquea la ventana emergente de Google dentro de esta vista previa, abre la aplicación en una pestaña nueva con el botón en la esquina superior de AI Studio.
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
            </div>
          </div>

          {/* SECCIÓN 1: GESTIÓN DE DINÁMICA ACTIVA Y TIEMPO DE VOTACIÓN */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block mb-1">
                  Control de Dinámica y Temporizador
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Dinámica Actual de Votación
                </h2>
                <p className="text-xs text-neutral-400 font-light mt-0.5">
                  Establece cuántas horas dura el torneo o finalízalo manualmente para calcular el podio Top 3.
                </p>
              </div>

              {activeDynamic && !activeDynamic.isClosed && (
                <button
                  onClick={handleCloseDynamicManually}
                  className="px-4 py-2.5 rounded-full bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
                >
                  Finalizar dinámica ahora
                </button>
              )}
            </div>

            {/* Tarjeta de estado de la dinámica activa */}
            {activeDynamic ? (
              <div className="p-5 rounded-2xl bg-neutral-950 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isVotingOpen
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {isVotingOpen ? 'En Curso' : 'Cerrada'}
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {activeDynamic.title}
                    </h3>
                  </div>

                  {isVotingOpen && (
                    <span className="text-xs font-semibold text-amber-400">
                      {activeDynamic.durationHours > 0
                        ? `Tiempo restante: ${formatTimer(timeRemainingSeconds)}`
                        : 'Duración: Sin límite de tiempo (Infinito)'}
                    </span>
                  )}
                </div>

                {activeDynamic.description && (
                  <p className="text-xs text-neutral-300 font-light leading-relaxed">
                    {activeDynamic.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-neutral-400">
                  <span>
                    Duración configurada:{' '}
                    <strong className="text-white">
                      {activeDynamic.durationHours > 0
                        ? `${activeDynamic.durationHours} horas`
                        : 'Infinita (hasta cierre manual)'}
                    </strong>
                  </span>

                  <button
                    onClick={onGoToDynamics}
                    className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    Ver en pestaña Dinámicas →
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-neutral-950 text-center text-xs text-neutral-400">
                No hay ninguna dinámica activa en este momento. Crea una a continuación para abrir las votaciones.
              </div>
            )}

            {/* Formulario para iniciar nueva dinámica con nuevo título y tiempo */}
            <div className="pt-4">
              <h3 className="text-lg font-bold text-white mb-2">
                Iniciar Nueva Dinámica
              </h3>
              <p className="text-xs text-neutral-400 font-light mb-4">
                Al iniciar una nueva dinámica, la anterior se cerrará automáticamente, archivando su Top 3 en la sección "Dinámicas", y se abrirá una nueva ronda de votación para las fotos.
              </p>

              <form onSubmit={handleStartDynamic} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                    Título de la nueva dinámica *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej. Torneo de Atardeceres Unalmed, Rincones Ocultos de Minas, etc."
                    className="w-full px-4 py-3 rounded-2xl bg-neutral-950 text-white text-xs placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
                    Descripción o temática (opcional)
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe el enfoque o invitación a la comunidad..."
                    className="w-full px-4 py-3 rounded-2xl bg-neutral-950 text-white text-xs placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                {/* Selección de duración: Horas o Infinito */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                    Duración de la votación
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div
                      onClick={() => setDurationMode('custom')}
                      className={`p-3.5 rounded-2xl cursor-pointer transition ${
                        durationMode === 'custom'
                          ? 'bg-white text-neutral-950 font-bold'
                          : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-850'
                      }`}
                    >
                      <span className="block text-xs">Tiempo Límite en Horas</span>
                      <span className="text-[11px] font-normal opacity-80">
                        Se cierra automáticamente y genera el Top 3
                      </span>
                    </div>

                    <div
                      onClick={() => setDurationMode('infinite')}
                      className={`p-3.5 rounded-2xl cursor-pointer transition ${
                        durationMode === 'infinite'
                          ? 'bg-white text-neutral-950 font-bold'
                          : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-850'
                      }`}
                    >
                      <span className="block text-xs">Tiempo Infinito / Indefinido</span>
                      <span className="text-[11px] font-normal opacity-80">
                        Dura hasta que el admin decida cerrarla manualmente
                      </span>
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

                      {/* Botones de sugerencia rápida */}
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
                        3 días (72h)
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm transition cursor-pointer shadow-md text-center"
                >
                  Lanzar esta dinámica
                </button>
              </form>
            </div>
          </div>

          {/* SECCIÓN 2: CONFIGURACIÓN DE MODO DE VOTACIÓN (1v1, Swipe o Ambos) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block mb-1">
                Regla de Torneo
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Modalidad de Votación Permitida
              </h2>
              <p className="text-sm text-neutral-400 font-light mt-1">
                Elige si los usuarios votarán únicamente en duelos 1v1, deslizando tarjetas (Swipe), o si tendrán acceso a ambas opciones.
              </p>
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

              <div className="flex items-center gap-3">
                <button
                  onClick={onGoToUpload}
                  className="px-4 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition cursor-pointer"
                >
                  Subir nueva foto
                </button>
                {photos.length > 0 && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          '¿Deseas vaciar todas las fotografías y votos de la base de datos local?'
                        )
                      ) {
                        resetAllData();
                      }
                    }}
                    className="px-4 py-2.5 rounded-full bg-rose-950/70 hover:bg-rose-900 text-xs font-semibold text-rose-300 transition cursor-pointer"
                  >
                    Borrar todas
                  </button>
                )}
              </div>
            </div>

            {photos.length === 0 ? (
              <div className="p-8 text-center bg-neutral-950 rounded-2xl">
                <p className="text-neutral-400 text-sm">
                  No hay fotografías en la plataforma en este momento.
                </p>
                <p className="text-neutral-500 text-xs mt-1">
                  Los usuarios pueden usar la pestaña "Subir foto" para añadir sus capturas del campus.
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
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la foto "${p.title}"?`)) {
                            deletePhoto(p.id);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-semibold transition cursor-pointer"
                      >
                        Eliminar
                      </button>
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
