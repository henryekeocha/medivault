import { useAuth } from '@/lib/clerk/use-auth';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest } from '../types';

export class AuthService {
  constructor() {
    // No need to check localStorage as Clerk handles session management
  }

  // Check if the user is authenticated
  isAuthenticated(): boolean {
    const { isSignedIn } = useAuth();
    return isSignedIn ?? false;
  }

  // User login
  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const { handleSignIn } = useAuth();
      const result = await handleSignIn(data.email, data.password);

      if (result.success) {
        // Get the session token from Clerk
        const sessionToken = result.redirectTo;
        
        // Create or update user in our database
        try {
          const pendingRole = localStorage.getItem('pendingUserRole');
          const response = await fetch('/api/users/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
              'x-pending-role': pendingRole || ''
            }
          });

          if (!response.ok) {
            console.error('Failed to sync user with database');
            return {
              status: 'error',
              data: {
                status: 'error',
                error: {
                  message: 'Failed to sync user data'
                }
              }
            };
          }

          // Clear pending role after successful sync
          localStorage.removeItem('pendingUserRole');
        } catch (error) {
          console.error('Error syncing user:', error);
          // Continue with login even if sync fails
        }

        return {
          status: 'success',
          data: {
            status: 'success',
            data: {
              token: sessionToken
            }
          }
        };
      }

      return {
        status: 'error',
        data: {
          status: 'error',
          error: {
            message: result.error || 'Authentication failed'
          }
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        status: 'error',
        data: {
          status: 'error',
          error: {
            message: 'Failed to connect to authentication server'
          }
        }
      };
    }
  }

  // User registration
  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const { handleSignUp } = useAuth();
      const result = await handleSignUp(
        data.email,
        data.password,
        data.name.split(' ')[0],
        data.name.split(' ').slice(1).join(' '),
        data.role
      );

      if (result.success) {
        // Store role in localStorage for later use
        localStorage.setItem('pendingUserRole', data.role);
        if (data.specialty) {
          localStorage.setItem('pendingUserSpecialty', data.specialty);
        }

        return {
          status: 'success',
          data: {
            status: 'success'
          }
        };
      }

      return {
        status: 'error',
        data: {
          status: 'error',
          error: {
            message: result.error || 'Registration failed'
          }
        }
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        status: 'error',
        data: {
          status: 'error',
          error: {
            message: 'Failed to connect to authentication server'
          }
        }
      };
    }
  }

  // User logout
  async logout(): Promise<void> {
    try {
      const { signOut } = useAuth();
      await signOut();
      
      // Clear any pending data
      localStorage.removeItem('pendingUserRole');
      localStorage.removeItem('pendingUserSpecialty');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
} 