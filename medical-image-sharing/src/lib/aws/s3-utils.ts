import axios from 'axios';

/**
 * Get a presigned URL for downloading a file from S3
 * @param key - The S3 object key
 * @param operation - The operation to perform (default: 'getObject')
 * @param expiresIn - The expiration time in seconds (default: 3600)
 * @returns The presigned URL
 */
export async function getPresignedUrl(
  key: string,
  operation: 'getObject' | 'putObject' = 'getObject',
  expiresIn: number = 3600
): Promise<string> {
  try {
    const response = await axios.get('/api/storage/presigned-url', {
      params: { key, operation, expiresIn }
    });
    return response.data.url;
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    throw new Error('Failed to generate presigned URL');
  }
}

/**
 * Get a presigned URL for uploading a file to S3
 * @param key - The S3 object key
 * @param contentType - The content type of the file
 * @param expiresIn - The expiration time in seconds (default: 3600)
 * @returns The presigned URL
 */
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const response = await axios.get('/api/storage/upload-url', {
      params: { key, contentType, expiresIn }
    });
    return response.data.url;
  } catch (error) {
    console.error('Error getting upload URL:', error);
    throw new Error('Failed to generate upload URL');
  }
}

/**
 * Upload a file to S3 using a presigned URL
 * @param file - The file to upload
 * @param url - The presigned URL
 * @param contentType - The content type of the file
 * @returns True if successful
 */
export async function uploadWithPresignedUrl(
  file: File | Blob,
  url: string,
  contentType: string
): Promise<boolean> {
  try {
    await axios.put(url, file, {
      headers: {
        'Content-Type': contentType
      }
    });
    return true;
  } catch (error) {
    console.error('Error uploading file with presigned URL:', error);
    return false;
  }
}

/**
 * Delete a file from S3
 * @param key - The S3 object key
 * @returns True if successful
 */
export async function deleteFile(key: string): Promise<boolean> {
  try {
    await axios.delete('/api/storage/file', {
      params: { key }
    });
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
} 