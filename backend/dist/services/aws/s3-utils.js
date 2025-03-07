import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3ServiceException } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { cleanS3Key } from '../../utils/string-utils.js';
import { awsConfig, s3Client } from './aws-config.js';
/**
 * Uploads a file to S3
 * @param file - The file to upload (Buffer, Blob, or ReadableStream)
 * @param key - The S3 object key
 * @param contentType - The content type of the file
 * @returns The S3 location of the uploaded file
 */
export async function uploadToS3(file, key, contentType) {
    const cleanKey = cleanS3Key(key);
    try {
        // Use multipart upload for larger files
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: awsConfig.s3.bucket,
                Key: cleanKey,
                Body: file,
                ContentType: contentType,
            },
        });
        await upload.done();
        return `s3://${awsConfig.s3.bucket}/${cleanKey}`;
    }
    catch (error) {
        console.error('Error uploading to S3:', error);
        throw error;
    }
}
/**
 * Generates a presigned URL to access an S3 object
 * @param key - The S3 object key
 * @param expiresIn - The number of seconds until the URL expires (default: 3600)
 * @returns The presigned URL
 */
export async function getPresignedUrl(key, expiresIn = 3600) {
    const cleanKey = cleanS3Key(key);
    try {
        const command = new GetObjectCommand({
            Bucket: awsConfig.s3.bucket,
            Key: cleanKey,
        });
        return await getSignedUrl(s3Client, command, { expiresIn });
    }
    catch (error) {
        console.error('Error generating presigned URL:', error);
        throw error;
    }
}
/**
 * Generates a presigned URL for uploading to S3
 * @param key - The S3 object key to create
 * @param contentType - The content type of the file
 * @param expiresIn - The number of seconds until the URL expires (default: 3600)
 * @returns The presigned upload URL
 */
export async function getPresignedUploadUrl(key, contentType, expiresIn = 3600) {
    const cleanKey = cleanS3Key(key);
    try {
        const command = new PutObjectCommand({
            Bucket: awsConfig.s3.bucket,
            Key: cleanKey,
            ContentType: contentType,
        });
        return await getSignedUrl(s3Client, command, { expiresIn });
    }
    catch (error) {
        console.error('Error generating presigned upload URL:', error);
        throw error;
    }
}
/**
 * Deletes an object from S3
 * @param key - The S3 object key to delete
 */
export async function deleteFromS3(key) {
    const cleanKey = cleanS3Key(key);
    try {
        const command = new DeleteObjectCommand({
            Bucket: awsConfig.s3.bucket,
            Key: cleanKey,
        });
        await s3Client.send(command);
    }
    catch (error) {
        console.error('Error deleting from S3:', error);
        if (error instanceof S3ServiceException && error.name === 'NoSuchKey') {
            // If object doesn't exist, consider delete successful
            console.log(`Object ${cleanKey} already deleted or doesn't exist`);
            return;
        }
        throw error;
    }
}
//# sourceMappingURL=s3-utils.js.map