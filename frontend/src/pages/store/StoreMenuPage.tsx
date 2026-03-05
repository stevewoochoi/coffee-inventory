import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { storeMenuGroups } from '@/config/storeNavigation';

export default function StoreMenuPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">{t('storeMenu.title')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {storeMenuGroups.map((group) => (
          <div
            key={group.key}
            className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <group.icon className="w-5 h-5 text-[hsl(var(--primary))]" />
              <h3 className="font-semibold text-[hsl(var(--foreground))]">{t(group.key)}</h3>
            </div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors min-h-[44px] text-left"
                >
                  <item.icon className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  {t(item.key)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
