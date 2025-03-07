/**
 * String utility functions
 */
/**
 * Cleans an S3 key by removing any leading slashes and ensuring proper formatting
 * @param key The S3 key to clean
 * @returns The cleaned S3 key
 */
export function cleanS3Key(key) {
    // Remove leading slashes
    let cleanedKey = key.startsWith('/') ? key.substring(1) : key;
    // Replace multiple slashes with a single slash
    cleanedKey = cleanedKey.replace(/\/+/g, '/');
    // Remove trailing slashes
    cleanedKey = cleanedKey.endsWith('/') ? cleanedKey.slice(0, -1) : cleanedKey;
    return cleanedKey;
}
/**
 * Generates a random string of specified length
 * @param length The length of the random string
 * @returns A random string
 */
export function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
/**
 * Truncates a string to a specified length and adds an ellipsis if truncated
 * @param str The string to truncate
 * @param maxLength The maximum length of the string
 * @returns The truncated string
 */
export function truncateString(str, maxLength) {
    if (str.length <= maxLength)
        return str;
    return str.substring(0, maxLength) + '...';
}
//# sourceMappingURL=string-utils.js.map