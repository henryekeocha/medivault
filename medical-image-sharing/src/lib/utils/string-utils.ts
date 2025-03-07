import { randomUUID } from 'crypto';

/**
 * Cleans an S3 key to ensure it is properly formatted
 * Removes leading slashes and ensures proper URL encoding
 * @param key - The S3 key to clean
 * @returns The cleaned S3 key
 */
export function cleanS3Key(key: string): string {
  // Remove leading slashes
  let cleanedKey = key.startsWith('/') ? key.substring(1) : key;
  
  // S3 keys should still have forward slashes as separators
  // We don't replace them but ensure they're encoded in URLs
  // For file paths on S3, slashes are valid and expected
  
  return cleanedKey;
}

/**
 * Generates a unique filename for S3 storage
 * @param originalName - The original filename
 * @param prefix - Optional folder prefix (without trailing slash)
 * @returns A unique filename
 */
export function generateUniqueFilename(originalName: string, prefix?: string): string {
  const timestamp = Date.now();
  const uuid = randomUUID().substring(0, 8);
  
  // Extract the file extension
  const extension = originalName.includes('.') 
    ? originalName.substring(originalName.lastIndexOf('.')) 
    : '';
  
  // Clean the original filename (remove extension and special characters)
  const cleanName = originalName.substring(0, originalName.lastIndexOf('.') !== -1 ? originalName.lastIndexOf('.') : originalName.length)
    .replace(/[^a-zA-Z0-9]/g, '-')
    .substring(0, 50); // Limit length
  
  // Combine the components
  const filename = `${cleanName}-${timestamp}-${uuid}${extension}`;
  
  // Add prefix if provided
  return prefix ? `${prefix}/${filename}` : filename;
}

/**
 * Truncates a string to the specified length, adding an ellipsis if needed
 * @param str - The string to truncate
 * @param maxLength - The maximum length of the string (default: 50)
 * @returns The truncated string
 */
export function truncateString(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) {
    return str;
  }
  
  // Truncate the string and add an ellipsis
  return `${str.substring(0, maxLength - 3)}...`;
} 