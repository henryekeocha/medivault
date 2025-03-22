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
      register: jest.fn().mockResolvedValue({
        data: {
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: '123',
            name: 'New User',
            email: 'new@example.com',
            role: Role.PATIENT
          }
        }
      }),
      logout: jest.fn().mockResolvedValue({}),
      validateToken: jest.fn().mockResolvedValue({
        data: {
          isValid: true
        }
      }),
      refreshToken: jest.fn().mockResolvedValue({
        data: {
          token: 'new-mock-token',
          refreshToken: 'new-mock-refresh-token'
        }
      }),
      getCurrentUser: jest.fn().mockResolvedValue({
        data: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
          role: Role.PATIENT
        }
      })
    }
  };
});

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

// Add jest.mock for next-auth
jest.mock('next-auth/react', () => {
  const originalModule = jest.requireActual('next-auth/react');
  return {
    __esModule: true,
    ...originalModule,
    signIn: jest.fn(),
    signOut: jest.fn(),
    useSession: jest.fn(() => {
      return {
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            role: 'PATIENT'
          },
          accessToken: 'mock-access-token',
          expires: new Date(Date.now() + 3600 * 1000).toISOString()
        },
        status: 'authenticated'
      };
    }),
    getSession: jest.fn(() => {
      return Promise.resolve({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'PATIENT'
        },
        accessToken: 'mock-access-token',
        expires: new Date(Date.now() + 3600 * 1000).toISOString()
      });
    })
  };
});

// Test component to access auth context
const TestComponent = () => {
  const { user, login, logout, register, isAuthenticated } = useAuth();
  
  return (
    <div>
      {isAuthenticated ? (
        <>
          <div data-testid="user-info">
            <div data-testid="user-name">{user?.name}</div>
            <div data-testid="user-email">{user?.email}</div>
            <div data-testid="user-role">{user?.role}</div>
          </div>
          <button data-testid="logout-btn" onClick={() => logout()}>Logout</button>
        </>
      ) : (
        <>
          <button 
            data-testid="login-btn" 
            onClick={() => login('test@example.com', 'password')}
          >
            Login
          </button>
          <button 
            data-testid="register-btn" 
            onClick={() => register('New User', 'new@example.com', 'password', Role.PATIENT)}
          >
            Register
          </button>
        </>
      )}
    </div>
  );
};

describe('Authentication Flow', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should login user and store token in localStorage', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click login button
    const loginButton = screen.getByTestId('login-btn');
    fireEvent.click(loginButton);

    // Wait for auth state to update
    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    });

    // Check user info
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('user-role')).toHaveTextContent('PATIENT');

    // Check localStorage
    expect(localStorageMock.getItem('token')).toBe('mock-token');
    expect(localStorageMock.getItem('refreshToken')).toBe('mock-refresh-token');
  });

  it('should register a new user and store token in localStorage', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click register button
    const registerButton = screen.getByTestId('register-btn');
    fireEvent.click(registerButton);

    // Wait for auth state to update
    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    });

    // Check user info
    expect(screen.getByTestId('user-name')).toHaveTextContent('New User');
    expect(screen.getByTestId('user-email')).toHaveTextContent('new@example.com');
    expect(screen.getByTestId('user-role')).toHaveTextContent('PATIENT');

    // Check localStorage
    expect(localStorageMock.getItem('token')).toBe('mock-token');
    expect(localStorageMock.getItem('refreshToken')).toBe('mock-refresh-token');
  });

  it('should logout user and remove token from localStorage', async () => {
    // Setup: login first
    localStorageMock.setItem('token', 'mock-token');
    localStorageMock.setItem('refreshToken', 'mock-refresh-token');

    const { rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Rerender to pick up localStorage changes
    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for auth state to update
    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    });

    // Click logout button
    const logoutButton = screen.getByTestId('logout-btn');
    fireEvent.click(logoutButton);

    // Wait for auth state to update
    await waitFor(() => {
      expect(screen.getByTestId('login-btn')).toBeInTheDocument();
    });

    // Check localStorage
    expect(localStorageMock.getItem('token')).toBeNull();
    expect(localStorageMock.getItem('refreshToken')).toBeNull();
  });

  // Add more tests for token refresh, invalid tokens, etc.
}); 