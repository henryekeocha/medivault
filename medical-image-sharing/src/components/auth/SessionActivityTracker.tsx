'use client';

import { useEffect, useRef } from 'react';
import { useCognitoAuthContext } from '@/contexts/CognitoAuthContext';

interface SessionActivityTrackerProps {
  // Activity events to listen for (defaults to common user interaction events)
  events?: string[];
  // Minimum time (in ms) between session extensions to prevent too frequent calls
  throttleTime?: number;
}

/**
 * SessionActivityTracker Component
 * Monitors user activity and extends the session when activity is detected
 * This component is invisible and should be included in the main layout
 */
export default function SessionActivityTracker({
  events = [
    'mousedown',
    'mousemove',
    'keydown',
    'scroll',
    'touchstart',
    'click',
    'focus'
  ],
  throttleTime = 60000 // Default: 1 minute between session extensions
}: SessionActivityTrackerProps) {
  const { isAuthenticated, extendSession } = useCognitoAuthContext();
  const lastActivityTime = useRef<number>(Date.now());
  
  // Function to handle user activity
  const handleUserActivity = () => {
    if (!isAuthenticated) return;
    
    const now = Date.now();
    // Only extend the session if enough time has passed since the last extension
    if (now - lastActivityTime.current >= throttleTime) {
      lastActivityTime.current = now;
      // Extend the session when user is active
      extendSession().catch(err => {
        console.error('Failed to extend session:', err);
      });
    }
  };
  
  // Set up event listeners for user activity
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Add event listeners for all specified events
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });
    
    // Clean up event listeners on unmount or when authentication status changes
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isAuthenticated, events, throttleTime]);
  
  // This component doesn't render anything visible
  return null;
} 