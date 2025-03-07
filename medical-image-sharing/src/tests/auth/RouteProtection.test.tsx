import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Role } from '@prisma/client';
import React from 'react';

// Mock the API client
jest.mock('@/lib/api/client', () => {
  return {
    apiClient: {
      login: jest.fn().mockResolvedValue({
        data: {
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: '123',
            name: 'Test User',
            email: 'test@example.com',
            role: Role.PATIENT
          }
        }
      }),
      getCurrentUser: jest.fn().mockResolvedValue({
        data: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
          role: Role.PATIENT
        }
      }),
      validateToken: jest.fn().mockResolvedValue({
        data: {
          isValid: true
        }
      })
    }
  };
});

// Mock router and pathname
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn()
};

let mockPathname = '/';

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component to test route protection
const TestRouteProtection = () => {
  const { user, login, isAuthenticated } = useAuth();
  const pathname = mockPathname;
  
  return (
    <div>
      <div data-testid="current-path">{pathname}</div>
      {isAuthenticated ? (
        <div data-testid="user-role">{user?.role}</div>
      ) : (
        <button 
          data-testid="login-btn" 
          onClick={() => login('test@example.com', 'password')}
        >
          Login
        </button>
      )}
    </div>
  );
};

describe('Route Protection', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    mockRouter.push.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should redirect to login page when accessing protected route without authentication', async () => {
    // Set pathname to protected route
    mockPathname = '/patient/dashboard';
    
    render(
      <AuthProvider>
        <TestRouteProtection />
      </AuthProvider>
    );
    
    // We expect the router to redirect to login
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  it('should stay on public route when not authenticated', async () => {
    // Set pathname to public route
    mockPathname = '/login';
    
    render(
      <AuthProvider>
        <TestRouteProtection />
      </AuthProvider>
    );
    
    // We don't expect any redirection
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('should redirect to role-specific dashboard from login page after authentication', async () => {
    // Set pathname to login page
    mockPathname = '/login';
    
    render(
      <AuthProvider>
        <TestRouteProtection />
      </AuthProvider>
    );
    
    // Login as patient
    const loginButton = screen.getByTestId('login-btn');
    fireEvent.click(loginButton);
    
    // We expect redirection to patient dashboard
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/patient/dashboard');
    });
  });

  it('should allow access to role-specific routes when authenticated with correct role', async () => {
    // Log in first by setting tokens
    localStorageMock.setItem('token', 'mock-token');
    
    // Mock API client to return PATIENT role
    jest.mocked(require('@/lib/api/client').apiClient.getCurrentUser).mockResolvedValue({
      data: {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        role: Role.PATIENT
      }
    });
    
    // Set pathname to patient route
    mockPathname = '/patient/dashboard';
    
    render(
      <AuthProvider>
        <TestRouteProtection />
      </AuthProvider>
    );
    
    // Wait for auth state to update
    await waitFor(() => {
      expect(screen.getByTestId('user-role')).toHaveTextContent('PATIENT');
    });
    
    // We don't expect any redirection
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('should redirect to role-specific dashboard when accessing another role route', async () => {
    // Log in first by setting tokens
    localStorageMock.setItem('token', 'mock-token');
    
    // Mock API client to return PATIENT role
    jest.mocked(require('@/lib/api/client').apiClient.getCurrentUser).mockResolvedValue({
      data: {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        role: Role.PATIENT
      }
    });
    
    // Set pathname to provider route (which should be forbidden for patient)
    mockPathname = '/provider/dashboard';
    
    render(
      <AuthProvider>
        <TestRouteProtection />
      </AuthProvider>
    );
    
    // We expect redirection to patient dashboard
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/patient/dashboard');
    });
  });
}); 