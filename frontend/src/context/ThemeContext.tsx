import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface ThemeDef {
  id: string;
  name: string;
  desc: string;
  dark: boolean;
  sw: [string, string, string]; // bg, panel, accent swatches
}

export const THEMES: ThemeDef[] = [
  { id: 'nord', name: 'Nord', desc: 'Mặc định • Bắc cực xanh băng', dark: true, sw: ['#242933', '#2e3440', '#88c0d0'] },
  { id: 'ember', name: 'Ember', desc: 'Than ấm + hổ phách', dark: true, sw: ['#161210', '#1f1915', '#f5a524'] },
  { id: 'midnight', name: 'Midnight Teal', desc: 'IDE workspace nguyên bản', dark: true, sw: ['#0a0f0e', '#101716', '#2dd4bf'] },
  { id: 'sakura', name: 'Sakura', desc: 'Mận thẫm + hồng anh đào', dark: true, sw: ['#18121d', '#211827', '#f472b6'] },
  { id: 'gruvbox', name: 'Gruvbox', desc: 'Nâu retro cổ điển', dark: true, sw: ['#1d2021', '#282828', '#fe8019'] },
  { id: 'paper', name: 'Paper Vintage', desc: 'Bản thảo giấy ngà cổ điển', dark: false, sw: ['#f5f0e3', '#fcf9f2', '#8b2500'] },
  { id: 'frost', name: 'Frost Glacier', desc: 'Băng giá tuyết tuyền mát lạnh', dark: false, sw: ['#e5f0fb', '#ffffff', '#0284c7'] },
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

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const modeClass = dark ? 'ws-dark' : 'ws-light';
    const otherModeClass = dark ? 'ws-light' : 'ws-dark';
    const themeClass = `theme-${theme.id}`;

    root.classList.remove(otherModeClass);
    body.classList.remove(otherModeClass);
    THEMES.forEach((t) => {
      root.classList.remove(`theme-${t.id}`);
      body.classList.remove(`theme-${t.id}`);
    });
    root.classList.add(modeClass, themeClass);
    body.classList.add(modeClass, themeClass);

    return () => {
      root.classList.remove(modeClass, themeClass);
      body.classList.remove(modeClass, themeClass);
    };
  }, [dark, theme.id]);

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
