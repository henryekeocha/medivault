'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { UserResponse, LoginRequest, RegisterRequest, ApiResponse, TokenValidationResponse } from '@/lib/api/types';
import { Role } from '@prisma/client';
import jwt_decode from 'jwt-decode';
import { 
  authDebug, 
  logToken, 
  logAuthEvent, 
  trackLoginFlow, 
  trackRegisterFlow,
  trackLogoutFlow,
  verifyAuthState
} from '@/lib/utils/auth-debug';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/social-callback'
];

// Define route mappings by role
const ROLE_DEFAULT_ROUTES: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  PROVIDER: '/provider/dashboard',
  PATIENT: '/patient/dashboard',
};

// Define the auth state type
interface AuthState {
  user: UserResponse | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Define action types
type AuthAction =
  | { type: 'SET_USER'; payload: UserResponse | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' };

// Reducer function for auth state
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: RegisterRequest) => Promise<boolean>;
  checkAuth: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: (token: string) => boolean;
  getTimeUntilExpiration: (token: string) => number;
  resetActivityTimer: () => void;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  register: async () => false,
  checkAuth: async () => false,
  refreshToken: async () => false,
  isTokenExpired: () => true,
  getTimeUntilExpiration: () => 0,
  resetActivityTimer: () => {}
});

function useDelayedRouter() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
    setIsReady(true);
  }, [router]);

  const navigate = useCallback((path: string) => {
    if (isReady && routerRef.current) {
      routerRef.current.push(path as any);
    }
  }, [isReady]);

  return { navigate, isReady };
}

// Constants for authentication configuration
const AUTH_CONFIG = {
  TOKEN_REFRESH_INTERVAL: 10 * 60 * 1000, // 10 minutes
  SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour
  LOGIN_ATTEMPTS_MAX: 5,
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  TOKEN_EXPIRY_BUFFER: 5 * 60, // 5 minutes buffer before expiration (in seconds)
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize with useReducer instead of separate useState calls
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  });

  // Keep these for backward compatibility
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginLocked, setLoginLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState<NodeJS.Timeout | null>(null);
  const { navigate, isReady } = useDelayedRouter();
  const pathname = usePathname();
  const initRef = useRef(false);
  const checkingAuth = useRef(false);
  const tokenRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const appReady = useRef(false);

  // Forward declaration of functions to avoid circular dependencies
  const logoutRef = useRef<() => void>(() => {});
  
  // Sync state.user with user
  useEffect(() => {
    if (state.user !== user) {
      setUser(state.user);
    }
  }, [state.user]);

  // Sync user with state.user
  useEffect(() => {
    if (user !== state.user) {
      dispatch({ type: 'SET_USER', payload: user });
    }
  }, [user]);

  // Sync state.loading with loading
  useEffect(() => {
    if (state.loading !== loading) {
      dispatch({ type: 'SET_LOADING', payload: loading });
    }
  }, [loading]);

  // Sync loading with state.loading
  useEffect(() => {
    if (loading !== state.loading) {
      setLoading(state.loading);
    }
  }, [state.loading]);

  // Sync state.error with error
  useEffect(() => {
    if (state.error !== error) {
      dispatch({ type: 'SET_ERROR', payload: error });
    }
  }, [error]);

  // Sync error with state.error
  useEffect(() => {
    if (error !== state.error) {
      setError(state.error);
    }
  }, [state.error]);

  // Track user activity to prevent timeout during active usage
  useEffect(() => {
    if (!user) return;

    const updateLastActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Reset the activity timestamp on user interactions
    window.addEventListener('mousedown', updateLastActivity);
    window.addEventListener('keydown', updateLastActivity);
    window.addEventListener('touchstart', updateLastActivity);
    window.addEventListener('scroll', updateLastActivity);

    return () => {
      window.removeEventListener('mousedown', updateLastActivity);
      window.removeEventListener('keydown', updateLastActivity);
      window.removeEventListener('touchstart', updateLastActivity);
      window.removeEventListener('scroll', updateLastActivity);
    };
  }, [user]);

  // Setup session timeout checking
  useEffect(() => {
    if (!user) return;

    // Check for session timeout every minute
    const checkSessionTimeout = () => {
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - lastActivityRef.current;

      // Log out if inactive for too long
      if (timeSinceLastActivity > AUTH_CONFIG.SESSION_TIMEOUT) {
        console.log('Session timeout due to inactivity');
        logoutRef.current();
      }
    };

    const intervalId = setInterval(checkSessionTimeout, 60 * 1000); // Check every minute
    sessionTimeoutRef.current = intervalId;

    return () => {
      if (sessionTimeoutRef.current) {
        clearInterval(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
    };
  }, [user]);

  // Helper function to get the default route for a user based on their role
  const getDefaultRouteForUser = (role: string): string => {
    switch (role.toLowerCase()) {
      case 'admin':
        return '/admin/dashboard';
      case 'provider':
        return '/provider/dashboard';
      case 'patient':
        return '/patient/dashboard';
      default:
        return '/dashboard';
    }
  };

  // Function to check if token is expired
  const isTokenExpired = useCallback((token: string): boolean => {
    if (!token) return true;
    
    try {
      const decoded = jwt_decode<{ exp: number }>(token);
      if (!decoded.exp) return true;
      
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp <= now;
    } catch (error) {
      console.error('[Auth] Error checking token expiration:', error);
      return true;
    }
  }, []);
  
  const isTokenExpiringSoon = useCallback((token: string): boolean => {
    if (!token) return true;
    
    try {
      const decoded = jwt_decode<{ exp: number }>(token);
      if (!decoded.exp) return true;
      
      const now = Math.floor(Date.now() / 1000);
      // Check if token will expire in the next 5 minutes
      return decoded.exp <= (now + AUTH_CONFIG.TOKEN_EXPIRY_BUFFER);
    } catch (error) {
      console.error('[Auth] Error checking token expiration:', error);
      return true;
    }
  }, []);

  // Function to get time until token expiration in milliseconds
  const getTimeUntilExpiration = useCallback((token: string): number => {
    if (!token) return 0;
    
    try {
      const decoded = jwt_decode<{ exp: number }>(token);
      if (!decoded.exp) return 0;
      
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = decoded.exp - now;
      
      return Math.max(0, timeLeft);
    } catch (error) {
      console.error('[Auth] Error getting token expiration time:', error);
      return 0;
    }
  }, []);

  const logout = () => {
    authDebug('Logging out user');
    trackLogoutFlow('Logout started');
    
    // Verify pre-logout state
    trackLogoutFlow('Pre-logout state');
    verifyAuthState();
    
    // Clear token refresh interval
    if (tokenRefreshInterval.current) {
      clearInterval(tokenRefreshInterval.current);
      tokenRefreshInterval.current = null;
      trackLogoutFlow('Token refresh interval cleared');
    }
    
    // Clear lockout timer if it exists
    if (lockoutTimer) {
      clearTimeout(lockoutTimer);
      setLockoutTimer(null);
      trackLogoutFlow('Lockout timer cleared');
    }
    
    // Clear session timeout check
    if (sessionTimeoutRef.current) {
      clearInterval(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
      trackLogoutFlow('Session timeout check cleared');
    }
    
    // Clear local storage
    trackLogoutFlow('Clearing local storage');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    // Update context state
    trackLogoutFlow('Updating context state');
    dispatch({ type: 'LOGOUT' });
    
    // Navigate to login page
    trackLogoutFlow('Navigating to login page');
    navigate('/login');
    
    // Verify post-logout state
    trackLogoutFlow('Post-logout state');
    verifyAuthState();
  };

  // Assign the real implementation to the ref
  useEffect(() => {
    logoutRef.current = logout;
  }, []); // Intentionally empty to avoid circular dependency

  // Function to refresh the authentication token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      
      if (!storedRefreshToken) {
        authDebug('No refresh token found');
        return false;
      }
      
      authDebug('Starting token refresh');
      logToken(storedRefreshToken, 'Using refresh token');
      
      const response = await apiClient.refreshToken();
      
      if (!response?.data?.token) {
        authDebug('Token refresh failed - no token in response');
        return false;
      }
      
      // Log token information for debugging
      authDebug('Token refresh successful');
      logToken(response.data.token, 'New token');
      logToken(response.data.refreshToken, 'New refresh token');
      
      // Update localStorage with new tokens
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      
      // Update user data if it was returned
      if (response.data.user) {
        dispatch({ type: 'SET_USER', payload: response.data.user });
        authDebug('User data updated from refresh response');
      }
      
      return true;
    } catch (error) {
      console.error('[Auth] Token refresh error:', error);
      return false;
    }
  }, [apiClient, dispatch]);

  // Setup token refresh interval
  const setupTokenRefresh = useCallback(() => {
    // Clear existing interval if any
    if (tokenRefreshInterval.current) {
      clearInterval(tokenRefreshInterval.current);
      tokenRefreshInterval.current = null;
    }
    
    // Set up periodic token refresh
    tokenRefreshInterval.current = setInterval(async () => {
      authDebug('Token refresh interval triggered');
      
      const token = localStorage.getItem('token');
      if (!token) {
        authDebug('No token found during refresh interval');
        return;
      }
      
      try {
        const isExpiringSoon = isTokenExpiringSoon(token);
        authDebug(`Token expiring soon? ${isExpiringSoon}`);
        
        if (isExpiringSoon) {
          authDebug('Token expiring soon, triggering refresh');
          await refreshToken();
        }
      } catch (error) {
        console.error('[Auth] Error in token refresh interval:', error);
      }
    }, AUTH_CONFIG.TOKEN_REFRESH_INTERVAL);
    
    authDebug('Token refresh interval set up');
  }, [isTokenExpiringSoon, refreshToken]);

  // Validate token with backend API
  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      
      authDebug('Validating token with backend API');
      
      const response = await apiClient.validateToken();
      
      if (response?.data?.isValid) {
        authDebug('Token validated successfully');
        
        // Update user data if it was returned
        if (response.data.user) {
          dispatch({ type: 'SET_USER', payload: response.data.user });
          authDebug('User data updated from validation response');
        } else {
          // If validation successful but no user data, fetch user profile
          try {
            const userResponse = await apiClient.getCurrentUser();
            if (userResponse?.data) {
              dispatch({ type: 'SET_USER', payload: userResponse.data });
              authDebug('User data fetched after validation');
            }
          } catch (userError) {
            console.error('[Auth] Error fetching user data after validation:', userError);
          }
        }
        
        // Set up token refresh mechanism
        setupTokenRefresh();
        
        return true;
      } else {
        authDebug('Token validation failed', response?.data);
        return false;
      }
    } catch (error) {
      console.error('[Auth] Token validation error:', error);
      return false;
    }
  }, [apiClient, dispatch, setupTokenRefresh]);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    // Skip if we're already checking auth or if the app is not ready
    if (checkingAuth.current || !isReady) return false;
    
    // Set checking flag to prevent multiple simultaneous checks
    checkingAuth.current = true;
    setLoading(true);
    
    try {
      authDebug('Checking authentication status...');
      const token = localStorage.getItem('token');
      
      if (!token) {
        authDebug('No token found in localStorage');
        dispatch({ type: 'SET_USER', payload: null });
        
        if (!PUBLIC_ROUTES.includes(pathname || '')) {
          navigate('/login');
        }
        return false;
      }
      
      // Check if token is expired
      if (isTokenExpired(token)) {
        authDebug('Token is expired, attempting refresh');
        
        // Try to refresh the token
        const refreshed = await refreshToken();
        if (!refreshed) {
          authDebug('Token refresh failed, redirecting to login');
          // Clear tokens and user data
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          dispatch({ type: 'LOGOUT' });
          
          if (!PUBLIC_ROUTES.includes(pathname || '')) {
            navigate('/login');
          }
          return false;
        }
        
        authDebug('Token refreshed successfully');
        // Re-fetch the new token after refresh
        const newToken = localStorage.getItem('token');
        if (!newToken) {
          authDebug('No token found after refresh (unexpected error)');
          return false;
        }
      }
      
      // Validate token with backend
      authDebug('Validating token with backend');
      const validated = await validateToken();
      
      if (validated) {
        authDebug('Token validation successful');
        return true;
      } else {
        authDebug('Token validation failed, redirecting to login');
        // Clear tokens and user data
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        dispatch({ type: 'LOGOUT' });
        
        if (!PUBLIC_ROUTES.includes(pathname || '')) {
          navigate('/login');
        }
        return false;
      }
    } catch (error) {
      console.error('[Auth] Auth check error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Session verification failed. Please log in again.' });
      dispatch({ type: 'LOGOUT' });
      return false;
    } finally {
      setLoading(false);
      checkingAuth.current = false;
    }
  }, [isReady, navigate, pathname, validateToken, refreshToken, isTokenExpired, dispatch]);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (tokenRefreshInterval.current) {
        clearInterval(tokenRefreshInterval.current);
        tokenRefreshInterval.current = null;
      }
      if (sessionTimeoutRef.current) {
        clearInterval(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
    };
  }, []);

  // Initial authentication check
  useEffect(() => {
    if (!initRef.current && isReady) {
      initRef.current = true;
      checkAuth();
    }
  }, [checkAuth, isReady]);

  // Check authentication on route change to protected routes
  useEffect(() => {
    if (isReady && pathname && !PUBLIC_ROUTES.includes(pathname)) {
      checkAuth();
    }
  }, [pathname, isReady, checkAuth]);

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    // Check if login is locked due to too many failed attempts
    if (loginLocked) {
      authDebug('Login locked due to too many failed attempts');
      dispatch({ type: 'SET_ERROR', payload: 'Too many failed login attempts. Please try again later.' });
      dispatch({ type: 'SET_LOADING', payload: false });
      return false;
    }
    
    try {
      trackLoginFlow('Login API call starting', { email });
      authDebug(`Attempting login for user: ${email}`);
      
      const response = await apiClient.login({
        email,
        password
      });
      
      if (!response.data || !response.data.token) {
        trackLoginFlow('Login API response missing token');
        throw new Error('Login failed: Invalid response from server');
      }
      
      // Reset login attempts on successful login
      setLoginAttempts(0);
      
      // Log token info
      logToken(response.data.token, 'New access token');
      logToken(response.data.refreshToken, 'New refresh token');
      
      // Token storage is handled by ApiClient.handleAuthResponse
      // Just verify that the tokens are in localStorage
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        trackLoginFlow('Token not found in localStorage after login, storing manually');
        localStorage.setItem('token', response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
      }
      
      const userData = response.data.user;
      dispatch({ type: 'SET_USER', payload: userData });
      trackLoginFlow('User data set in context', { userId: userData.id, role: userData.role });
      
      // Set up token refresh
      setupTokenRefresh();
      trackLoginFlow('Token refresh setup complete');
      
      // Reset last activity timestamp
      lastActivityRef.current = Date.now();
      
      // Navigate to the appropriate dashboard based on user role
      if (userData && userData.role) {
        const defaultPath = getDefaultRouteForUser(userData.role);
        trackLoginFlow('Redirecting to role-specific dashboard', { role: userData.role, path: defaultPath });
        navigate(defaultPath);
      } else {
        trackLoginFlow('Redirecting to default dashboard');
        navigate('/dashboard');
      }
      
      logAuthEvent('Login', true, { userId: userData.id, role: userData.role });
      authDebug('Login successful');
      return true;
    } catch (err: any) {
      authDebug('Login error', err);
      let errorMsg = 'Login failed. Please check your credentials and try again.';
      
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      // Increment login attempts
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      trackLoginFlow('Failed login attempt', { attempts: newAttempts, maxAttempts: AUTH_CONFIG.LOGIN_ATTEMPTS_MAX });
      
      // Lock account temporarily after maximum attempts
      if (newAttempts >= AUTH_CONFIG.LOGIN_ATTEMPTS_MAX) {
        setLoginLocked(true);
        trackLoginFlow('Account locked due to too many failed attempts');
        dispatch({ type: 'SET_ERROR', payload: `Too many failed login attempts. Account locked for 15 minutes.` });
        
        // Unlock after 15 minutes
        const timer = setTimeout(() => {
          setLoginLocked(false);
          setLoginAttempts(0);
          trackLoginFlow('Account unlocked after timeout');
        }, 15 * 60 * 1000);
        
        setLockoutTimer(timer);
      } else {
        dispatch({ type: 'SET_ERROR', payload: `${errorMsg} (${newAttempts}/${AUTH_CONFIG.LOGIN_ATTEMPTS_MAX} attempts)` });
      }
      
      logAuthEvent('Login', false, { error: errorMsg, attempts: newAttempts });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (userData: RegisterRequest): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      trackRegisterFlow('Registration API call starting', { email: userData.email, role: userData.role });
      authDebug('Attempting registration');
      
      const response = await apiClient.register(userData);
      
      if (!response.data || !response.data.token) {
        trackRegisterFlow('Registration API response missing token');
        throw new Error('Registration failed: Invalid response from server');
      }
      
      // Log token info
      logToken(response.data.token, 'New access token');
      logToken(response.data.refreshToken, 'New refresh token');
      
      // Token storage is handled by ApiClient.handleAuthResponse
      // Double-check that the tokens are stored
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        trackRegisterFlow('Token not found in localStorage after registration, storing manually');
        localStorage.setItem('token', response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
      }
      
      const user = response.data.user;
      dispatch({ type: 'SET_USER', payload: user });
      trackRegisterFlow('User data set in context', { userId: user.id, role: user.role });
      
      // Set up token refresh
      setupTokenRefresh();
      trackRegisterFlow('Token refresh setup complete');
      
      // Reset last activity timestamp
      lastActivityRef.current = Date.now();
      
      // Navigate to the appropriate dashboard based on user role
      if (user && user.role) {
        const defaultPath = getDefaultRouteForUser(user.role);
        trackRegisterFlow('Redirecting to role-specific dashboard', { role: user.role, path: defaultPath });
        navigate(defaultPath);
      } else {
        trackRegisterFlow('Redirecting to default dashboard');
        navigate('/dashboard');
      }
      
      logAuthEvent('Registration', true, { userId: user.id, role: user.role });
      authDebug('Registration successful');
      return true;
    } catch (err: any) {
      authDebug('Registration error', err);
      let errorMsg = 'Registration failed. Please try again.';
      
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      logAuthEvent('Registration', false, { error: errorMsg });
      trackRegisterFlow('Registration failed', { error: errorMsg });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  // Clean up lockout timer on unmount
  useEffect(() => {
    return () => {
      if (lockoutTimer) {
        clearTimeout(lockoutTimer);
      }
    };
  }, [lockoutTimer]);

  const updateUser = (user: UserResponse): void => {
    dispatch({ type: 'SET_USER', payload: user });
  };

  // Function to set up the session timeout
  const setupSessionTimeout = useCallback(() => {
    // Clear existing timeout if any
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }

    // Only set up timeout if user is logged in
    if (state.user) {
      console.log('[Auth] Setting up session timeout');
      sessionTimeoutRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivityRef.current;
        
        if (timeSinceLastActivity >= AUTH_CONFIG.SESSION_TIMEOUT_MS) {
          console.log('[Auth] Session timed out due to inactivity');
          logoutRef.current();
        }
      }, 60000); // Check every minute
    }
  }, [state.user, logoutRef]);

  // Function to reset activity timer
  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Set up event listeners to track user activity
  useEffect(() => {
    if (state.user) {
      console.log('[Auth] Setting up activity tracking');
      const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart'];
      
      const handleActivity = () => {
        resetActivityTimer();
      };
      
      // Add event listeners
      activityEvents.forEach(event => {
        window.addEventListener(event, handleActivity);
      });
      
      // Set up session timeout
      setupSessionTimeout();
      
      // Clean up on unmount
      return () => {
        activityEvents.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
        
        if (sessionTimeoutRef.current) {
          clearInterval(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
      };
    }
  }, [state.user, resetActivityTimer, setupSessionTimeout]);

  // Make sure the context value includes all required properties
  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    register,
    checkAuth,
    refreshToken,
    isTokenExpired,
    getTimeUntilExpiration,
    resetActivityTimer
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context;
}
