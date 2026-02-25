import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/items', label: 'Items' },
  { to: '/admin/packagings', label: 'Packagings' },
  { to: '/admin/suppliers', label: 'Suppliers' },
  { to: '/admin/ordering', label: 'Ordering' },
  { to: '/admin/expiry', label: 'Expiry' },
];

export function AdminLayout() {
  const { logout, user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-800 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold">Coffee Inventory</h1>
            <nav className="flex gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-900 text-white' : 'text-blue-200 hover:bg-blue-700'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-blue-200 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
