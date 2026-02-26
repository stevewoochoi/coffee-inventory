import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store/themeStore';
import { themePresets } from '@/lib/themes';

export default function ThemeSettingsPage() {
  const { themeId, setTheme } = useThemeStore();
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">{t('settings.themeTitle')}</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {themePresets.map((preset) => {
          const isSelected = themeId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => setTheme(preset.id)}
              className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                  : 'border-gray-200 hover:border-gray-400 hover:shadow'
              }`}
            >
              {/* Color preview swatches */}
              <div className="flex gap-1 mb-3">
                {preset.previewColors.map((color, i) => (
                  <div
                    key={i}
                    className="h-8 flex-1 rounded-md"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Mini UI preview */}
              <div className="rounded-lg overflow-hidden border border-gray-200 mb-3">
                <div
                  className="h-6 flex items-center px-2"
                  style={{ backgroundColor: preset.previewColors[0] }}
                >
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-6 h-2 rounded-full bg-white/30" />
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 p-2 space-y-1">
                  <div className="h-2 w-3/4 bg-gray-300 rounded" />
                  <div className="flex gap-1">
                    <div className="h-6 flex-1 bg-gray-200 rounded" />
                    <div className="h-6 flex-1 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>

              {/* Theme name */}
              <div className="font-medium text-sm">{preset.name}</div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
