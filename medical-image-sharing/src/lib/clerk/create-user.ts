import axios from 'axios';

/**
 * Utility function to manually create a user in the database for a Clerk user
 * This can be called from the browser console to fix authentication issues
 */
export async function createUserFromClerk(maxRetries = 3) {
  try {
    if (!window.Clerk) {
      console.error('Clerk not initialized');
      return false;
    }
    
    const userId = window.Clerk.user?.id;
    if (!userId) {
      console.error('No Clerk user found');
      return false;
    }
    
    // Check if we've recently attempted this to avoid infinite loops
    const lastAttempt = localStorage.getItem('lastSyncAttempt');
    const now = Date.now();
    
    if (lastAttempt && (now - parseInt(lastAttempt)) < 10000) {
      console.log('Sync was attempted recently, waiting to prevent loop');
      return false;
    }
    
    // Set the last attempt timestamp
    localStorage.setItem('lastSyncAttempt', now.toString());
    
    // Get user information from Clerk
    const userInfo = {
      id: userId,
      email: window.Clerk.user?.primaryEmailAddress?.emailAddress,
      name: `${window.Clerk.user?.firstName || ''} ${window.Clerk.user?.lastName || ''}`.trim(),
      role: (window.Clerk.user?.publicMetadata?.role || window.Clerk.user?.unsafeMetadata?.role || 'PATIENT') as string
    };
    
    console.log(`Attempting to sync user data for: ${userInfo.name} (${userInfo.email})`);
    
    // Get token for authentication
    const token = await window.Clerk.session?.getToken();
    if (!token) {
      console.error('No authentication token available');
      return false;
    }
    
    let success = false;
    let retryCount = 0;
    
    // Multiple sync strategies with retry logic
    while (retryCount < maxRetries && !success) {
      console.log(`Sync attempt ${retryCount + 1}/${maxRetries}`);
      
      // Try the backend sync endpoint first (most reliable)
      try {
        console.log(`Making API call to sync backend with Clerk ID: ${userId}`);
        const syncResponse = await fetch(`/api/auth/sync/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            role: userInfo.role
          })
        });
        
        if (syncResponse.ok) {
          const data = await syncResponse.json();
          if (data.success) {
            console.log('Sync successful:', data);
            success = true;
            break;
          } else {
            console.error('Sync response indicated failure:', data);
          }
        } else {
          console.error(`Sync failed with status: ${syncResponse.status}`);
        }
      } catch (syncError) {
        console.error('Error calling sync endpoint:', syncError);
      }
      
      // Fallback to test-user endpoint if sync fails
      if (!success) {
        try {
          console.log('Trying test-user endpoint as fallback');
          const testUserResponse = await fetch('/api/auth/test-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              clerkId: userId,
              email: userInfo.email || 'user@example.com',
              name: userInfo.name || 'User',
              role: userInfo.role
            })
          });
          
          if (testUserResponse.ok) {
            const data = await testUserResponse.json();
            if (data.success) {
              console.log('User creation successful via test-user endpoint:', data);
              success = true;
              break;
            } else {
              console.error('Test-user response indicated failure:', data);
            }
          } else {
            console.error(`Test-user failed with status: ${testUserResponse.status}`);
          }
        } catch (testUserError) {
          console.error('Error calling test-user endpoint:', testUserError);
        }
      }
      
      // Increment retry count and add a delay before next attempt
      retryCount++;
      if (!success && retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    if (success) {
      // Clear the timestamp to allow future attempts if needed
      localStorage.removeItem('lastSyncAttempt');
      
      // Update the user's metadata to record successful sync
      try {
        await window.Clerk.user?.update({
          unsafeMetadata: {
            ...window.Clerk.user.unsafeMetadata,
            dbSynced: true,
            syncTimestamp: new Date().toISOString()
          }
        });
      } catch (metadataError) {
        console.error('Error updating metadata:', metadataError);
        // Non-fatal, continue
      }
    } else {
      // Set a longer timeout if all attempts fail
      setTimeout(() => {
        localStorage.removeItem('lastSyncAttempt');
      }, 30000);
    }
    
    return success;
  } catch (error) {
    console.error('Fatal error during user sync:', error);
    localStorage.removeItem('lastSyncAttempt'); // Clear to allow future attempts
    return false;
  }
}

// Add to window for easy access from the console
if (typeof window !== 'undefined') {
  (window as any).createUserFromClerk = createUserFromClerk;
  (window as any).fixUserSync = () => {
    const userId = window.Clerk?.user?.id;
    if (userId) {
      console.log(`Manual sync triggered for user: ${userId}`);
      createUserFromClerk();
    } else {
      console.error('No user ID available for manual sync');
    }
  };
} 