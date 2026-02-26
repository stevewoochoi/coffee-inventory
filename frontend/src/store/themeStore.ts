import { create } from 'zustand';
import { themePresets, getThemeById, applyTheme, type ThemePreset } from '@/lib/themes';

interface ThemeState {
  themeId: string;
  theme: ThemePreset;
  setTheme: (id: string) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeId: 'modern-blue',
  theme: themePresets[0],

  setTheme: (id: string) => {
    const theme = getThemeById(id);
    applyTheme(theme);
    localStorage.setItem('app-theme', id);
    set({ themeId: id, theme });
  },

  initTheme: () => {
    const savedId = localStorage.getItem('app-theme') || 'modern-blue';
    const theme = getThemeById(savedId);
    applyTheme(theme);
    set({ themeId: savedId, theme });
  },
}));
