import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Role } from '@prisma/client';
import React from 'react';
import { ProfileForm } from '@/components/profile/ProfileForm';

// Mock the API client
jest.mock('@/lib/api/client', () => {
  const getInstance = jest.fn().mockReturnValue({
    updateProfile: jest.fn().mockResolvedValue({
      data: {
        id: '123',
        name: 'Updated User',
        email: 'test@example.com',
        role: Role.PATIENT
      }
    }),
    changePassword: jest.fn().mockResolvedValue({
      data: {
        success: true
      }
    })
  });

  return {
    ApiClient: {
      getInstance
    },
    apiClient: {
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

// Mock hooks
jest.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: jest.fn().mockReturnValue({
    error: null,
    handleError: jest.fn(),
    clearError: jest.fn(),
    withErrorHandling: jest.fn().mockImplementation(async (fn) => await fn())
  })
}));

// Mock Toast component
jest.mock('@/components/Toast', () => ({
  useToast: jest.fn().mockReturnValue({
    showSuccess: jest.fn(),
    showError: jest.fn()
  })
}));

// Mock router and pathname
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  usePathname: () => '/'
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

// Test wrapper with auth context
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

describe('Profile Update Functionality', () => {
  beforeEach(() => {
    localStorageMock.setItem('token', 'mock-token');
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should update the user profile correctly', async () => {
    const { rerender } = render(
      <TestWrapper>
        <ProfileForm additionalFields={null} />
      </TestWrapper>
    );

    // Wait for the form to load with user data
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Test User');
    });

    // Change name value
    const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated User');

    // Submit the form
    const updateButton = screen.getByText(/Update Profile/i);
    await userEvent.click(updateButton);

    // Verify API was called with correct data
    const apiClient = require('@/lib/api/client').ApiClient.getInstance();
    expect(apiClient.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated User'
      })
    );

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully/i)).toBeInTheDocument();
    });

    // Verify user state was updated
    rerender(
      <TestWrapper>
        <ProfileForm additionalFields={null} />
      </TestWrapper>
    );

    await waitFor(() => {
      const updatedNameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
      expect(updatedNameInput.value).toBe('Updated User');
    });
  });

  it('should handle password change correctly', async () => {
    render(
      <TestWrapper>
        <ProfileForm additionalFields={null} />
      </TestWrapper>
    );

    // Find password input fields
    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    });

    // Fill password inputs
    const currentPasswordInput = screen.getByLabelText(/Current Password/i) as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText(/New Password/i) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i) as HTMLInputElement;

    await userEvent.type(currentPasswordInput, 'oldpassword');
    await userEvent.type(newPasswordInput, 'newpassword');
    await userEvent.type(confirmPasswordInput, 'newpassword');

    // Submit the password form
    const changePasswordButton = screen.getByText(/Change Password/i);
    await userEvent.click(changePasswordButton);

    // Verify API was called with correct data
    const apiClient = require('@/lib/api/client').ApiClient.getInstance();
    expect(apiClient.changePassword).toHaveBeenCalledWith(
      'oldpassword',
      'newpassword'
    );

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/Password updated successfully/i)).toBeInTheDocument();
    });

    // Verify form was reset
    await waitFor(() => {
      expect(currentPasswordInput.value).toBe('');
      expect(newPasswordInput.value).toBe('');
      expect(confirmPasswordInput.value).toBe('');
    });
  });

  it('should validate password confirmation', async () => {
    render(
      <TestWrapper>
        <ProfileForm additionalFields={null} />
      </TestWrapper>
    );

    // Find password input fields
    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    });

    // Fill password inputs with mismatched new passwords
    const currentPasswordInput = screen.getByLabelText(/Current Password/i) as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText(/New Password/i) as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i) as HTMLInputElement;

    await userEvent.type(currentPasswordInput, 'oldpassword');
    await userEvent.type(newPasswordInput, 'newpassword');
    await userEvent.type(confirmPasswordInput, 'differentpassword');

    // Submit the password form
    const changePasswordButton = screen.getByText(/Change Password/i);
    await userEvent.click(changePasswordButton);

    // Verify error message is shown
    await waitFor(() => {
      expect(screen.getByText(/New passwords do not match/i)).toBeInTheDocument();
    });

    // Verify API was not called
    const apiClient = require('@/lib/api/client').ApiClient.getInstance();
    expect(apiClient.changePassword).not.toHaveBeenCalled();
  });
}); 