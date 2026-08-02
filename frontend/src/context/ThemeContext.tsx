import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface ThemeDef {
  id: string;
  name: string;
  desc: string;
  dark: boolean;
  sw: [string, string, string]; // bg, panel, accent swatches
}

export const THEMES: ThemeDef[] = [
  { id: 'midnight', name: 'Midnight Teal', desc: 'IDE workspace nguyên bản', dark: true, sw: ['#0a0f0e', '#101716', '#2dd4bf'] },
  { id: 'ember', name: 'Ember', desc: 'Than ấm + hổ phách', dark: true, sw: ['#161210', '#1d1815', '#f5a524'] },
  { id: 'nord', name: 'Nord', desc: 'Mặc định • Bắc cực xanh băng', dark: true, sw: ['#272c36', '#2e3440', '#88c0d0'] },
  { id: 'sakura', name: 'Sakura', desc: 'Mận thẫm + hồng anh đào', dark: true, sw: ['#17121a', '#1e1723', '#f472b6'] },
  { id: 'gruvbox', name: 'Gruvbox', desc: 'Nâu retro cổ điển', dark: true, sw: ['#1d2021', '#282828', '#fe8019'] },
  { id: 'paper', name: 'Paper', desc: 'Giấy ngà học thuật', dark: false, sw: ['#f4f1e8', '#ffffff', '#0f766e'] },
  { id: 'frost', name: 'Frost', desc: 'Sương sớm ban ngày', dark: false, sw: ['#eef2f6', '#ffffff', '#0369a1'] },
];

interface ThemeContextType {
  theme: ThemeDef;
  dark: boolean;
  setThemeId: (id: string) => void;
  toggleTheme: () => void;
  themes: ThemeDef[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(() => {
    const saved = localStorage.getItem('jh-theme');
    return THEMES.some((t) => t.id === saved) ? (saved as string) : 'nord';
  });

  /* nhớ theme dark/light cuối cùng người dùng đã chọn */
  const [lastDark, setLastDark] = useState<string>(() => localStorage.getItem('jh-theme-dark') || 'nord');
  const [lastLight, setLastLight] = useState<string>(() => localStorage.getItem('jh-theme-light') || 'paper');

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const dark = theme.dark;

  const setThemeId = (id: string) => {
    const target = THEMES.find((t) => t.id === id);
    if (!target) return;
    setThemeIdState(id);
    localStorage.setItem('jh-theme', id);
    if (target.dark) {
      setLastDark(id);
      localStorage.setItem('jh-theme-dark', id);
    } else {
      setLastLight(id);
      localStorage.setItem('jh-theme-light', id);
    }
  };

  /* chuyển dark↔light nhưng GIỮ theme đã chọn của mỗi chế độ */
  const toggleTheme = () => setThemeId(dark ? lastLight : lastDark);

  useEffect(() => {
    document.documentElement.style.background = theme.sw[0];
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, dark, setThemeId, toggleTheme, themes: THEMES }}>
      <div className={`${dark ? 'ws-dark' : 'ws-light'} theme-${theme.id} min-h-screen bg-[var(--ws-bg)]`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  const fallback = THEMES.find((t) => t.id === 'nord') ?? THEMES[0];
  if (!ctx) return { theme: fallback, dark: true, setThemeId: () => {}, toggleTheme: () => {}, themes: THEMES };
  return ctx;
}
