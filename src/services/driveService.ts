import { DriveFolderInfo, DriveUploadResult } from '../types';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

export const FOLDER_NAME_DEFAULT = 'Fotografia Unalmed - Fotos del Campus';

/**
 * Searches for an existing public folder or creates a new one in the user's personal Google Drive.
 * Then grants "anyone: reader" permission so photos can be viewed by everyone.
 */
export async function getOrCreatePublicDriveFolder(
  accessToken: string,
  folderName: string = FOLDER_NAME_DEFAULT
): Promise<DriveFolderInfo> {
  const query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `${DRIVE_API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Error buscando carpeta en Drive: ${errText}`);
  }

  const searchData = await searchRes.json();
  let folderId = searchData.files?.[0]?.id;
  let webViewLink = searchData.files?.[0]?.webViewLink;

  if (!folderId) {
    // Create the folder
    const createRes = await fetch(`${DRIVE_API_URL}/files?fields=id,name,webViewLink`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Carpeta pública con las fotografías de la comunidad Unalmed',
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Error creando carpeta en Google Drive: ${errText}`);
    }

    const created = await createRes.json();
    folderId = created.id;
    webViewLink = created.webViewLink;
  }

  // Ensure public permissions ("anyone with the link can view")
  try {
    await fetch(`${DRIVE_API_URL}/files/${folderId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
        allowFileDiscovery: false,
      }),
    });
  } catch (err) {
    console.warn('Permiso público de carpeta:', err);
  }

  return {
    folderId,
    folderName,
    webViewLink,
    isPublic: true,
  };
}

/**
 * Uploads a photo file (blob/file) or base64 data to the specified Google Drive folder.
 * Makes the file publicly accessible ("anyone: reader").
 * Returns both direct CDN/view URLs and web links.
 */
export async function uploadPhotoToDrive(
  accessToken: string,
  folderId: string,
  fileOrBlob: Blob,
  fileName: string
): Promise<DriveUploadResult> {
  const metadata = {
    name: fileName,
    parents: [folderId],
    description: 'Fotografía subida a Fotografia Unalmed',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const mimeType = fileOrBlob.type || 'image/jpeg';
  const arrayBuffer = await fileOrBlob.arrayBuffer();

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}`;
  const mediaPartHeader = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

  const encoder = new TextEncoder();
  const metadataBytes = encoder.encode(metadataPart);
  const mediaHeaderBytes = encoder.encode(mediaPartHeader);
  const closeBytes = encoder.encode(closeDelimiter);

  const combinedBody = new Uint8Array(
    metadataBytes.byteLength +
      mediaHeaderBytes.byteLength +
      arrayBuffer.byteLength +
      closeBytes.byteLength
  );

  let offset = 0;
  combinedBody.set(metadataBytes, offset);
  offset += metadataBytes.byteLength;
  combinedBody.set(mediaHeaderBytes, offset);
  offset += mediaHeaderBytes.byteLength;
  combinedBody.set(new Uint8Array(arrayBuffer), offset);
  offset += arrayBuffer.byteLength;
  combinedBody.set(closeBytes, offset);

  // Multipart upload
  const uploadRes = await fetch(
    `${DRIVE_UPLOAD_URL}/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink,webContentLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: combinedBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Error al subir la fotografía a Google Drive: ${errText}`);
  }

  const uploadedFile = await uploadRes.json();
  const fileId = uploadedFile.id;

  // Make the file publicly readable by anyone
  try {
    await fetch(`${DRIVE_API_URL}/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (err) {
    console.warn('Permiso público de archivo:', err);
  }

  // Construct direct public viewing links
  // https://lh3.googleusercontent.com/d/{fileId}=s1600 is reliable for drive images when public
  // fallback: https://drive.google.com/uc?export=view&id={fileId}
  const directImageUrl = `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
  const viewUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

  return {
    fileId,
    fileName: uploadedFile.name,
    viewUrl,
    directImageUrl,
    webViewLink: uploadedFile.webViewLink,
  };
}

/**
 * Checks or ensures a file is public and returns a direct image link
 */
export function getDriveImagePublicUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
}
