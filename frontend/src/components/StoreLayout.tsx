import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import NotificationBanner from '@/components/NotificationBanner';

const navKeys = [
  { to: '/store/dashboard', key: 'nav.dashboard' },
  { to: '/store/inventory', key: 'nav.inventory' },
  { to: '/store/receiving', key: 'nav.receiving' },
  { to: '/store/waste', key: 'nav.waste' },
  { to: '/store/ordering', key: 'nav.ordering' },
  { to: '/store/expiry', key: 'nav.expiry' },
  { to: '/store/physical-count', key: 'nav.count' },
  { to: '/store/reports', key: 'nav.reports' },
];

export function StoreLayout() {
  const { logout, user } = useAuthStore();
  const { t, i18n } = useTranslation();
  const { theme } = useThemeStore();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16 md:pb-0">
      {/* Desktop header */}
      <header className={`${theme.headerBg} text-white shadow`}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">{t('auth.storeTitle')}</h1>
            <nav className="hidden md:flex gap-1">
              {navKeys.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                      isActive ? `${theme.headerHover} text-white` : `${theme.headerText} hover:bg-white/10`
                    }`
                  }
                >
                  {t(item.key)}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={i18n.language?.substring(0, 2) || 'en'}
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-white/10 text-white text-sm rounded px-2 py-1 border border-white/20 min-h-[44px]"
            >
              <option value="en">EN</option>
              <option value="ko">KO</option>
              <option value="ja">JA</option>
            </select>
            <span className={`text-sm ${theme.headerText} hidden sm:inline`}>{user?.email}</span>
            <button
              onClick={logout}
              className={`text-sm ${theme.headerText} hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center`}
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-6">
        <NotificationBanner />
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex overflow-x-auto">
          {navKeys.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 min-w-[60px] py-3 text-center text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-[hsl(var(--primary))] border-t-2 border-[hsl(var(--primary))] bg-[hsl(var(--accent))]'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
