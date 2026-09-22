/**
 * Optimizes and compresses an image file before upload or sync.
 * Prevents localStorage QuotaExceededError and remote payload size limits
 * (Google Apps Script, Vercel KV, Vercel Serverless Function 4.5MB limits).
 */
export async function compressImageFile(
  file: File | Blob,
  maxDimension = 1600,
  quality = 0.82
): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen.'));

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar canvas para compresión.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to web-standard high quality JPEG
        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ dataUrl, blob });
            } else {
              // Fallback: convert dataURL back to blob if toBlob fails
              fetch(dataUrl)
                .then((r) => r.blob())
                .then((b) => resolve({ dataUrl, blob: b }))
                .catch(() => resolve({ dataUrl, blob: file }));
            }
          },
          mimeType,
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
