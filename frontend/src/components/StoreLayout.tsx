import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import NotificationBanner from '@/components/NotificationBanner';

const navItems = [
  { to: '/store/dashboard', label: 'Dashboard' },
  { to: '/store/inventory', label: 'Inventory' },
  { to: '/store/receiving', label: 'Receiving' },
  { to: '/store/waste', label: 'Waste' },
  { to: '/store/ordering', label: 'Ordering' },
  { to: '/store/expiry', label: 'Expiry' },
  { to: '/store/physical-count', label: 'Count' },
  { to: '/store/reports', label: 'Reports' },
];

export function StoreLayout() {
  const { logout, user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* Desktop header */}
      <header className="bg-blue-800 text-white shadow">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">Coffee Store</h1>
            <nav className="hidden md:flex gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-base font-medium transition-colors ${
                      isActive ? 'bg-blue-900 text-white' : 'text-blue-200 hover:bg-blue-700'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-200 hidden sm:inline">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-blue-200 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              Logout
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
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 min-w-[60px] py-3 text-center text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-blue-800 border-t-2 border-blue-800 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
