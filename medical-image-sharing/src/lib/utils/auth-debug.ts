/**
 * Auth Debug Utility
 * 
 * This utility provides enhanced debugging capabilities for the authentication flow.
 * It helps in verifying that login, register, and logout functionality work properly.
 */

// Debug mode flag - set to true to enable verbose logging
let isDebugMode = process.env.NODE_ENV === 'development';

/**
 * Toggle debug mode on/off
 */
export const toggleAuthDebug = (enable?: boolean) => {
  isDebugMode = enable !== undefined ? enable : !isDebugMode;
  authDebug(`Auth debug mode ${isDebugMode ? 'enabled' : 'disabled'}`);
  return isDebugMode;
};

/**
 * Log authentication-related debug messages
 */
export const authDebug = (message: string, data?: any) => {
  if (!isDebugMode) return;
  
  console.log(`[Auth Debug] ${message}`);
  if (data) {
    console.log('Data:', data);
  }
};

/**
 * Log token information safely (only partial token)
 */
export const logToken = (token: string | null, label = 'Token') => {
  if (!isDebugMode) return;
  
  if (!token) {
    console.log(`[Auth Debug] ${label}: Not available`);
    return;
  }
  
  // Only show first 10 chars of token for security
  const partialToken = token.substring(0, 10) + '...';
  console.log(`[Auth Debug] ${label}: ${partialToken}`);
};

/**
 * Verify authentication state in localStorage
 */
export const verifyAuthState = () => {
  if (!isDebugMode) return null;
  
  // Check localStorage for tokens
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  
  console.group('[Auth Debug] Auth State Verification');
  logToken(token, 'Access Token');
  logToken(refreshToken, 'Refresh Token');
  console.log(`[Auth Debug] Is Authenticated: ${!!token}`);
  console.groupEnd();
  
  return {
    hasToken: !!token,
    hasRefreshToken: !!refreshToken,
    isAuthenticated: !!token
  };
};

/**
 * Log authentication event with timestamp
 */
export const logAuthEvent = (event: string, success = true, details?: any) => {
  if (!isDebugMode) return;
  
  const timestamp = new Date().toISOString();
  console.group(`[Auth Debug] Event: ${event} (${success ? 'SUCCESS' : 'FAILURE'})`);
  console.log(`[Auth Debug] Time: ${timestamp}`);
  
  if (details) {
    console.log('[Auth Debug] Details:', details);
  }
  
  console.groupEnd();
};

/**
 * Track login flow
 */
export const trackLoginFlow = (step: string, data?: any) => {
  if (!isDebugMode) return;
  
  console.log(`[Auth Debug] Login Flow - ${step}`);
  if (data) {
    console.log('Data:', data);
  }
};

/**
 * Track registration flow
 */
export const trackRegisterFlow = (step: string, data?: any) => {
  if (!isDebugMode) return;
  
  console.log(`[Auth Debug] Register Flow - ${step}`);
  if (data) {
    console.log('Data:', data);
  }
};

/**
 * Track logout flow
 */
export const trackLogoutFlow = (step: string, data?: any) => {
  if (!isDebugMode) return;
  
  console.log(`[Auth Debug] Logout Flow - ${step}`);
  if (data) {
    console.log('Data:', data);
  }
};

/**
 * Clear all auth-related storage
 */
export const clearAuthStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  
  if (isDebugMode) {
    console.log('[Auth Debug] Auth storage cleared');
  }
  
  return true;
};

export default {
  toggleAuthDebug,
  authDebug,
  logToken,
  verifyAuthState,
  logAuthEvent,
  trackLoginFlow,
  trackRegisterFlow,
  trackLogoutFlow,
  clearAuthStorage
}; 