import axios from 'axios';

/**
 * Utility function to sync a user between Clerk and our database
 * This handles both client-side and server-side sync attempts
 */
export async function syncUser(clerkId: string, role: string = 'PATIENT') {
  try {
    console.log(`Attempting to sync user ${clerkId} with role ${role}`);
    
    // Get a token if available
    let token = '';
    if (typeof window !== 'undefined') {
      try {
        if (window.Clerk?.session) {
          token = await window.Clerk.session.getToken();
          console.log('Successfully obtained Clerk token:', token ? 'Token present' : 'No token');
        } else {
          console.warn('Clerk session not found');
        }
      } catch (tokenError) {
        console.error('Error getting Clerk token:', tokenError);
      }
    }
    
    // Try direct backend API first, which is most reliable
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      console.log(`Attempting to sync with backend API at ${backendUrl}/api/auth/sync/${clerkId}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Added authorization token to request');
      } else {
        console.warn('No authorization token available for request');
      }
      
      // Add force flag to ensure we always try to sync, even if user exists
      const backendResponse = await axios.post(
        `${backendUrl}/api/auth/sync/${clerkId}`,
        { role, force: true },
        { 
          headers,
          // Increase timeout for sync operations
          timeout: 10000
        }
      );
      
      if (backendResponse.status === 200 && backendResponse.data?.success) {
        console.log('Backend sync successful:', backendResponse.data);
        return {
          success: true,
          user: backendResponse.data.user || backendResponse.data.data?.user,
          source: 'backend'
        };
      } else {
        throw new Error(`Backend returned unexpected response: ${backendResponse.status} ${JSON.stringify(backendResponse.data)}`);
      }
    } catch (backendError) {
      // Log detailed error information
      if (axios.isAxiosError(backendError)) {
        console.error('Backend sync failed with status:', backendError.response?.status);
        console.error('Error response:', backendError.response?.data);
        
        // Try to use the 127.0.0.1 address if localhost failed
        if (backendError.message.includes('Network Error')) {
          try {
            console.log('Trying with IP address 127.0.0.1 instead of localhost...');
            // Create a copy of the headers for this request
            const ipHeaders: Record<string, string> = {
              'Content-Type': 'application/json'
            };
            
            if (token) {
              ipHeaders['Authorization'] = `Bearer ${token}`;
            }
            
            const ipResponse = await axios.post(
              `http://127.0.0.1:3001/api/auth/sync/${clerkId}`,
              { role, force: true },
              { 
                headers: ipHeaders,
                timeout: 10000
              }
            );
            
            if (ipResponse.status === 200 && ipResponse.data?.success) {
              console.log('IP-based sync successful:', ipResponse.data);
              return {
                success: true,
                user: ipResponse.data.user || ipResponse.data.data?.user,
                source: 'backend-ip'
              };
            }
          } catch (ipError) {
            console.error('IP-based sync also failed:', ipError);
          }
        }
      } else {
        console.error('Backend sync failed with error:', backendError);
      }
      
      console.log('Trying Next.js API route as fallback...');
      
      // If backend direct call fails, try through the Next.js API
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        // Add token if available
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const nextResponse = await axios.post(
          `/api/auth/sync/${clerkId}`,
          { role, force: true },
          { 
            headers,
            timeout: 10000 
          }
        );
        
        if (nextResponse.status === 200 && nextResponse.data?.success) {
          console.log('Next.js API sync successful:', nextResponse.data);
          return {
            success: true,
            user: nextResponse.data.user || nextResponse.data.data?.user,
            source: 'next'
          };
        } else {
          throw new Error(`Next.js API returned unexpected response: ${nextResponse.status} ${JSON.stringify(nextResponse.data)}`);
        }
      } catch (nextError) {
        if (axios.isAxiosError(nextError)) {
          console.error('Next.js API sync failed with status:', nextError.response?.status);
          console.error('Error response:', nextError.response?.data);
        } else {
          console.error('Next.js API sync failed with error:', nextError);
        }
        
        // Check if we have necessary data in Clerk to return a manual user profile
        try {
          if (typeof window !== 'undefined' && window.Clerk?.user) {
            const user = window.Clerk.user;
            const email = user.primaryEmailAddress?.emailAddress;
            const name = user.fullName;
            
            if (email && name) {
              console.log('Creating fallback user profile from Clerk data');
              return {
                success: true,
                user: {
                  id: clerkId,
                  email,
                  name,
                  role
                },
                source: 'clerk-fallback'
              };
            }
          }
        } catch (clerkError) {
          console.error('Failed to get Clerk user data for fallback:', clerkError);
        }
        
        // Both methods failed, return combined error
        throw new Error(`Both sync methods failed. Backend error: ${backendError}. Next.js error: ${nextError}`);
      }
    }
  } catch (error) {
    console.error('All sync methods failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Helper function for creating a test user
export async function createTestUser(clerkId: string, userData: any = {}) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    
    // Get a token if available
    let token = '';
    if (typeof window !== 'undefined' && window.Clerk?.session) {
      try {
        token = await window.Clerk.session.getToken();
      } catch (tokenError) {
        console.error('Error getting Clerk token:', tokenError);
      }
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Add token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await axios.post(
      `${backendUrl}/api/auth/test-user`,
      {
        clerkId,
        ...userData
      },
      { headers }
    );
    
    return {
      success: true,
      user: response.data.user
    };
  } catch (error) {
    console.error('Failed to create test user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 