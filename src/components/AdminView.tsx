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
  } = usePhotos();

  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

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

          {/* SECCIÓN GOOGLE DRIVE: ALMACENAMIENTO PERSONAL EN LA NUBE */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold block mb-1">
                  Almacenamiento en Google Drive Personal
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Carpeta Pública de Fotografías
                </h2>
                <p className="text-xs text-neutral-400 font-light mt-0.5">
                  Las fotos se guardan en tu Drive y se configuran con enlace público de solo lectura para que cualquier visitante las vea directamente.
                </p>
              </div>

              {googleUser ? (
                <div className="flex items-center gap-3">
                  {driveFolder?.webViewLink && (
                    <a
                      href={driveFolder.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold transition"
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
                <button
                  onClick={() => connectGoogleDrive()}
                  disabled={isConnectingDrive}
                  className="px-5 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-xs transition cursor-pointer self-start sm:self-auto shadow-md"
                >
                  {isConnectingDrive ? 'Conectando...' : 'Conectar mi Google Drive'}
                </button>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-neutral-950 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Estado de Google Drive:</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    googleUser
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {googleUser ? `Conectado (${googleUser.email})` : 'No vinculado'}
                </span>
              </div>

              {driveFolder && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Carpeta creada en tu Drive:</span>
                    <span className="text-white font-semibold">{driveFolder.folderName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Visibilidad pública:</span>
                    <span className="text-emerald-400 font-semibold">Cualquiera con el enlace puede ver</span>
                  </div>
                </>
              )}

              <p className="text-xs text-neutral-500 font-light pt-2 border-t border-neutral-900 leading-relaxed">
                Cada nueva fotografía subida desde la pestaña "Subir foto" generará un archivo dentro de esta carpeta pública en tu Drive personal y compartirá la URL pública optimizada con toda la comunidad.
              </p>
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
