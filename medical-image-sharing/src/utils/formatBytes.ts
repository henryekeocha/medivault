/**
 * Formats a byte value into a human-readable string with appropriate units (B, KB, MB, GB, TB)
 * @param bytes - The byte value to format
 * @param decimals - Number of decimal places to include (default: 2)
 * @returns A formatted string with appropriate units
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  if (!bytes || isNaN(bytes)) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Formats a byte value into a short string with appropriate units (B, K, M, G, T)
 * Useful for space-constrained UI elements
 * @param bytes - The byte value to format
 * @param decimals - Number of decimal places to include (default: 1)
 * @returns A formatted short string with appropriate units
 */
export function formatBytesShort(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0B';
  if (!bytes || isNaN(bytes)) return '0B';
  
  const k = 1024;
  const sizes = ['B', 'K', 'M', 'G', 'T', 'P'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))}${sizes[i]}`;
} 