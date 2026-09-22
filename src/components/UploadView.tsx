import React, { useState, useRef } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { ActiveTab } from '../types';

interface UploadViewProps {
  onUploaded: (tab: ActiveTab) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onUploaded }) => {
  const {
    uploadPhoto,
    googleUser,
    driveFolder,
    isConnectingDrive,
    isUploadingToDrive,
    connectGoogleDrive,
    uploadFileToDriveFolder,
  } = usePhotos();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saveToDrive, setSaveToDrive] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  const [driveResult, setDriveResult] = useState<{
    fileId: string;
    directImageUrl: string;
    webViewLink?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImageUrl(result);
        setPreviewError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      alert('Por favor añade una fotografía para publicar.');
      return;
    }
    if (!title.trim()) {
      alert('Por favor indica un título para la fotografía.');
      return;
    }

    let finalImageUrl = imageUrl;
    let driveFileId: string | undefined = undefined;
    let driveWebViewLink: string | undefined = undefined;

    // Upload to Google Drive if requested
    if (saveToDrive) {
      try {
        setUploadStatusMsg('Guardando en tu Google Drive personal (haciéndola pública para todos)...');
        let uploadBlob: Blob;
        let fileName = (selectedFile?.name || `${title.replace(/\s+/g, '_')}_${Date.now()}.jpg`);

        if (selectedFile) {
          uploadBlob = selectedFile;
        } else if (imageUrl.startsWith('data:')) {
          // Convert dataURL to blob
          const res = await fetch(imageUrl);
          uploadBlob = await res.blob();
        } else {
          // URL
          try {
            const res = await fetch(imageUrl);
            uploadBlob = await res.blob();
          } catch {
            uploadBlob = new Blob([imageUrl], { type: 'text/plain' });
          }
        }

        const driveUploaded = await uploadFileToDriveFolder(uploadBlob, fileName);
        driveFileId = driveUploaded.fileId;
        driveWebViewLink = driveUploaded.webViewLink;
        // Use the direct public Drive image URL
        finalImageUrl = driveUploaded.directImageUrl;
        setDriveResult(driveUploaded);
        setUploadStatusMsg('¡Fotografía alojada en tu Google Drive y pública para todos con éxito!');
      } catch (err: unknown) {
        console.error('Error al subir a Google Drive:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        alert(`No se pudo subir a Google Drive: ${errMsg}. Se publicará localmente.`);
      }
    }

    uploadPhoto({
      title,
      author: author || 'Estudiante Unalmed',
      location: location || 'Campus El Volador',
      imageUrl: finalImageUrl,
      description,
      driveFileId,
      driveWebViewLink,
    });

    setTimeout(() => {
      onUploaded('gallery');
    }, 1200);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      {/* Header */}
      <div className="mb-8">
        <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
          Aporte a la Comunidad
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Subir Fotografía a Fotografia Unalmed
        </h1>
        <p className="text-sm text-neutral-400 font-light mt-1">
          Alojamiento en tu propio Google Drive en una carpeta pública que todos pueden ver, y participación directa en los torneos y dinámicas del campus.
        </p>
      </div>

      {/* Google Drive Status Banner */}
      <div className="mb-8 p-6 rounded-3xl bg-neutral-900 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  googleUser ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {googleUser ? 'Google Drive Conectado' : 'Google Drive No Conectado'}
              </span>

              {driveFolder?.isPublic && (
                <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-400 text-xs font-semibold">
                  Carpeta Pública Activa
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white">
              {googleUser ? `Almacenando en cuenta: ${googleUser.email}` : 'Conecta tu cuenta de Google Drive'}
            </h3>
            <p className="text-xs text-neutral-400 font-light max-w-2xl">
              Al conectar tu Drive, la app creará una carpeta dedicada llamada{' '}
              <strong className="text-neutral-200">"Fotografia Unalmed - Fotos del Campus"</strong> con acceso público de solo lectura, permitiendo que cualquier persona que abra la web vea tus fotos sin restricciones de cuota ni servidores intermedios.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {!googleUser ? (
              <button
                type="button"
                onClick={() => connectGoogleDrive()}
                disabled={isConnectingDrive}
                className="px-5 py-3 rounded-2xl bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-xs transition cursor-pointer shadow-md text-center"
              >
                {isConnectingDrive ? 'Conectando...' : 'Conectar mi Google Drive'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {driveFolder?.webViewLink && (
                  <a
                    href={driveFolder.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-amber-400 transition"
                  >
                    Ver carpeta en Drive ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Toggle to store in Drive */}
        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToDrive}
              onChange={(e) => setSaveToDrive(e.target.checked)}
              className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer"
            />
            <span className="text-xs text-neutral-300 font-medium">
              Subir y almacenar esta fotografía directamente en mi Google Drive público
            </span>
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Upload Zone (Drag and Drop / File Picker) */}
        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">
            Archivo de imagen
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full min-h-[260px] rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'bg-neutral-800 ring-2 ring-amber-400'
                : 'bg-neutral-900 hover:bg-neutral-850'
            }`}
          >
            {imageUrl ? (
              <div className="relative w-full max-h-[360px] rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt="Vista previa"
                  className="max-h-[340px] w-auto object-contain rounded-2xl"
                  onError={() => setPreviewError(true)}
                />
                <div className="absolute inset-0 bg-neutral-950/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="px-4 py-2 rounded-full bg-white text-neutral-950 text-xs font-bold">
                    Cambiar fotografía seleccionada
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-lg font-bold text-white">
                  Arrastra aquí tu fotografía o haz clic para explorar
                </p>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Formatos compatibles: JPG, PNG, WebP de alta resolución. Capturas del campus, arquitectura, vida estudiantil o naturaleza.
                </p>
                <div className="pt-2">
                  <span className="inline-block px-5 py-2.5 rounded-full bg-neutral-800 text-neutral-200 text-xs font-semibold hover:bg-neutral-700 transition">
                    Seleccionar desde tu dispositivo
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Alternative URL Input */}
          <div className="mt-3">
            <span className="text-xs text-neutral-500 block mb-1">
              O pega el enlace directo de una imagen en alta calidad:
            </span>
            <input
              type="url"
              value={imageUrl.startsWith('data:') ? '' : imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setPreviewError(false);
              }}
              placeholder="https://ejemplo.com/fotografia-campus.jpg"
              className="w-full px-4 py-3 rounded-2xl bg-neutral-900 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
            />
          </div>

          {previewError && (
            <p className="text-xs text-rose-400 mt-2">
              No fue posible cargar la vista previa desde ese enlace. Verifica la URL.
            </p>
          )}
        </div>

        {/* Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Título de la obra <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Tarde de Lluvia en Bloque 24"
              className="w-full px-4 py-3 rounded-2xl bg-neutral-900 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Fotógrafo/a o Autor
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Tu nombre o seudónimo"
              className="w-full px-4 py-3 rounded-2xl bg-neutral-900 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Ubicación o Rincón del Campus
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej. Campus El Volador, Facultad de Minas Robledo, Jardines..."
              className="w-full px-4 py-3 rounded-2xl bg-neutral-900 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Breve descripción o contexto
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cuenta la historia detrás del encuadre, la hora o el equipo utilizado..."
              className="w-full px-4 py-3 rounded-2xl bg-neutral-900 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition resize-none"
            />
          </div>
        </div>

        {uploadStatusMsg && (
          <div className="p-4 rounded-2xl bg-neutral-900 text-amber-400 text-xs font-semibold">
            {uploadStatusMsg}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-xs text-neutral-500">
            Al publicar, tu fotografía estará guardada de forma pública en tu Drive y disponible inmediatamente para votación por toda la comunidad.
          </p>

          <button
            type="submit"
            disabled={isUploadingToDrive}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-base transition-all shadow-lg active:scale-95 cursor-pointer text-center disabled:opacity-50"
          >
            {isUploadingToDrive ? 'Subiendo a Google Drive...' : 'Publicar en Fotografia Unalmed'}
          </button>
        </div>
      </form>
    </div>
  );
};
