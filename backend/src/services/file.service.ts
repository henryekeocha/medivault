import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { AppError } from '../utils/appError.js';

export class FileService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      throw new AppError('Failed to create upload directory', 500);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    metadata: any
  ): Promise<{ fileId: string; encryptionKey: string }> {
    try {
      const fileId = randomBytes(16).toString('hex');
      const key = randomBytes(32);
      const iv = randomBytes(16);

      const cipher = createCipheriv(this.algorithm, key, iv);
      const encryptedData = Buffer.concat([
        cipher.update(file.buffer),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      // Create metadata file
      const metadataWithEncryption = {
        ...metadata,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };

      // Save encrypted file and metadata
      await Promise.all([
        fs.writeFile(
          path.join(this.uploadDir, `${fileId}.enc`),
          encryptedData
        ),
        fs.writeFile(
          path.join(this.uploadDir, `${fileId}.meta`),
          JSON.stringify(metadataWithEncryption)
        ),
      ]);

      return {
        fileId,
        encryptionKey: key.toString('hex'),
      };
    } catch (error) {
      throw new AppError('Failed to upload and encrypt file', 500);
    }
  }

  async downloadFile(
    fileId: string,
    encryptionKey: string
  ): Promise<{ data: Buffer; metadata: any }> {
    try {
      // Read encrypted file and metadata
      const [encryptedData, metadataStr] = await Promise.all([
        fs.readFile(path.join(this.uploadDir, `${fileId}.enc`)),
        fs.readFile(path.join(this.uploadDir, `${fileId}.meta`), 'utf-8'),
      ]);

      const metadata = JSON.parse(metadataStr);
      const key = Buffer.from(encryptionKey, 'hex');
      const iv = Buffer.from(metadata.iv, 'hex');
      const authTag = Buffer.from(metadata.authTag, 'hex');

      // Decrypt file
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      const decryptedData = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      return {
        data: decryptedData,
        metadata,
      };
    } catch (error) {
      throw new AppError('Failed to download and decrypt file', 500);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await Promise.all([
        fs.unlink(path.join(this.uploadDir, `${fileId}.enc`)),
        fs.unlink(path.join(this.uploadDir, `${fileId}.meta`)),
      ]);
    } catch (error) {
      throw new AppError('Failed to delete file', 500);
    }
  }
} 