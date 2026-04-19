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
    <div className="min-h-[100dvh] flex flex-col bg-[#f7f8fc]">
      {/* Desktop header */}
      <header className="bg-white border-b border-[#e8eaf0] shadow-sm">
        <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-[#1a1c21]">{t('auth.storeTitle')}</h1>
            <nav className="hidden md:flex gap-1 items-center">
              {storeNavGroups.map((group) => (
                <StoreDesktopDropdown
                  key={group.key}
                  group={group}
                  headerHover="bg-[#0077cc] text-white"
                  headerText="text-[#69707d]"
                />
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={i18n.language?.substring(0, 2) || 'en'}
              onChange={(e) => changeLanguage(e.target.value)}
              className="h-9 rounded-md border border-[#e8eaf0] px-2 text-sm bg-white text-[#343741]"
            >
              <option value="en">EN</option>
              <option value="ko">KO</option>
              <option value="ja">JA</option>
            </select>
            <div className="w-8 h-8 rounded-full bg-[rgba(0,119,204,0.18)] text-[#0077cc] flex items-center justify-center text-xs font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-[#69707d] hidden sm:inline">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-[#69707d] hover:text-[#0077cc] min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-visible px-4 py-6 pb-0 md:pb-6">
        <NotificationBanner />
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden shrink-0 bg-white border-t border-[#e8eaf0] z-50 sticky bottom-0 safe-area-bottom shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
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
                    : tab.to === '/store/receiving'
                      ? location.pathname.startsWith('/store/receiving')
                      : tab.to === '/store/inventory'
                        ? location.pathname === '/store/inventory'
                        : location.pathname.startsWith(tab.to);

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-[#0077cc] border-t-2 border-[#0077cc] bg-[rgba(0,119,204,0.04)]'
                    : 'text-[#69707d] hover:text-[#343741]'
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
