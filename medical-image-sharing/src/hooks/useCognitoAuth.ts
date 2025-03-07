import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// Constants for token management
const ACCESS_TOKEN_KEY = 'cognitoAccessToken';
const ID_TOKEN_KEY = 'cognitoIdToken';
const REFRESH_TOKEN_KEY = 'cognitoRefreshToken';

// Add token expiry tracking
interface TokenInfo {
  token: string;
  expiresAt: number; // timestamp in milliseconds
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  error: Error | null;
  sessionExpiry: number | null; // Time left in seconds
}

interface UseCognitoAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, attributes: Record<string, string>) => Promise<any>;
  confirmSignUp: (email: string, code: string) => Promise<any>;
  resendConfirmationCode: (email: string) => Promise<any>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<any>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<any>;
  getSession: () => Promise<any>;
  updateUserAttributes: (attributes: Record<string, string>) => Promise<any>;
  refreshSession: () => Promise<boolean>;
  extendSession: () => Promise<boolean>; // New method to explicitly extend the session
}

/**
 * Parse a JWT token and extract the expiration time
 * @param token JWT token
 * @returns Expiration timestamp in milliseconds or null if invalid
 */
function getTokenExpiration(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp) {
      // Convert seconds to milliseconds
      return payload.exp * 1000;
    }
  } catch (e) {
    console.error('Error parsing token:', e);
  }
  return null;
}

/**
 * Hook for using Cognito authentication
 * @returns Authentication state and methods
 */
export function useCognitoAuth(): UseCognitoAuthReturn {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
    sessionExpiry: null,
  });

  // Store token info with expiration
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  
  // Ref to track if a refresh is in progress to prevent multiple simultaneous refreshes
  const isRefreshing = useRef(false);
  
  // Track refresh intervals
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionExpiryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Store authentication tokens securely
   */
  const storeTokens = useCallback((accessToken?: string, idToken?: string, refreshToken?: string) => {
    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      
      // Set token info with expiration
      const expiresAt = getTokenExpiration(accessToken);
      if (expiresAt) {
        setTokenInfo({
          token: accessToken,
          expiresAt
        });
        
        // Update session expiry time
        setState(prev => ({
          ...prev,
          sessionExpiry: Math.floor((expiresAt - Date.now()) / 1000)
        }));
      }
    }
    
    if (idToken) {
      localStorage.setItem(ID_TOKEN_KEY, idToken);
    }
    
    if (refreshToken) {
      // Store refresh token in a HttpOnly cookie via API call
      axios.post('/api/auth/cognito/set-refresh-token', { refreshToken });
      
      // Also store locally as fallback
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }, []);

  /**
   * Clear all stored tokens
   */
  const clearTokens = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setTokenInfo(null);
    
    // Clear the refresh token cookie
    axios.post('/api/auth/cognito/clear-refresh-token');
    
    // Clear intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (sessionExpiryIntervalRef.current) {
      clearInterval(sessionExpiryIntervalRef.current);
      sessionExpiryIntervalRef.current = null;
    }
    
    // Reset session expiry
    setState(prev => ({
      ...prev,
      sessionExpiry: null
    }));
  }, []);

  /**
   * Update session expiry countdown
   */
  const updateSessionExpiry = useCallback(() => {
    if (tokenInfo?.expiresAt) {
      const expiresIn = Math.floor((tokenInfo.expiresAt - Date.now()) / 1000);
      
      // Update the session expiry time
      setState(prev => ({
        ...prev,
        sessionExpiry: expiresIn > 0 ? expiresIn : 0
      }));
      
      // If less than 30 seconds left, try to refresh
      if (expiresIn < 30) {
        refreshSession();
      }
    }
  }, [tokenInfo]);

  /**
   * Refresh the session if token is expired or about to expire
   */
  const refreshSession = useCallback(async () => {
    // If already refreshing, don't start another refresh
    if (isRefreshing.current) {
      return true;
    }
    
    try {
      isRefreshing.current = true;
      
      // If no token or not expired/about to expire, no need to refresh
      if (!tokenInfo || (tokenInfo.expiresAt > Date.now() + 5 * 60 * 1000)) {
        isRefreshing.current = false;
        return true; // No refresh needed, token is valid for more than 5 minutes
      }
      
      console.log('Refreshing session token...');
      
      // Call the session endpoint which handles token refresh
      const response = await axios.get('/api/auth/cognito/session');
      
      if (response.data.accessToken) {
        storeTokens(response.data.accessToken, response.data.idToken, response.data.refreshToken);
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: response.data.user,
        }));
        isRefreshing.current = false;
        return true;
      }
      
      // If no new token was received, session is invalid
      clearTokens();
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        sessionExpiry: null,
      });
      isRefreshing.current = false;
      return false;
    } catch (error) {
      console.error('Error refreshing session:', error);
      
      // Check if the error is due to an invalid or expired refresh token
      if (axios.isAxiosError(error) && 
          (error.response?.status === 401 || error.response?.status === 403)) {
        // Clear tokens and sign out the user
        clearTokens();
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: error as Error,
          sessionExpiry: null,
        });
      }
      
      isRefreshing.current = false;
      return false;
    }
  }, [tokenInfo, storeTokens, clearTokens]);

  /**
   * Explicitly extend the session
   * This can be called when user activity is detected
   */
  const extendSession = useCallback(async () => {
    // Only extend if the token will expire in less than 10 minutes
    if (tokenInfo && tokenInfo.expiresAt < Date.now() + 10 * 60 * 1000) {
      return await refreshSession();
    }
    return true;
  }, [tokenInfo, refreshSession]);

  /**
   * Get the current user session
   */
  const getSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Call the API to get the current session
      const response = await axios.get('/api/auth/cognito/session');
      
      if (response.data.isAuthenticated && response.data.user) {
        // Store the refreshed token if provided
        if (response.data.accessToken) {
          storeTokens(
            response.data.accessToken, 
            response.data.idToken, 
            response.data.refreshToken
          );
        }
        
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: response.data.user,
          error: null,
          sessionExpiry: response.data.expiresIn || null,
        });
        return response.data;
      } else {
        clearTokens();
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
          sessionExpiry: null,
        });
        return null;
      }
    } catch (error) {
      clearTokens();
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error as Error,
        sessionExpiry: null,
      });
      return null;
    }
  }, [storeTokens, clearTokens]);

  // Check for an existing session on mount
  useEffect(() => {
    getSession();
    
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (sessionExpiryIntervalRef.current) {
        clearInterval(sessionExpiryIntervalRef.current);
      }
    };
  }, [getSession]);

  // Set up token refresh interval when authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      // Clear any existing intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Set up interval to check token every minute
      intervalRef.current = setInterval(async () => {
        await refreshSession();
      }, 60 * 1000);
      
      // Set up session expiry countdown
      if (sessionExpiryIntervalRef.current) {
        clearInterval(sessionExpiryIntervalRef.current);
      }
      
      sessionExpiryIntervalRef.current = setInterval(() => {
        updateSessionExpiry();
      }, 1000);
    }
    
    // Clean up intervals on unmount or when not authenticated
    return () => {
      if (!state.isAuthenticated) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (sessionExpiryIntervalRef.current) {
          clearInterval(sessionExpiryIntervalRef.current);
          sessionExpiryIntervalRef.current = null;
        }
      }
    };
  }, [state.isAuthenticated, refreshSession, updateSessionExpiry]);

  /**
   * Sign in with email and password
   * @param email User email
   * @param password User password
   */
  const signIn = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Call the API to sign in
      const response = await axios.post('/api/auth/cognito/signin', {
        email,
        password
      });
      
      // Store tokens in localStorage
      if (response.data.accessToken) {
        localStorage.setItem('cognitoAccessToken', response.data.accessToken);
      }
      
      // Update state with user info
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: response.data.user,
        error: null,
        sessionExpiry: response.data.expiresIn || null,
      });
      
      return response.data;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error as Error 
      }));
      throw error;
    }
  };

  /**
   * Sign up a new user
   * @param email User email
   * @param password User password
   * @param attributes Additional user attributes
   */
  const signUp = async (
    email: string,
    password: string,
    attributes: Record<string, string> = {}
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Call the API to sign up
      const response = await axios.post('/api/auth/cognito/signup', {
        email,
        password,
        attributes
      });
      
      setState(prev => ({ ...prev, isLoading: false }));
      return response.data;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error as Error 
      }));
      throw error;
    }
  };

  /**
   * Confirm user sign up with verification code
   * @param email User email
   * @param code Verification code
   */
  const confirmSignUp = async (email: string, code: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Call the API to confirm sign up
      const response = await axios.post('/api/auth/cognito/confirm-signup', {
        email,
        code
      });
      
      setState(prev => ({ ...prev, isLoading: false }));
      return response.data;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error as Error 
      }));
      throw error;
    }
  };

  /**
   * Resend confirmation code
   * @param email User email
   */
  const resendConfirmationCode = async (email: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Call the API to resend confirmation code
      const response = await axios.post('/api/auth/cognito/resend-code', {
        email
      });
      
      setState(prev => ({ ...prev, isLoading: false }));
      return response.data;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error as Error 
      }));
      throw error;
    }
  };

  /**
   * Sign out the current user
   */
  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get the access token from localStorage
      const accessToken = localStorage.getItem('cognitoAccessToken');
      
      if (accessToken) {
        // Call the API to sign out
        await axios.post('/api/auth/cognito/signout', {}, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        // Remove tokens from localStorage
        localStorage.removeItem('cognitoAccessToken');
      }
      
      // Update state
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        sessionExpiry: null,
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error as Error 
      }));
      
      // Even if the API call fails, clear local state
      localStorage.removeItem('cognitoAccessToken');
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error as Error,
        sessionExpiry: null,
      });
    }
  };

  /**
   * Initiate forgot password flow
   * @param email User email
   */
  const forgotPassword = async (email: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Call the API to initiate forgot password
      const response = await axios.post('/api/auth/cognito/forgot-password', {
        email
      });
      
      setState(prev => ({ ...prev, isLoading: false }));
      return response.data;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error as Error 
      }));
      throw error;
    }
  };

  /**
   * Confirm new password with verification code
   * @param email User email
   * @param code Verification code
   * @param newPassword New password
   */
  const confirmForgotPassword = async (
    email: string,
    code: string,
    newPassword: string
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Call the API to confirm password reset
      const response = await axios.post('/api/auth/cognito/confirm-forgot-password', {
        email,
        code,
        newPassword
      });
      
      setState(prev => ({ ...prev, isLoading: false }));
      return response.data;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error as Error 
      }));
      throw error;
    }
  };

  /**
   * Update user attributes
   * @param attributes User attributes to update
   */
  const updateUserAttributes = async (attributes: Record<string, string>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get the access token from localStorage
      const accessToken = localStorage.getItem('cognitoAccessToken');
      
      if (!accessToken) {
        throw new Error('Not authenticated');
      }
      
      // Call the API to update user attributes
      const response = await axios.put('/api/auth/cognito/user', {
        attributes
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      // Update the user in state
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        user: response.data.user
      }));
      
      return response.data;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error as Error 
      }));
      throw error;
    }
  };

  return {
    ...state,
    signIn,
    signUp,
    confirmSignUp,
    resendConfirmationCode,
    signOut,
    forgotPassword,
    confirmForgotPassword,
    getSession,
    updateUserAttributes,
    refreshSession,
    extendSession,
  };
} 