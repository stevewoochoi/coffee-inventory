import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/AdminLayout';
import { StoreLayout } from '@/components/StoreLayout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ItemsPage from '@/pages/admin/ItemsPage';
import PackagingsPage from '@/pages/admin/PackagingsPage';
import SuppliersPage from '@/pages/admin/SuppliersPage';
import ThemeSettingsPage from '@/pages/admin/ThemeSettingsPage';
import UsersPage from '@/pages/admin/UsersPage';
import InventoryPage from '@/pages/store/InventoryPage';
import ReceivingPage from '@/pages/store/ReceivingPage';
import WastePage from '@/pages/store/WastePage';
import OrderingPage from '@/pages/store/OrderingPage';
import NewOrderPage from '@/pages/store/NewOrderPage';
import OrderHistoryPage from '@/pages/store/OrderHistoryPage';
import OrderDetailPage from '@/pages/store/OrderDetailPage';
import OrderingAdminPage from '@/pages/admin/OrderingAdminPage';
import CategoriesPage from '@/pages/admin/CategoriesPage';
import AdminExpiryPage from '@/pages/admin/ExpiryPage';
import StoreExpiryPage from '@/pages/store/ExpiryPage';
import PhysicalCountPage from '@/pages/store/PhysicalCountPage';
import PhysicalCountDetailPage from '@/pages/store/PhysicalCountDetailPage';
import StoreDashboardPage from '@/pages/store/DashboardPage';
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import ReportsPage from '@/pages/store/ReportsPage';

function App() {
  const { initialize } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initialize();
    initTheme();
  }, [initialize, initTheme]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'BRAND_ADMIN']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/items" element={<ItemsPage />} />
            <Route path="/admin/packagings" element={<PackagingsPage />} />
            <Route path="/admin/suppliers" element={<SuppliersPage />} />
            <Route path="/admin/categories" element={<CategoriesPage />} />
            <Route path="/admin/ordering" element={<OrderingAdminPage />} />
            <Route path="/admin/expiry" element={<AdminExpiryPage />} />
            <Route path="/admin/settings/theme" element={<ThemeSettingsPage />} />
            <Route path="/admin/settings/users" element={<UsersPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<StoreLayout />}>
            <Route path="/store" element={<Navigate to="/store/dashboard" replace />} />
            <Route path="/store/dashboard" element={<StoreDashboardPage />} />
            <Route path="/store/inventory" element={<InventoryPage />} />
            <Route path="/store/receiving" element={<ReceivingPage />} />
            <Route path="/store/waste" element={<WastePage />} />
            <Route path="/store/ordering" element={<OrderingPage />} />
            <Route path="/store/ordering/new" element={<NewOrderPage />} />
            <Route path="/store/ordering/history" element={<OrderHistoryPage />} />
            <Route path="/store/ordering/:id" element={<OrderDetailPage />} />
            <Route path="/store/expiry" element={<StoreExpiryPage />} />
            <Route path="/store/reports" element={<ReportsPage />} />
            <Route path="/store/physical-count" element={<PhysicalCountPage />} />
            <Route path="/store/physical-count/:id" element={<PhysicalCountDetailPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
