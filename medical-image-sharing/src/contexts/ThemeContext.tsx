'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, useMediaQuery, CssBaseline } from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import { blue, grey } from '@mui/material/colors';

// Create a context for the theme
interface ThemeContextType {
  isDarkMode: boolean;
  theme: string;
  toggleTheme: () => void;
  setTheme: (theme: string) => void;
}

// Create a fallback theme handler
const fallbackThemeHandler: ThemeContextType = {
  isDarkMode: false,
  theme: 'light',
  toggleTheme: () => console.warn('ThemeContext not initialized yet'),
  setTheme: () => console.warn('ThemeContext not initialized yet')
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, theme, setTheme } = useNextTheme();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Determine the current theme mode
  const currentTheme = mounted ? resolvedTheme : prefersDarkMode ? 'dark' : 'light';
  const isDarkMode = currentTheme === 'dark';

  // Debug logging
  useEffect(() => {
    if (mounted) {
      console.log('Theme state:', {
        resolvedTheme,
        theme,
        isDarkMode,
        currentTheme
      });
    }
  }, [mounted, resolvedTheme, theme, isDarkMode, currentTheme]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Create the MUI theme based on the current theme
  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: blue[500],
      },
      background: {
        default: isDarkMode ? '#121212' : '#ffffff',
        paper: isDarkMode ? '#1e1e1e' : '#ffffff',
      },
      text: {
        primary: isDarkMode ? '#ffffff' : '#000000',
        secondary: isDarkMode ? grey[400] : grey[700],
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDarkMode ? '#121212' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#000000',
            transition: 'background-color 0.3s ease, color 0.3s ease',
          },
          // Add any additional global styles here
        },
      },
    },
  });

  // Context values
  const contextValue = {
    isDarkMode,
    theme: theme || 'system',
    toggleTheme: () => {
      const newTheme = isDarkMode ? 'light' : 'dark';
      console.log(`Toggling theme to: ${newTheme}`);
      setTheme(newTheme);
    },
    setTheme,
  };

  if (!mounted) {
    return (
      <ThemeContext.Provider value={fallbackThemeHandler}>
        <MuiThemeProvider theme={muiTheme}>
          <CssBaseline />
          <div style={{ visibility: 'hidden' }}>{children}</div>
        </MuiThemeProvider>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme context
export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    console.warn('useThemeContext used outside ThemeProvider, returning fallback');
    return fallbackThemeHandler;
  }
  return context;
}; 