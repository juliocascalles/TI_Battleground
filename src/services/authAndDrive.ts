import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { LOCAL_ASSETS, setDriveAssetUrls } from '../utils/driveAssetUrls';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google Drive.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro no login Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface SyncProgress {
  fileName: string;
  index: number;
  total: number;
  status: 'uploading' | 'permission' | 'done' | 'error';
}

export interface DriveFileInfo {
  fileName: string;
  fileId: string;
  driveUrl: string;
  webViewLink?: string;
}

export const uploadCardInfoFolderToDrive = async (
  token: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<DriveFileInfo[]> => {
  // 1. Get or create 'card_info' folder on Google Drive
  const searchFolderRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='card_info' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  let folderId = '';
  if (searchFolderRes.ok) {
    const searchData = await searchFolderRes.json();
    if (searchData.files && searchData.files.length > 0) {
      folderId = searchData.files[0].id;
    }
  }

  if (!folderId) {
    const createFolderRes = await fetch(`https://www.googleapis.com/drive/v3/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'card_info',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createFolderRes.ok) {
      const errText = await createFolderRes.text();
      throw new Error(`Erro ao criar pasta no Google Drive: ${errText}`);
    }

    const folderData = await createFolderRes.json();
    folderId = folderData.id;
  }

  const filesToUpload = Object.keys(LOCAL_ASSETS);
  const results: DriveFileInfo[] = [];
  const updatedUrlMapping: Record<string, string> = {};

  for (let i = 0; i < filesToUpload.length; i++) {
    const fileName = filesToUpload[i];
    const localPathOrContent = LOCAL_ASSETS[fileName];

    if (onProgress) {
      onProgress({ fileName, index: i + 1, total: filesToUpload.length, status: 'uploading' });
    }

    // Convert local asset to blob/data
    let fileBlob: Blob;
    let mimeType = 'text/plain';

    if (fileName.endsWith('.png')) {
      mimeType = 'image/png';
      const response = await fetch(localPathOrContent);
      fileBlob = await response.blob();
    } else if (fileName.endsWith('.svg')) {
      mimeType = 'image/svg+xml';
      const response = await fetch(localPathOrContent);
      fileBlob = await response.blob();
    } else if (fileName.endsWith('.json')) {
      mimeType = 'application/json';
      fileBlob = new Blob([localPathOrContent], { type: 'application/json' });
    } else {
      const response = await fetch(localPathOrContent);
      fileBlob = await response.blob();
    }

    // Upload using multipart
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', fileBlob);

    const uploadRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error(`Falha no upload de ${fileName}:`, errText);
      continue;
    }

    const fileData = await uploadRes.json();
    const fileId = fileData.id;

    if (onProgress) {
      onProgress({ fileName, index: i + 1, total: filesToUpload.length, status: 'permission' });
    }

    // Set permission to anyone reader
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });
    } catch (e) {
      console.warn('Permissão de compartilhamento falhou, utilizando link autenticado:', e);
    }

    // Direct embeddable image URL format for Google Drive
    const driveUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

    results.push({
      fileName,
      fileId,
      driveUrl,
      webViewLink: fileData.webViewLink,
    });

    updatedUrlMapping[fileName] = driveUrl;

    if (onProgress) {
      onProgress({ fileName, index: i + 1, total: filesToUpload.length, status: 'done' });
    }
  }

  // Update local URL mapping store
  setDriveAssetUrls(updatedUrlMapping);

  return results;
};
