import React from 'react';
import { useCognitoAuth } from '@/hooks/useCognitoAuth';
import SessionTimeout from './SessionTimeout';
import SessionActivityTracker from './SessionActivityTracker';

interface SessionManagerProps {
  children?: React.ReactNode;
  warningTime?: number; // Time in seconds before expiry to show warning
}

/**
 * SessionManager component that combines session timeout warnings and activity tracking
 * to provide a complete session management solution
 */
const SessionManager: React.FC<SessionManagerProps> = ({ 
  children,
  warningTime = 300 // Show warning 5 minutes before session expiry by default
}) => {
  const auth = useCognitoAuth();
  
  // Only render session management components if user is authenticated
  if (!auth.isAuthenticated) {
    return <>{children}</>;
  }
  
  return (
    <>
      {/* Track user activity to extend session automatically */}
      <SessionActivityTracker />
      
      {/* Display warning when session is about to expire */}
      <SessionTimeout warningTime={warningTime} />
      
      {children}
    </>
  );
};

export default SessionManager; 