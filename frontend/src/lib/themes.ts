export interface ThemePreset {
  id: string;
  name: string;
  nameKey: string;
  colors: Record<string, string>;
  headerBg: string;
  headerHover: string;
  headerText: string;
  buttonBg: string;
  buttonHover: string;
  previewColors: string[];
}

export const themePresets: ThemePreset[] = [
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    nameKey: 'theme.corporateBlue',
    colors: {
      '--primary': '204 100% 40%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '220 15% 96%',
      '--secondary-foreground': '218 30% 16%',
      '--ring': '204 100% 40%',
      '--background': '222 20% 97%',
      '--foreground': '218 30% 16%',
      '--card': '0 0% 100%',
      '--card-foreground': '218 30% 16%',
      '--muted': '220 15% 96%',
      '--muted-foreground': '218 10% 44%',
      '--accent': '204 100% 95%',
      '--accent-foreground': '204 100% 30%',
      '--border': '222 15% 91%',
      '--input': '222 15% 91%',
    },
    headerBg: 'bg-white',
    headerHover: 'bg-[#0077cc]',
    headerText: 'text-[#69707d]',
    buttonBg: 'bg-[#0077cc]',
    buttonHover: 'hover:bg-[#005ea3]',
    previewColors: ['#0077cc', '#005ea3', '#f7f8fc'],
  },
  {
    id: 'coffee-classic',
    name: 'Coffee Classic',
    nameKey: 'theme.coffeeClassic',
    colors: {
      '--primary': '25 62% 30%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '30 20% 96%',
      '--secondary-foreground': '15 25% 15%',
      '--ring': '25 62% 30%',
      '--background': '30 50% 97%',
      '--foreground': '15 25% 15%',
      '--card': '0 0% 100%',
      '--card-foreground': '15 25% 15%',
      '--muted': '30 30% 94%',
      '--muted-foreground': '15 10% 45%',
      '--accent': '30 30% 94%',
      '--accent-foreground': '15 25% 15%',
      '--border': '25 20% 88%',
      '--input': '25 20% 88%',
    },
    headerBg: 'bg-white',
    headerHover: 'bg-amber-800',
    headerText: 'text-amber-900',
    buttonBg: 'bg-amber-800',
    buttonHover: 'hover:bg-amber-900',
    previewColors: ['#78350F', '#92400E', '#B45309'],
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    nameKey: 'theme.forestGreen',
    colors: {
      '--primary': '152 60% 30%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '140 20% 96%',
      '--secondary-foreground': '150 30% 12%',
      '--ring': '152 60% 30%',
      '--background': '140 20% 97%',
      '--foreground': '150 30% 12%',
      '--card': '0 0% 100%',
      '--card-foreground': '150 30% 12%',
      '--muted': '140 25% 94%',
      '--muted-foreground': '150 10% 45%',
      '--accent': '140 25% 94%',
      '--accent-foreground': '150 30% 12%',
      '--border': '140 20% 89%',
      '--input': '140 20% 89%',
    },
    headerBg: 'bg-white',
    headerHover: 'bg-emerald-700',
    headerText: 'text-emerald-900',
    buttonBg: 'bg-emerald-700',
    buttonHover: 'hover:bg-emerald-800',
    previewColors: ['#065F46', '#047857', '#059669'],
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    nameKey: 'theme.darkMode',
    colors: {
      '--primary': '204 100% 50%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '217 33% 17%',
      '--secondary-foreground': '0 0% 98%',
      '--ring': '204 100% 50%',
      '--background': '222 47% 6%',
      '--foreground': '0 0% 95%',
      '--card': '222 40% 10%',
      '--card-foreground': '0 0% 95%',
      '--popover': '222 40% 10%',
      '--popover-foreground': '0 0% 95%',
      '--muted': '222 30% 14%',
      '--muted-foreground': '215 16% 60%',
      '--accent': '222 30% 14%',
      '--accent-foreground': '0 0% 95%',
      '--destructive': '0 62% 40%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '222 20% 18%',
      '--input': '222 20% 18%',
    },
    headerBg: 'bg-gray-900',
    headerHover: 'bg-blue-600',
    headerText: 'text-gray-400',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
    previewColors: ['#111827', '#1F2937', '#3B82F6'],
  },
];

export function getThemeById(id: string): ThemePreset {
  return themePresets.find(t => t.id === id) || themePresets[0];
}

export function applyTheme(theme: ThemePreset) {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
