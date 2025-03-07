import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

interface AccessibilitySettings {
  isHighContrast: boolean;
  fontSize: 'normal' | 'large' | 'x-large' | 'xx-large' | 'xxx-large' | 'xxxx-large' | 'xxxxx-large';
  isScreenReaderOptimized: boolean;
  reduceMotion: boolean;
  letterSpacing: 'normal' | 'wide';
  lineHeight: 'normal' | 'wide';
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  toggleHighContrast: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  toggleScreenReader: () => void;
  toggleReduceMotion: () => void;
  toggleLetterSpacing: () => void;
  toggleLineHeight: () => void;
  announceToScreenReader: (message: string) => void;
  isLightMode: boolean;
}

const defaultSettings: AccessibilitySettings = {
  isHighContrast: false,
  fontSize: 'normal',
  isScreenReaderOptimized: false,
  reduceMotion: false,
  letterSpacing: 'normal',
  lineHeight: 'normal',
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accessibilitySettings');
      return saved ? JSON.parse(saved) : defaultSettings;
    }
    return defaultSettings;
  });

  // Live region for screen reader announcements
  const [announcement, setAnnouncement] = useState('');
  const isLightMode = theme !== 'dark';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
      
      // Apply accessibility classes to body
      document.body.classList.toggle('high-contrast', settings.isHighContrast);
      document.body.classList.toggle('reduce-motion', settings.reduceMotion);
      document.body.classList.toggle('high-contrast-light', settings.isHighContrast && isLightMode);
      document.body.classList.toggle('high-contrast-dark', settings.isHighContrast && !isLightMode);
      document.body.dataset.fontSize = settings.fontSize;
      document.body.dataset.letterSpacing = settings.letterSpacing;
      document.body.dataset.lineHeight = settings.lineHeight;
    }
  }, [settings, isLightMode]);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const toggleHighContrast = () => {
    setSettings(prev => ({ ...prev, isHighContrast: !prev.isHighContrast }));
    announceToScreenReader(`High contrast mode ${!settings.isHighContrast ? 'enabled' : 'disabled'}`);
  };

  const increaseFontSize = () => {
    setSettings(prev => ({
      ...prev,
      fontSize: getFontSizeIncrement(prev.fontSize),
    }));
    announceToScreenReader('Font size increased');
  };

  const decreaseFontSize = () => {
    setSettings(prev => ({
      ...prev,
      fontSize: getFontSizeDecrement(prev.fontSize),
    }));
    announceToScreenReader('Font size decreased');
  };

  const getFontSizeIncrement = (currentSize: AccessibilitySettings['fontSize']) => {
    const sizes: AccessibilitySettings['fontSize'][] = [
      'normal',
      'large',
      'x-large',
      'xx-large',
      'xxx-large',
      'xxxx-large',
      'xxxxx-large'
    ];
    const currentIndex = sizes.indexOf(currentSize);
    return currentIndex < sizes.length - 1 ? sizes[currentIndex + 1] : currentSize;
  };

  const getFontSizeDecrement = (currentSize: AccessibilitySettings['fontSize']) => {
    const sizes: AccessibilitySettings['fontSize'][] = [
      'normal',
      'large',
      'x-large',
      'xx-large',
      'xxx-large',
      'xxxx-large',
      'xxxxx-large'
    ];
    const currentIndex = sizes.indexOf(currentSize);
    return currentIndex > 0 ? sizes[currentIndex - 1] : currentSize;
  };

  const toggleScreenReader = () => {
    setSettings(prev => ({
      ...prev,
      isScreenReaderOptimized: !prev.isScreenReaderOptimized,
    }));
    announceToScreenReader(`Screen reader optimization ${!settings.isScreenReaderOptimized ? 'enabled' : 'disabled'}`);
  };

  const toggleReduceMotion = () => {
    setSettings(prev => ({ ...prev, reduceMotion: !prev.reduceMotion }));
    announceToScreenReader(`Reduced motion ${!settings.reduceMotion ? 'enabled' : 'disabled'}`);
  };

  const toggleLetterSpacing = () => {
    setSettings(prev => ({
      ...prev,
      letterSpacing: prev.letterSpacing === 'normal' ? 'wide' : 'normal',
    }));
    announceToScreenReader(`Letter spacing ${settings.letterSpacing === 'normal' ? 'increased' : 'normalized'}`);
  };

  const toggleLineHeight = () => {
    setSettings(prev => ({
      ...prev,
      lineHeight: prev.lineHeight === 'normal' ? 'wide' : 'normal',
    }));
    announceToScreenReader(`Line height ${settings.lineHeight === 'normal' ? 'increased' : 'normalized'}`);
  };

  const announceToScreenReader = (message: string) => {
    setAnnouncement(message);
    // Clear announcement after screen reader has time to read it
    setTimeout(() => setAnnouncement(''), 1000);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSettings,
        toggleHighContrast,
        increaseFontSize,
        decreaseFontSize,
        toggleScreenReader,
        toggleReduceMotion,
        toggleLetterSpacing,
        toggleLineHeight,
        announceToScreenReader,
        isLightMode,
      }}
    >
      {children}
      {/* Screen reader announcement area */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
      >
        {announcement}
      </div>
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}; 