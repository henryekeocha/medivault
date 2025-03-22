'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useReducer, ReactNode } from 'react';
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
import { User } from '@/lib/api/types';
import { useSession, signOut, signIn, getSession } from 'next-auth/react';

// Define a logDebug function using the existing authDebug
const logDebug = (category: string, message: string, data?: any) => {
  authDebug(`[${category}] ${message}`, data);
};

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
  serverAvailable: boolean;
  retryCount: number;
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
  updateUser: (user: UserResponse) => void;
  setAuth: (auth: { isAuthenticated: boolean; user: UserResponse | null }) => void;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  serverAvailable: true,
  retryCount: 0,
  login: async () => false,
  logout: () => {},
  register: async () => false,
  checkAuth: async () => false,
  refreshToken: async () => false,
  isTokenExpired: () => true,
  getTimeUntilExpiration: () => 0,
  resetActivityTimer: () => {},
  updateUser: () => {},
  setAuth: () => {}
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
  TOKEN_REFRESH_THRESHOLD_SEC: 5 * 60, // 5 minutes threshold for token refresh
};

// Add these variables near the top of the file, just after the existing AUTH_CONFIG
const SESSION_CHECK = {
  lastCheckTime: 0,
  consecutiveFailures: 0,
  maxConsecutiveFailures: 3,
  backoffTime: 5000, // 5 seconds initial backoff
  maxBackoffTime: 60000, // Max 1 minute between retries
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // Add NextAuth session handling at the top of the component
  const { data: session, status: sessionStatus, update } = useSession();
  
  // Initialize with useReducer instead of separate useState calls
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
    serverAvailable: true,
    retryCount: 0,
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
  // Add a ref to track state sync to prevent infinite loops
  const syncingState = useRef(false);

  // Forward declaration of functions to avoid circular dependencies
  const logoutRef = useRef<() => void>(() => {});
  
  // Sync state.user with user - with safeguard against loops
  useEffect(() => {
    if (!syncingState.current && state.user !== user) {
      syncingState.current = true;
      setUser(state.user);
      // Release the lock asynchronously
      setTimeout(() => {
        syncingState.current = false;
      }, 0);
    }
  }, [state.user]);

  // Sync user with state.user - with safeguard against loops
  useEffect(() => {
    if (!syncingState.current && user !== state.user) {
      syncingState.current = true;
      dispatch({ type: 'SET_USER', payload: user });
      // Release the lock asynchronously
      setTimeout(() => {
        syncingState.current = false;
      }, 0);
    }
  }, [user]);

  // Sync state.loading with loading - with safeguard against loops
  useEffect(() => {
    if (!syncingState.current && state.loading !== loading) {
      syncingState.current = true;
      setLoading(state.loading);
      // Release the lock asynchronously
      setTimeout(() => {
        syncingState.current = false;
      }, 0);
    }
  }, [state.loading]);

  // Sync loading with state.loading - with safeguard against loops
  useEffect(() => {
    if (!syncingState.current && loading !== state.loading) {
      syncingState.current = true;
      dispatch({ type: 'SET_LOADING', payload: loading });
      // Release the lock asynchronously
      setTimeout(() => {
        syncingState.current = false;
      }, 0);
    }
  }, [loading]);

  // Sync state.error with error - with safeguard against loops
  useEffect(() => {
    if (!syncingState.current && state.error !== error) {
      syncingState.current = true;
      setError(state.error);
      // Release the lock asynchronously
      setTimeout(() => {
        syncingState.current = false;
      }, 0);
    }
  }, [state.error]);

  // Sync error with state.error - with safeguard against loops
  useEffect(() => {
    if (!syncingState.current && error !== state.error) {
      syncingState.current = true;
      dispatch({ type: 'SET_ERROR', payload: error });
      // Release the lock asynchronously
      setTimeout(() => {
        syncingState.current = false;
      }, 0);
    }
  }, [error]);

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
  
  // Function to refresh token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      // Get current session
      if (!session?.refreshToken) {
        authDebug('No refresh token found');
        return false;
      }

      // Call the refresh token endpoint
      const response = await apiClient.refreshToken();
      if (response?.data?.token) {
        // Force a session update by calling getSession
        await getSession();
        
        authDebug('Token refreshed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Auth] Error refreshing token:', error);
      return false;
    }
  }, [apiClient, session]);

  // Function to check if token is expiring soon
  const isTokenExpiringSoon = useCallback((token: string): boolean => {
    try {
      const decoded = jwt_decode<{ exp: number }>(token);
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiration = decoded.exp - now;
      return timeUntilExpiration <= AUTH_CONFIG.TOKEN_REFRESH_THRESHOLD_SEC;
    } catch (error) {
      console.error('[Auth] Error checking token expiration:', error);
      return false;
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

  // Implement logout functionality (forward declaration resolved)
  const logout = useCallback(() => {
    logDebug('Auth', 'Logging out user');
    
    try {
      // Clear auth state
      dispatch({ type: 'LOGOUT' });
      
      // Log out from NextAuth
      signOut({ redirect: false }).catch(error => {
        console.error('Error signing out from NextAuth:', error);
      });
      
      // Clear intervals
      if (tokenRefreshInterval.current) {
        clearInterval(tokenRefreshInterval.current);
        tokenRefreshInterval.current = null;
      }
      
      if (sessionTimeoutRef.current) {
        clearInterval(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      
      // Redirect to login page
      if (isReady) {
        navigate('/auth/login');
      }
      
      trackLogoutFlow('success');
    } catch (error) {
      console.error('Logout error:', error);
      trackLogoutFlow('error', { error });
    }
  }, [isReady, navigate]);

  // Assign the real implementation to the ref
  useEffect(() => {
    logoutRef.current = logout;
  }, []); // Intentionally empty to avoid circular dependency

  // Set up token refresh interval
  const setupTokenRefresh = useCallback(() => {
    // Clear existing interval if any
    if (tokenRefreshInterval.current) {
      clearInterval(tokenRefreshInterval.current);
      tokenRefreshInterval.current = null;
    }

    tokenRefreshInterval.current = setInterval(async () => {
      // Get current session
      const session = await getSession();
      const token = session?.accessToken;
      
      if (!token) {
        authDebug('No token found, clearing refresh interval');
        if (tokenRefreshInterval.current) {
          clearInterval(tokenRefreshInterval.current);
          tokenRefreshInterval.current = null;
        }
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

  // Validate token with backend API or NextAuth session
  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      // First check if we have a valid NextAuth session
      if (sessionStatus === 'authenticated' && session?.user) {
        authDebug('User is authenticated via NextAuth, skipping token validation');
        return true;
      }
      
      // Fall back to token validation if no NextAuth session
      const nextAuthSession = await getSession();
      if (!nextAuthSession?.accessToken) return false;
      
      authDebug('Validating token with backend API');
      
      // First try to decode the token locally to avoid unnecessary API calls
      try {
        const decoded = jwt_decode<{ exp: number }>(nextAuthSession.accessToken);
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp <= now) {
          authDebug('Token is expired according to local check');
          return false;
        }
      } catch (decodeError) {
        console.error('[Auth] Error decoding token:', decodeError);
        // Continue to backend validation even if local decode fails
      }
      
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
  }, [sessionStatus, session, dispatch, apiClient, setupTokenRefresh]);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    // Skip if we're already checking auth or if the app is not ready
    if (checkingAuth.current || !appReady.current) {
      return false;
    }
    
    checkingAuth.current = true;
    
    // Check if we're over the backoff time before making another request
    const currentTime = Date.now();
    if (
      currentTime - SESSION_CHECK.lastCheckTime < 
      Math.min(SESSION_CHECK.backoffTime * SESSION_CHECK.consecutiveFailures, SESSION_CHECK.maxBackoffTime)
    ) {
      checkingAuth.current = false;
      return false;
    }
    
    SESSION_CHECK.lastCheckTime = currentTime;
    
    try {
      authDebug('Checking authentication status...');
      
      // Check NextAuth session first
      const nextAuthSession = await getSession();
      if (nextAuthSession?.user) {
        authDebug('User authenticated via NextAuth session');
        
        // Create a user object from NextAuth session
        const sessionUser: UserResponse = {
          id: nextAuthSession.user.id,
          email: nextAuthSession.user.email,
          name: nextAuthSession.user.name || 'User',
          role: nextAuthSession.user.role,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        dispatch({ type: 'SET_USER', payload: sessionUser });
        
        // Reset failure count on success
        SESSION_CHECK.consecutiveFailures = 0;
        checkingAuth.current = false;
        return true;
      }
      
      // If no NextAuth session, try API validation
      const validationResponse = await apiClient.validateToken();
      if (validationResponse?.data?.isValid && validationResponse?.data?.user) {
        dispatch({ type: 'SET_USER', payload: validationResponse.data.user });
        
        // Reset failure count on success
        SESSION_CHECK.consecutiveFailures = 0;
        checkingAuth.current = false;
        return true;
      } else {
        authDebug('Token validation failed');
        dispatch({ type: 'SET_USER', payload: null });
        
        // Only navigate if we're not already on a public route and this isn't an initial load
        if (initRef.current && !PUBLIC_ROUTES.includes(pathname || '') && pathname !== '/auth/login') {
          authDebug('Redirecting to login page due to failed validation');
          navigate('/auth/login');
        }
        
        checkingAuth.current = false;
        return false;
      }
    } catch (error) {
      console.error('[Auth] Error checking authentication:', error);
      
      // Increment failure count to implement backoff
      SESSION_CHECK.consecutiveFailures++;
      
      // If we've tried too many times, log the user out
      if (SESSION_CHECK.consecutiveFailures >= SESSION_CHECK.maxConsecutiveFailures) {
        dispatch({ type: 'SET_USER', payload: null });
        
        // Only navigate if we're not already on a public route
        if (!PUBLIC_ROUTES.includes(pathname || '')) {
          authDebug('Too many consecutive auth failures, redirecting to login');
          navigate('/auth/login');
        }
      }
      
      checkingAuth.current = false;
      return false;
    }
  }, [apiClient, pathname, navigate]);

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

  // Modify the initial authentication check
  useEffect(() => {
    if (!initRef.current && isReady) {
      initRef.current = true;
      
      // Check if we're on a protected route that requires authentication
      const isProtectedRoute = pathname && !PUBLIC_ROUTES.includes(pathname) && pathname !== '/auth/login';
      
      // Only perform auth check if we have a session or we're on a protected route
      if (sessionStatus === 'authenticated' || isProtectedRoute) {
        // Slight delay before initial auth check to avoid immediate redirects
        setTimeout(() => {
          checkAuth();
        }, 100);
      } else {
        // Not authenticated and on a public route, just mark as not loading
        setLoading(false);
      }
    }
  }, [checkAuth, isReady, pathname, sessionStatus]);
  
  // Only check authentication on route change to protected routes
  useEffect(() => {
    if (isReady && initRef.current) {
      const isProtectedRoute = pathname && !PUBLIC_ROUTES.includes(pathname) && pathname !== '/auth/login';
      
      // Only check auth when navigating to protected routes or when we have a session
      if (isProtectedRoute || sessionStatus === 'authenticated') {
        checkAuth();
      }
    }
  }, [pathname, isReady, checkAuth, sessionStatus]);

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      // Track login flow start
      trackLoginFlow('start', { email });
      
      // Attempt to sign in with NextAuth
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password
      });

      if (result?.error) {
        dispatch({ type: 'SET_ERROR', payload: result.error });
        trackLoginFlow('error', { error: result.error });
        return false;
      }

      // Get the session after successful sign in
      const session = await getSession();
      
      if (!session?.user) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to get user session' });
        return false;
      }

      // Update auth state with user data
      dispatch({ type: 'SET_USER', payload: session.user as UserResponse });
      
      // Get user's role and navigate to appropriate dashboard
      const userRole = session.user.role as Role;
      const defaultRoute = ROLE_DEFAULT_ROUTES[userRole] || '/dashboard';
      
      // Use the router to navigate
      navigate(defaultRoute);
      
      trackLoginFlow('success');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      trackLoginFlow('error', { error: errorMessage });
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
      
      // First register using the API
      const response = await apiClient.register(userData);
      
      if (!response.data || !response.data.token) {
        trackRegisterFlow('Registration API response missing token');
        throw new Error('Registration failed: Invalid response from server');
      }
      
      // Then use NextAuth to sign in with the new credentials
      const result = await signIn('credentials', {
        redirect: false,
        email: userData.email,
        password: userData.password
      });
      
      if (!result?.ok) {
        trackRegisterFlow('NextAuth sign-in after registration failed', { error: result?.error });
        throw new Error('Registration successful but sign-in failed');
      }
      
      // Get the newly created session
      const session = await getSession();
      if (session?.user) {
        // Create a user response from the session
        const userResponse: UserResponse = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name || 'User',
          role: session.user.role,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Update user in auth context
        dispatch({ type: 'SET_USER', payload: userResponse });
        trackRegisterFlow('User data set in context', { userId: userResponse.id, role: userResponse.role });
        
        // Set up token refresh
        setupTokenRefresh();
        trackRegisterFlow('Token refresh setup complete');
        
        // Reset last activity timestamp
        lastActivityRef.current = Date.now();
        
        dispatch({ type: 'SET_LOADING', payload: false });
        return true;
      } else {
        // This should not happen if result.ok is true
        dispatch({ type: 'SET_ERROR', payload: 'Failed to retrieve user session after registration' });
        dispatch({ type: 'SET_LOADING', payload: false });
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      trackRegisterFlow('Registration error', { error: String(error) });
      
      let errorMessage = 'An error occurred during registration';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_LOADING', payload: false });
      return false;
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

  // Add retries and connection state
  const [serverAvailable, setServerAvailable] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Add event listener for backend unavailability
    const handleBackendUnavailable = () => {
      setServerAvailable(false);
      logDebug('Server Connection', 'Backend server is unavailable');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('backend-unavailable', handleBackendUnavailable);
      
      return () => {
        window.removeEventListener('backend-unavailable', handleBackendUnavailable);
      };
    }
  }, []);

  // Add retry logic for server availability
  useEffect(() => {
    if (!serverAvailable && retryCount < 5) {
      const retryTimer = setTimeout(() => {
        logDebug('Server Connection', `Retry attempt ${retryCount + 1} of 5`);
        checkAuth();
        setRetryCount(retryCount + 1);
      }, 3000 * (retryCount + 1)); // Increasing backoff
      
      return () => clearTimeout(retryTimer);
    }
  }, [serverAvailable, retryCount, checkAuth]);

  // Synchronize NextAuth session with local auth state
  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user) {
      // Convert NextAuth session user to our user format
      const nextAuthUser: UserResponse = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || 'User',
        role: session.user.role,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Update local auth state with NextAuth session
      if (!user || user.id !== nextAuthUser.id) {
        dispatch({ type: 'SET_USER', payload: nextAuthUser });
      }
      
      // We know we're authenticated via NextAuth, so set true regardless of localStorage
      if (!state.isAuthenticated) {
        dispatch({ type: 'SET_USER', payload: nextAuthUser });
      }
    }
  }, [session, sessionStatus, user, state.isAuthenticated, dispatch]);
  
  // Add effect to check NextAuth session before using localStorage
  useEffect(() => {
    // Skip if session is loading or we're already checking auth
    if (sessionStatus === 'loading' || checkingAuth.current) {
      return;
    }
    
    // If NextAuth says we're unauthenticated, update our local state
    if (sessionStatus === 'unauthenticated' && state.isAuthenticated) {
      // Only perform a logout if we think we're authenticated locally
      logDebug('Auth', 'Session mismatch: NextAuth unauthenticated but local state says authenticated', {
        isAuthenticated: state.isAuthenticated
      });
      
      dispatch({ type: 'LOGOUT' });
    }
  }, [sessionStatus, state.isAuthenticated, dispatch]);

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
    resetActivityTimer,
    updateUser,
    setAuth: (auth) => {
      dispatch({ type: 'SET_USER', payload: auth.user });
    }
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
