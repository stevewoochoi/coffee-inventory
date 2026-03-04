import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

const navKeys = [
  { to: '/admin/dashboard', key: 'nav.dashboard' },
  { to: '/admin/items', key: 'nav.items' },
  { to: '/admin/packagings', key: 'nav.packagings' },
  { to: '/admin/suppliers', key: 'nav.suppliers' },
  { to: '/admin/categories', key: 'nav.categories' },
  { to: '/admin/ordering', key: 'nav.ordering' },
  { to: '/admin/ordering/calendar', key: 'nav.orderCalendar' },
  { to: '/admin/ordering/cutoff', key: 'nav.cutoff' },
  { to: '/admin/finance/dashboard', key: 'nav.financeDashboard' },
  { to: '/admin/finance/purchase', key: 'nav.purchase' },
  { to: '/admin/finance/inventory-value', key: 'nav.inventoryValue' },
  { to: '/admin/finance/closing', key: 'nav.closing' },
  { to: '/admin/bulk-upload', key: 'nav.bulkUpload' },
  { to: '/admin/expiry', key: 'nav.expiry' },
  { to: '/admin/settings/users', key: 'nav.users' },
  { to: '/admin/settings/theme', key: 'nav.settings' },
];

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout, user } = useAuthStore();
  const { t, i18n } = useTranslation();
  const { theme } = useThemeStore();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className={`${theme.headerBg} text-white shadow`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold">{t('auth.appTitle')}</h1>
            {/* Desktop navigation */}
            <nav className="hidden md:flex gap-1">
              {navKeys.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
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
              className={`text-sm ${theme.headerText} hover:text-white min-h-[44px] min-w-[44px] hidden md:flex items-center justify-center`}
            >
              {t('common.logout')}
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile slide menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/20 px-4 py-2">
            <nav className="flex flex-col gap-1">
              {navKeys.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                      isActive ? `${theme.headerHover} text-white` : `${theme.headerText} hover:bg-white/10`
                    }`
                  }
                >
                  {t(item.key)}
                </NavLink>
              ))}
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className={`px-4 py-3 rounded text-sm font-medium ${theme.headerText} hover:bg-white/10 text-left min-h-[44px]`}
              >
                {t('common.logout')}
              </button>
            </nav>
          </div>
        )}
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
