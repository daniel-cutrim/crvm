import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    // Initial: check localStorage for instant load, DB will override
    try {
      const stored = localStorage.getItem('crvm-theme') as Theme | null;
      if (stored === 'dark' || stored === 'light') return stored;
    } catch { /* noop */ }
    return 'light';
  });

  // Sync from DB when user loads
  useEffect(() => {
    if (usuario?.tema) {
      const dbTheme = usuario.tema as Theme;
      setThemeState(dbTheme);
      applyThemeToDOM(dbTheme);
      try { localStorage.setItem('crvm-theme', dbTheme); } catch { /* noop */ }
    }
  }, [usuario?.tema]);

  // Apply on mount and theme change
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeToDOM(newTheme);
    try { localStorage.setItem('crvm-theme', newTheme); } catch { /* noop */ }

    // Persist to DB
    if (usuario?.id) {
      await supabase
        .from('usuarios')
        .update({ tema: newTheme } as Record<string, unknown>)
        .eq('id', usuario.id);
    }
  }, [usuario?.id]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
