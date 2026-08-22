/**
 * @file google-drive-service.ts
 * Real Client-Side Google Drive v3 REST API Integration
 * Authenticated via OAuth Bearer token from Firebase Auth
 */

import { getAccessToken } from '../../lib/google-auth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
}

export interface DriveQuotaInfo {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
}

const DEFAULT_APP_FOLDER_NAME = 'Adeus Multa — Recursos & Documentos';

class GoogleDriveService {
  private async getAuthHeader(): Promise<HeadersInit> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Usuário não autenticado no Google Drive. Faça login com o Google.');
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Search or list files in Google Drive
   */
  public async listFiles(folderId?: string, searchTerm?: string): Promise<DriveFileItem[]> {
    const token = await getAccessToken();
    if (!token) throw new Error('Não autenticado com o Google');

    let query = "trashed = false";
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }
    if (searchTerm && searchTerm.trim()) {
      query += ` and name contains '${searchTerm.replace(/'/g, "\\'")}'`;
    }

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.append('q', query);
    url.searchParams.append('fields', 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents)');
    url.searchParams.append('orderBy', 'modifiedTime desc');
    url.searchParams.append('pageSize', '30');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erro ${res.status} ao consultar Google Drive`);
    }

    const data = await res.json();
    return data.files || [];
  }

  /**
   * Find or create standard application folder
   */
  public async findOrCreateAppFolder(folderName: string = DEFAULT_APP_FOLDER_NAME): Promise<DriveFileItem> {
    const token = await getAccessToken();
    if (!token) throw new Error('Não autenticado com o Google');

    // 1. Search if folder already exists
    const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
    searchUrl.searchParams.append(
      'q',
      `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`
    );
    searchUrl.searchParams.append('fields', 'files(id, name, mimeType, webViewLink)');

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0];
      }
    }

    // 2. Create folder if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Pasta oficial de minutas, recursos de trânsito e anexos gerados pelo Adeus Multa',
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao criar pasta no Google Drive');
    }

    return createRes.json();
  }

  /**
   * Upload text or file content to Google Drive via multipart upload
   */
  public async uploadTextFile(
    fileName: string,
    content: string,
    folderId?: string,
    mimeType: string = 'text/plain'
  ): Promise<DriveFileItem> {
    const token = await getAccessToken();
    if (!token) throw new Error('Não autenticado com o Google');

    const metadata: any = {
      name: fileName,
      mimeType,
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
      content +
      closeDelimiter;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,size,createdTime', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao fazer upload para o Google Drive');
    }

    return res.json();
  }

  /**
   * Upload binary/blob (e.g. PDF, Image Scan) to Google Drive
   */
  public async uploadBlob(
    fileName: string,
    blob: Blob,
    folderId?: string
  ): Promise<DriveFileItem> {
    const token = await getAccessToken();
    if (!token) throw new Error('Não autenticado com o Google');

    const metadata: any = {
      name: fileName,
      mimeType: blob.type || 'application/pdf',
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // Convert blob to base64 or ArrayBuffer for multipart
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Build binary multipart
    const metaBytes = new TextEncoder().encode(
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${blob.type || 'application/octet-stream'}\r\n\r\n`
    );
    const endBytes = new TextEncoder().encode(closeDelimiter);

    const merged = new Uint8Array(metaBytes.length + bytes.length + endBytes.length);
    merged.set(metaBytes, 0);
    merged.set(bytes, metaBytes.length);
    merged.set(endBytes, metaBytes.length + bytes.length);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,size,createdTime', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: merged,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao fazer upload do documento');
    }

    return res.json();
  }

  /**
   * Delete file from Google Drive
   */
  public async deleteFile(fileId: string): Promise<boolean> {
    const token = await getAccessToken();
    if (!token) throw new Error('Não autenticado com o Google');

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao excluir arquivo do Google Drive');
    }

    return true;
  }

  /**
   * Get Drive user info & storage quota
   */
  public async getAbout(): Promise<{ user: any; storageQuota: DriveQuotaInfo }> {
    const token = await getAccessToken();
    if (!token) throw new Error('Não autenticado com o Google');

    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao obter dados do Google Drive');
    }

    return res.json();
  }
}

export const googleDriveService = new GoogleDriveService();
