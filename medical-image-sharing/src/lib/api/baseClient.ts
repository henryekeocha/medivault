import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse } from './types';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/auth/*',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/social-callback',
  '/notifications',
  '/notifications/*'
];

// Create base axios instance
let baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// Check for both /api and api/ patterns
if (baseURL.endsWith('/api') || baseURL.endsWith('/api/')) {
  // Remove trailing slashes first
  while (baseURL.endsWith('/')) {
    baseURL = baseURL.slice(0, -1);
  }
  // Then remove the /api suffix
  if (baseURL.endsWith('/api')) {
    baseURL = baseURL.slice(0, -4);
  }
}
// Make sure we don't have double slashes when adding /api
if (baseURL.endsWith('/')) {
  baseURL = baseURL + 'api';
} else {
  baseURL = baseURL + '/api';
}

// Log the API base URL for debugging purposes
console.log(`API baseURL configured as: ${baseURL}`);

// Create an alternative URL for 127.0.0.1 fallback
const altBaseURL = baseURL.replace('localhost', '127.0.0.1');
console.log(`Alternative API baseURL: ${altBaseURL}`);

export const axiosInstance: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000, // Increased timeout for better reliability
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Function to test both URLs and determine which one works
const testServerAvailability = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  try {
    // Try primary URL health check
    await axios.get(`${baseURL}/health`, { timeout: 2000 })
      .then(() => {
        console.log('Primary API server is available');
        // Keep using the primary URL
      })
      .catch(async (error) => {
        console.log(`Primary API server health check failed: ${error.message}`);
        
        // Try alternate URL
        try {
          await axios.get(`${altBaseURL}/health`, { timeout: 2000 });
          console.log('Alternate API server is available, switching to it');
          
          // Switch to alternative URL
          axiosInstance.defaults.baseURL = altBaseURL;
          console.log(`Switched API baseURL to: ${altBaseURL}`);
        } catch (altError) {
          console.log(`Both API servers appear to be unavailable`);
        }
      });
  } catch (error) {
    console.error('Error testing server availability:', error);
  }
};

// Run the test on client-side initialization
if (typeof window !== 'undefined') {
  testServerAvailability();
}

// Helper function to check if route is public
const isPublicRoute = (): boolean => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    return PUBLIC_ROUTES.some(route => {
      if (route.endsWith('*')) {
        return path.startsWith(route.slice(0, -1));
      }
      return path === route;
    });
  }
  return false;
};

// Helper function to get auth token with error handling
const getAuthToken = async (): Promise<string | null> => {
  if (typeof window !== 'undefined' && window.Clerk?.session) {
    try {
      const token = await window.Clerk.session.getToken();
      return token;
    } catch (error) {
      console.error('[API] Error getting auth token:', error);
      return null;
    }
  }
  return null;
};

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    // Add a unique request ID for debugging
    const requestId = Math.random().toString(36).substring(2, 15);
    config.headers['X-Request-ID'] = requestId;
    
    // Skip auth for public routes
    if (isPublicRoute()) {
      console.log(`[API] (${requestId}) Public route, skipping auth for ${config.url}`);
      return config;
    }

    try {
      // Get token from Clerk
      const token = await getAuthToken();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log(`[API] (${requestId}) Added auth token for request to ${config.url}`);
      } else {
        console.warn(`[API] (${requestId}) No auth token available for request to ${config.url}`);
        
        // Add user ID in header for auth debugging
        if (typeof window !== 'undefined' && window.Clerk?.user?.id) {
          config.headers['X-Clerk-ID'] = window.Clerk.user.id;
          console.log(`[API] (${requestId}) Added Clerk ID header as fallback`);
        }
      }
    } catch (error) {
      console.error(`[API] (${requestId}) Error setting auth headers:`, error);
    }
    
    return config;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    const requestId = response.config.headers['X-Request-ID'];
    console.log(`[API] (${requestId}) Request successful:`, response.config.method?.toUpperCase(), response.config.url);
    return response;
  },
  async (error) => {
    const requestId = error.config?.headers?.['X-Request-ID'] || 'unknown';
    // Don't log errors for providers endpoint since we handle it as a normal case
    if (!error.config?.url?.includes('/patients/providers')) {
      console.error(`[API] (${requestId}) Request failed:`, error.config?.method?.toUpperCase(), error.config?.url, error.response?.status);
    }
    
    // Skip handling for public routes
    if (isPublicRoute()) {
      return Promise.reject(error);
    }

    // Network errors or connection refused - try alternate URL
    if (!error.response || error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
      if (error.config.baseURL === baseURL && !error.config.__isRetryWithAlt) {
        console.log(`[API] (${requestId}) Network error, retrying with alternate URL`);
        
        // Modify the request to use the alternate URL
        const newConfig = {...error.config};
        newConfig.baseURL = altBaseURL;
        newConfig.__isRetryWithAlt = true;
        
        // Make a fresh attempt with the new URL
        try {
          return await axios(newConfig);
        } catch (retryError) {
          console.error(`[API] (${requestId}) Retry with alternate URL also failed`);
          return Promise.reject(retryError);
        }
      }
    }

    // Check if it's a NEEDS_SYNC error
    if (error.response?.status === 403 && error.response?.data?.code === 'NEEDS_SYNC') {
      try {
        // Get Clerk user ID
        const userId = window.Clerk?.user?.id;
        const token = await getAuthToken();
        
        if (userId && token) {
          console.log(`[API] (${requestId}) Syncing user with Clerk ID:`, userId);
          
          // Call the sync endpoint with the proper path
          await axios.post(
            `${baseURL}/auth/sync/${userId}`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          
          console.log(`[API] (${requestId}) User sync successful, retrying original request`);
          
          // Retry the original request with fresh token
          const newToken = await getAuthToken();
          if (newToken) {
            error.config.headers.Authorization = `Bearer ${newToken}`;
          }
          
          // Create a new axios instance for the retry to avoid interceptor loops
          return axios(error.config);
        }
      } catch (syncError) {
        console.error(`[API] (${requestId}) Error syncing user:`, syncError);
        // If sync fails, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login?error=sync_failed';
        }
        return Promise.reject(error);
      }
    }

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      console.log(`[API] (${requestId}) Authentication failed, redirecting to login`);
      // Redirect to sign-in page
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login?error=unauthorized';
      }
    }

    // Handle 404 Not Found errors - these may indicate missing backend services
    if (error.response?.status === 404) {
      // For providers endpoint, silently return empty array without logging errors
      if (error.config?.url?.includes('/patients/providers')) {
        return {
          data: {
            status: 'success',
            data: []
          }
        };
      }
      
      // For appointments endpoint, return empty array
      if (error.config?.url?.includes('/appointments/')) {
        return {
          data: {
            status: 'success',
            data: []
          }
        };
      }
      
      // For medical-records endpoint, return empty array
      if (error.config?.url?.includes('/medical-records')) {
        return {
          data: {
            status: 'success',
            data: []
          }
        };
      }
      
      console.error(`[API] (${requestId}) API endpoint not found - backend service may be down:`, error.config?.url);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

export class BaseClient {
  protected client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  // Helper to get auth token and add to request config
  protected async addAuthToConfig(config?: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    if (!config) config = {};
    if (!config.headers) config.headers = {};
    
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config || {};
  }

  protected async handleApiError<T>(error: any, endpoint: string): Promise<ApiResponse<T>> {
    // If this isn't really an error but a successful response, return it
    if (error && error.status === 200 && error.data) {
      console.log(`[API] Received successful response for ${endpoint} but it was caught in error handler`);
      return error as ApiResponse<T>;
    }
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.error(`[API] Backend service unavailable for: ${endpoint}`);
        // Return empty but valid data structure instead of throwing
        return { 
          status: 'error', 
          data: [] as unknown as T,
          error: {
            message: "Backend service unavailable",
            code: "SERVICE_UNAVAILABLE"
          }
        };
      }
      
      // Handle network errors with more specific information
      if (!error.response || error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
        console.error(`[API] Network error for: ${endpoint}`, error.message);
        return {
          status: 'error',
          data: [] as unknown as T,
          error: {
            message: "Network connection error",
            code: "NETWORK_ERROR"
          }
        };
      }
    }
    
    // For other errors, rethrow
    throw error;
  }

  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, await this.addAuthToConfig(config));
      return response.data;
    } catch (error) {
      return this.handleApiError<T>(error, url);
    }
  }

  protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data, await this.addAuthToConfig(config));
      return response.data;
    } catch (error) {
      return this.handleApiError<T>(error, url);
    }
  }

  protected async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data, await this.addAuthToConfig(config));
      return response.data;
    } catch (error) {
      return this.handleApiError<T>(error, url);
    }
  }

  protected async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch<ApiResponse<T>>(url, data, await this.addAuthToConfig(config));
      return response.data;
    } catch (error) {
      return this.handleApiError<T>(error, url);
    }
  }

  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url, await this.addAuthToConfig(config));
      return response.data;
    } catch (error) {
      return this.handleApiError<T>(error, url);
    }
  }
} 