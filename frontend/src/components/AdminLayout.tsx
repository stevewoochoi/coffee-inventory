import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useFilteredNav } from '@/hooks/useFilteredNav';
import { ChevronDown, Menu, X, LogOut } from 'lucide-react';

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const { logout, user } = useAuthStore();
  const { t, i18n } = useTranslation();
  const { theme } = useThemeStore();
  const location = useLocation();

  const userRole = user?.role || 'STORE_MANAGER';
  const filteredGroups = useFilteredNav(userRole);

  const toggleGroup = (key: string) => {
    setExpandedGroup(prev => prev === key ? null : key);
  };

  // Auto-expand active group
  const activeGroupKey = filteredGroups.find(g =>
    g.children?.some(c => location.pathname.startsWith(c.to))
  )?.key;

  const renderNavItems = (onNavigate?: () => void) => (
    <div className="flex flex-col gap-0.5 px-3 py-2">
      {filteredGroups.map((group) => {
        if (group.to) {
          const isActive = location.pathname === group.to;
          return (
            <NavLink
              key={group.key}
              to={group.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors min-h-[48px] ${
                isActive
                  ? 'text-[#0077cc] bg-[rgba(0,119,204,0.04)]'
                  : 'text-[#343741] hover:bg-[#eef1f7]'
              }`}
            >
              <group.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>{t(group.key)}</span>}
            </NavLink>
          );
        }

        const isExpanded = expandedGroup === group.key || activeGroupKey === group.key;
        const hasActiveChild = group.children?.some(c => location.pathname.startsWith(c.to));

        return (
          <div key={group.key}>
            <button
              onClick={() => toggleGroup(group.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors min-h-[48px] ${
                hasActiveChild
                  ? 'text-[#0077cc] bg-[rgba(0,119,204,0.04)]'
                  : 'text-[#343741] hover:bg-[#eef1f7]'
              }`}
            >
              <group.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{t(group.key)}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
            {sidebarOpen && isExpanded && group.children && (
              <div className="ml-2 space-y-0.5 mt-0.5">
                {group.children.map((child) => {
                  const isChildActive = location.pathname === child.to;
                  return (
                    <NavLink
                      key={child.key}
                      to={child.to}
                      onClick={onNavigate}
                      className={`flex items-center gap-2.5 pl-12 pr-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
                        isChildActive
                          ? 'text-[#0077cc] bg-[rgba(0,119,204,0.06)]'
                          : 'text-[#69707d] hover:bg-[#eef1f7] hover:text-[#343741]'
                      }`}
                    >
                      {isChildActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0077cc] absolute -ml-5" />
                      )}
                      <span className="relative">{t(child.key)}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-[#f7f8fc] border-r border-[#e8eaf0] transition-all duration-200 ${
          sidebarOpen ? 'w-[280px]' : 'w-[72px]'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-5 h-14 border-b border-[#e8eaf0]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-[#eef1f7] text-[#69707d]"
          >
            <Menu className="w-5 h-5" />
          </button>
          {sidebarOpen && (
            <span className="text-base font-bold text-[#1a1c21] truncate">{t('auth.appTitle')}</span>
          )}
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto">
          {renderNavItems()}
        </div>

        {/* Sidebar footer */}
        {sidebarOpen && (
          <div className="p-3 border-t border-[#e8eaf0]">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[#0077cc] bg-[rgba(0,119,204,0.12)] hover:bg-[rgba(0,119,204,0.2)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('common.logout')}
            </button>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div className={`transition-all duration-200 ${sidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-[72px]'}`}>
        {/* Top header */}
        <header className="sticky top-0 z-50 bg-white border-b border-[#e8eaf0] px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-[#f7f8fc] text-[#69707d]"
              >
                <Menu className="w-5 h-5" />
              </button>
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-sm">
                <span className="px-3 py-1 rounded-md bg-[rgba(105,112,125,0.1)] text-[#69707d] font-medium">
                  {t('auth.appTitle')}
                </span>
                <span className="text-[#69707d]">/</span>
                <span className="px-3 py-1 rounded-md bg-[rgba(0,119,204,0.08)] text-[#0077cc] font-medium">
                  {t(filteredGroups.find(g =>
                    g.to === location.pathname ||
                    g.children?.some(c => location.pathname.startsWith(c.to))
                  )?.key || 'nav.dashboard')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={i18n.language?.substring(0, 2) || 'en'}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
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
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#f7f8fc] shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 h-14 border-b border-[#e8eaf0]">
              <span className="text-base font-bold text-[#1a1c21]">{t('auth.appTitle')}</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-md hover:bg-[#eef1f7] text-[#69707d]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavItems(() => setMobileMenuOpen(false))}
            <div className="p-3 border-t border-[#e8eaf0]">
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[#0077cc] bg-[rgba(0,119,204,0.12)] hover:bg-[rgba(0,119,204,0.2)]"
              >
                <LogOut className="w-4 h-4" />
                {t('common.logout')}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
