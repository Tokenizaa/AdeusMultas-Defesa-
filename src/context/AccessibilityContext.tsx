import React, { createContext, useContext, useEffect, useState } from 'react';

interface AccessibilityContextType {
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  fontSizeMultiplier: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('govbr_high_contrast') === 'true';
  });

  const [fontSizeMultiplier, setFontSizeMultiplier] = useState<number>(() => {
    const saved = localStorage.getItem('govbr_font_size');
    return saved ? parseFloat(saved) : 1;
  });

  const toggleHighContrast = () => {
    setIsHighContrast((prev) => {
      const next = !prev;
      localStorage.setItem('govbr_high_contrast', String(next));
      return next;
    });
  };

  const increaseFontSize = () => {
    setFontSizeMultiplier((prev) => {
      const next = Math.min(prev + 0.1, 1.4);
      localStorage.setItem('govbr_font_size', String(next));
      return next;
    });
  };

  const decreaseFontSize = () => {
    setFontSizeMultiplier((prev) => {
      const next = Math.max(prev - 0.1, 0.8);
      localStorage.setItem('govbr_font_size', String(next));
      return next;
    });
  };

  const resetFontSize = () => {
    setFontSizeMultiplier(1);
    localStorage.setItem('govbr_font_size', '1');
  };

  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [isHighContrast]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * fontSizeMultiplier}px`;
  }, [fontSizeMultiplier]);

  // Global Keyboard Shortcuts (eMAG / GOV.BR: Alt + 1, Alt + 2, Alt + 3, Alt + 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
              mainContent.focus();
              mainContent.scrollIntoView({ behavior: 'smooth' });
            }
            break;
          case '2':
            e.preventDefault();
            const mainMenu = document.getElementById('main-menu');
            if (mainMenu) {
              mainMenu.focus();
              mainMenu.scrollIntoView({ behavior: 'smooth' });
            }
            break;
          case '3':
            e.preventDefault();
            const mainSearch = document.getElementById('main-search') as HTMLInputElement | null;
            if (mainSearch) {
              mainSearch.focus();
              mainSearch.scrollIntoView({ behavior: 'smooth' });
            }
            break;
          case '4':
            e.preventDefault();
            const footer = document.getElementById('footer');
            if (footer) {
              footer.focus();
              footer.scrollIntoView({ behavior: 'smooth' });
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        isHighContrast,
        toggleHighContrast,
        fontSizeMultiplier,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
