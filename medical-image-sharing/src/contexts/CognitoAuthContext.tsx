import React, { createContext, useContext, ReactNode } from 'react';
import { useCognitoAuth } from '@/hooks/useCognitoAuth';

// Create the context
const CognitoAuthContext = createContext<ReturnType<typeof useCognitoAuth> | undefined>(undefined);

// Props for the provider component
interface CognitoAuthProviderProps {
  children: ReactNode;
}

/**
 * Provider component for Cognito authentication
 * @param props Component props
 * @returns Provider component
 */
export function CognitoAuthProvider({ children }: CognitoAuthProviderProps) {
  const auth = useCognitoAuth();

  return (
    <CognitoAuthContext.Provider value={auth}>
      {children}
    </CognitoAuthContext.Provider>
  );
}

/**
 * Hook for using Cognito authentication context
 * @returns Cognito authentication context
 */
export function useCognitoAuthContext() {
  const context = useContext(CognitoAuthContext);
  
  if (context === undefined) {
    throw new Error('useCognitoAuthContext must be used within a CognitoAuthProvider');
  }
  
  return context;
}

/**
 * Higher-order component for protecting routes that require authentication
 * @param Component Component to protect
 * @returns Protected component
 */
export function withCognitoAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithCognitoAuth(props: P) {
    const { isAuthenticated, isLoading, user } = useCognitoAuthContext();
    
    // Show loading state
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
      // In a real application, you would redirect to the login page
      // For this example, we'll just show a message
      return <div>Please log in to access this page</div>;
    }
    
    // Render the protected component
    return <Component {...props} />;
  };
}

/**
 * Higher-order component for protecting routes that require specific roles
 * @param Component Component to protect
 * @param allowedRoles Roles that are allowed to access the component
 * @returns Protected component
 */
export function withCognitoRole<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: string[]
) {
  return function WithCognitoRole(props: P) {
    const { isAuthenticated, isLoading, user } = useCognitoAuthContext();
    
    // Show loading state
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
      return <div>Please log in to access this page</div>;
    }
    
    // Check if user has required role
    if (!allowedRoles.includes(user.role)) {
      return <div>You do not have permission to access this page</div>;
    }
    
    // Render the protected component
    return <Component {...props} />;
  };
} 