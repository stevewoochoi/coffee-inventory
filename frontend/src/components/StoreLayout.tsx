import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import NotificationBanner from '@/components/NotificationBanner';
import { storeNavGroups, storeBottomTabs } from '@/config/storeNavigation';
import { StoreDesktopDropdown } from './nav/StoreDesktopDropdown';

export function StoreLayout() {
  const { logout, user } = useAuthStore();
  const { t, i18n } = useTranslation();
  const { theme } = useThemeStore();
  const location = useLocation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[hsl(var(--background))]">
      {/* Desktop header */}
      <header className={`${theme.headerBg} text-white shadow`}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">{t('auth.storeTitle')}</h1>
            <nav className="hidden md:flex gap-1 items-center">
              {storeNavGroups.map((group) => (
                <StoreDesktopDropdown
                  key={group.key}
                  group={group}
                  headerHover={theme.headerHover}
                  headerText={theme.headerText}
                />
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
      <main className="flex-1 overflow-y-auto px-4 py-6 md:overflow-visible">
        <NotificationBanner />
        <Outlet />
      </main>

      {/* Mobile bottom navigation — 4 tabs */}
      <nav className="md:hidden shrink-0 bg-white border-t border-gray-200 z-50 sticky bottom-0 safe-area-bottom">
        <div className="flex">
          {storeBottomTabs.map((tab) => {
            const isActive = tab.to === '/store/menu'
              ? location.pathname === '/store/menu'
              : tab.to === '/store/dashboard'
                ? location.pathname === '/store/dashboard'
                : tab.to === '/store/ordering'
                  ? location.pathname === '/store/ordering' || (location.pathname.startsWith('/store/ordering/') && location.pathname !== '/store/ordering/new')
                  : tab.to === '/store/ordering/new'
                    ? location.pathname === '/store/ordering/new'
                    : location.pathname.startsWith(tab.to);

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-[hsl(var(--primary))] border-t-2 border-[hsl(var(--primary))] bg-[hsl(var(--accent))]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5 mb-0.5" />
                {t(tab.key)}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
