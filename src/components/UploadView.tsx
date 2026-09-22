import React, { useState, useRef } from 'react';
import { usePhotos } from '../context/PhotoContext';
import { ActiveTab } from '../types';

interface UploadViewProps {
  onUploaded: (tab: ActiveTab) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onUploaded }) => {
  const {
    uploadPhoto,
    driveFolder,
    isUploadingToDrive,
    uploadFileToDriveFolder,
  } = usePhotos();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    let finalImageUrl = imageUrl;
    let driveFileId: string | undefined = undefined;
    let driveWebViewLink: string | undefined = undefined;
    let syncedToDrive = false;

    // Check if the admin drive is active and can accept background upload
    try {
      let uploadBlob: Blob | null = null;
      const fileName = (selectedFile?.name || `${title.replace(/\s+/g, '_')}_${Date.now()}.jpg`);

      if (selectedFile) {
        uploadBlob = selectedFile;
      } else if (imageUrl.startsWith('data:')) {
        const res = await fetch(imageUrl);
        uploadBlob = await res.blob();
      }

      if (uploadBlob) {
        setUploadStatusMsg('Procesando fotografía y guardando en la galería...');
        // uploadFileToDriveFolder only uploads if admin token is active; otherwise returns null without asking students
        const driveUploaded = await uploadFileToDriveFolder(uploadBlob, fileName);
        if (driveUploaded) {
          driveFileId = driveUploaded.fileId;
          driveWebViewLink = driveUploaded.webViewLink;
          finalImageUrl = driveUploaded.directImageUrl;
          syncedToDrive = true;
          setUploadStatusMsg('¡Fotografía alojada en la carpeta pública de Google Drive del campus!');
        }
      }
    } catch (err) {
      console.warn('Subida directa a Drive omitida:', err);
    }

    // Save photo to community database
    uploadPhoto({
      title,
      author: author.trim() || 'Estudiante Unalmed',
      location: location.trim() || 'Campus El Volador',
      imageUrl: finalImageUrl,
      description,
      driveFileId,
      driveWebViewLink,
    });

    setUploadStatusMsg('¡Fotografía publicada exitosamente para toda la comunidad!');

    setTimeout(() => {
      onUploaded('gallery');
    }, 1000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold">
            Aporte a la Comunidad
          </span>
          {driveFolder && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold">
              Repositorio Drive Público Activo
            </span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Subir Fotografía del Campus
        </h1>
        <p className="text-sm text-neutral-400 font-light mt-1">
          Comparte tu mirada de la vida universitaria, arquitectura, fauna o atardeceres. Tu foto participará de inmediato en las votaciones y duelos de la comunidad.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Upload Zone (Drag and Drop / File Picker) */}
        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">
            Archivo de imagen <span className="text-amber-400">*</span>
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
                <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-800 flex items-center justify-center text-amber-400 text-2xl font-bold">
                  📷
                </div>
                <p className="text-lg font-bold text-white">
                  Arrastra aquí tu fotografía o haz clic para explorar
                </p>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Formatos compatibles: JPG, PNG, WebP en alta resolución. Directo desde tu cámara o galería.
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
              O pega el enlace directo de una imagen:
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
              placeholder="Tu nombre o seudónimo (ej. Mariana V.)"
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
              placeholder="Ej. Campus El Volador, Facultad de Minas Robledo, Los Bloques..."
              className="w-full px-4 py-3 rounded-2xl bg-neutral-900 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Breve descripción o anécdota
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cuenta los detalles del momento o equipo utilizado..."
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
            Al publicar, tu fotografía estará visible para toda la comunidad y participará en las votaciones y dinámicas activas.
          </p>

          <button
            type="submit"
            disabled={isSubmitting || isUploadingToDrive}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-base transition-all shadow-lg active:scale-95 cursor-pointer text-center disabled:opacity-50"
          >
            {isSubmitting || isUploadingToDrive ? 'Publicando...' : 'Publicar Fotografía'}
          </button>
        </div>
      </form>
    </div>
  );
};
