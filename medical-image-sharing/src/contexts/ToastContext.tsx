'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface Toast {
  id: string;
  message: string;
  type: AlertColor;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: AlertColor, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: AlertColor = 'info', duration = 6000) => {
      const id = Math.random().toString(36).substr(2, 9);
      addToast({ id, message, type, duration });
    },
    [addToast]
  );

  const showError = useCallback(
    (message: string, duration = 6000) => {
      showToast(message, 'error', duration);
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string, duration = 6000) => {
      showToast(message, 'success', duration);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration = 6000) => {
      showToast(message, 'info', duration);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, duration = 6000) => {
      showToast(message, 'warning', duration);
    },
    [showToast]
  );

  const handleClose = (id: string) => {
    removeToast(id);
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showError,
        showSuccess,
        showInfo,
        showWarning,
      }}
    >
      {children}
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.duration}
          onClose={() => handleClose(toast.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ bottom: `${index * 80}px` }}
        >
          <Alert
            onClose={() => handleClose(toast.id)}
            severity={toast.type}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
} 