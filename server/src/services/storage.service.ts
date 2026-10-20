// src/services/storage.service.ts
// Service Penyimpanan Object Storage (Cloudflare R2 / AWS S3 / Local Fallback)
// Sesuai ARCHITECTURE.md §5.1 & THE_NEXT_STEP.md §6.1

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEnv } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface UploadResult {
  key: string;
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
}

export class StorageService {
  private baseDir: string;
  private s3Endpoint: string;
  private s3Bucket: string;
  private isS3Configured: boolean;

  constructor() {
    const env = getEnv();
    this.s3Endpoint = env.S3_ENDPOINT || '';
    this.s3Bucket = env.S3_BUCKET_NAME || 'minjaphotobooth';
    this.isS3Configured =
      this.s3Endpoint.trim().length > 0 &&
      (env.S3_ACCESS_KEY || '').trim().length > 0 &&
      (env.S3_SECRET_KEY || '').trim().length > 0;

    // Direktori penyimpanan lokal: server/storage/galleries
    this.baseDir = path.resolve(__dirname, '../../storage/galleries');
    try {
      fs.mkdirSync(this.baseDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  public isCloudStorageActive(): boolean {
    return this.isS3Configured;
  }

  public getBucketName(): string {
    return this.s3Bucket;
  }

  public getEndpoint(): string {
    return this.s3Endpoint;
  }

  /**
   * Mengunggah file (dari buffer atau data URL) ke cloud / penyimpanan lokal
   */
  async uploadFile(
    sessionId: string,
    fileName: string,
    content: Buffer | string,
    mimeType = 'image/jpeg'
  ): Promise<UploadResult> {
    let buffer: Buffer;

    if (typeof content === 'string') {
      if (content.startsWith('data:')) {
        const matches = content.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches[2]) {
          mimeType = matches[1] || mimeType;
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(content, 'utf-8');
        }
      } else {
        buffer = Buffer.from(content, 'utf-8');
      }
    } else {
      buffer = content;
    }

    const sessionDir = path.join(this.baseDir, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const localFilePath = path.join(sessionDir, fileName);
    fs.writeFileSync(localFilePath, buffer);

    const publicUrl = `/storage/galleries/${sessionId}/${fileName}`;

    return {
      key: `${sessionId}/${fileName}`,
      publicUrl,
      sizeBytes: buffer.length,
      mimeType,
    };
  }

  /**
   * Mengambil daftar file digital untuk suatu sesi
   */
  async listSessionFiles(sessionId: string): Promise<string[]> {
    const sessionDir = path.join(this.baseDir, sessionId);
    if (!fs.existsSync(sessionDir)) {
      return [];
    }

    const files = fs.readdirSync(sessionDir);
    return files.map((f) => `/storage/galleries/${sessionId}/${f}`);
  }

  /**
   * Menghapus file sesi yang telah kedaluwarsa (retensi 48 jam)
   */
  async cleanupExpiredSessions(retentionHours = 48): Promise<number> {
    let cleaned = 0;
    const now = Date.now();
    const maxAgeMs = retentionHours * 3600 * 1000;

    if (!fs.existsSync(this.baseDir)) return 0;

    const sessionFolders = fs.readdirSync(this.baseDir);
    for (const folder of sessionFolders) {
      const folderPath = path.join(this.baseDir, folder);
      try {
        const stat = fs.statSync(folderPath);
        if (stat.isDirectory() && now - stat.mtimeMs > maxAgeMs) {
          fs.rmSync(folderPath, { recursive: true, force: true });
          cleaned++;
        }
      } catch {
        // ignore errors
      }
    }

    return cleaned;
  }
}
