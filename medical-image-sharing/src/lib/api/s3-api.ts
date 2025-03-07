import axios from 'axios';

/**
 * Get a presigned URL for file upload to S3
 * @param bucket S3 bucket name
 * @param key Object key (file path)
 * @param contentType MIME type of the file
 * @returns Presigned URL and other upload details
 */
export async function getPresignedUploadUrl(bucket: string, key: string, contentType: string) {
  const response = await axios.get(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/files/upload-url`,
    {
      params: { bucket, key, contentType }
    }
  );
  return response.data;
}

/**
 * Get a presigned URL for downloading a file from S3
 * @param bucket S3 bucket name
 * @param key Object key (file path)
 * @param expires Expiration time in seconds (default: 3600)
 * @returns Presigned URL for downloading
 */
export async function getPresignedDownloadUrl(bucket: string, key: string, expires: number = 3600) {
  const response = await axios.get(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/files/download-url`,
    {
      params: { bucket, key, expires }
    }
  );
  return response.data;
}

/**
 * Upload a file directly to S3 using a presigned URL
 * @param presignedUrl The presigned URL for uploading
 * @param file The file to upload
 * @param contentType MIME type of the file
 * @returns Response from the S3 upload
 */
export async function uploadFileWithPresignedUrl(presignedUrl: string, file: File, contentType: string) {
  return axios.put(presignedUrl, file, {
    headers: {
      'Content-Type': contentType
    }
  });
}

/**
 * Delete a file from S3 via the backend API
 * @param bucket S3 bucket name
 * @param key Object key (file path)
 * @returns Response from the delete operation
 */
export async function deleteFile(bucket: string, key: string) {
  const response = await axios.delete(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/files`,
    {
      params: { bucket, key }
    }
  );
  return response.data;
}

/**
 * Generate a unique filename with timestamp and random string
 * @param originalFilename Original filename
 * @returns Unique filename
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 10);
  const extension = originalFilename.split('.').pop();
  
  return `${timestamp}-${randomString}.${extension}`;
} 