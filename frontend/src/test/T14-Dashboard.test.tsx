/**
 * T-14: Dashboard data binding test
 * Tests StoreDashboardPage:
 * - Renders 5 task cards
 * - Stock status bar
 * - Quick action buttons
 * - Recent orders section
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

vi.mock('@/api/dashboard', () => ({
  dashboardApi: {
    getStoreDashboard: vi.fn().mockResolvedValue({
      data: {
        data: {
          todayReceiveCount: 3,
          todayWasteQty: 1,
          lowStockCount: 5,
          expiryAlertCount: 2,
          dailyConsumption: [
            { date: '2026-02-21', totalQty: 120 },
            { date: '2026-02-22', totalQty: 110 },
            { date: '2026-02-23', totalQty: 130 },
            { date: '2026-02-24', totalQty: 100 },
            { date: '2026-02-25', totalQty: 140 },
            { date: '2026-02-26', totalQty: 125 },
            { date: '2026-02-27', totalQty: 115 },
          ],
          monthOrderCost: 500000,
          urgentOrderCount: 3,
          recommendedOrderCount: 7,
          pendingReceivingCount: 2,
          pendingCartCount: 1,
          pendingClaimCount: 0,
          stockStatus: {
            totalItems: 50,
            normalCount: 35,
            lowStockCount: 10,
            outOfStockCount: 3,
            expiringCount: 2,
          },
          topConsumption: [
            { itemId: 1, itemName: 'Espresso Beans', totalQty: 250, baseUnit: 'g' },
            { itemId: 2, itemName: 'Whole Milk', totalQty: 180, baseUnit: 'L' },
            { itemId: 3, itemName: 'Sugar Syrup', totalQty: 120, baseUnit: 'mL' },
          ],
          recentOrders: [
            { id: 101, status: 'CONFIRMED', supplierName: 'Bean Co', totalAmount: 50000, createdAt: '2026-02-27', deliveryDate: '2026-03-01', itemCount: 5 },
            { id: 102, status: 'DISPATCHED', supplierName: 'Dairy Farm', totalAmount: 30000, createdAt: '2026-02-26', deliveryDate: '2026-02-28', itemCount: 3 },
          ],
        },
      },
    }),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: { storeId: 1, id: 1, brandId: 1, email: 'test@test.com' },
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import StoreDashboardPage from '@/pages/store/DashboardPage';

function renderWithProviders(component: React.ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        {component}
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('T-14: Dashboard Data Binding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard page with greeting', async () => {
    renderWithProviders(<StoreDashboardPage />);
    await waitFor(() => {
      const greetingEl = screen.queryByText(/Morning|Afternoon|Evening|아침|오후|저녁/i);
      expect(greetingEl).toBeTruthy();
    });
  });

  it('displays task cards with correct counts', async () => {
    const { container } = renderWithProviders(<StoreDashboardPage />);
    await waitFor(() => {
      // Task cards render counts in .text-3xl.font-bold divs
      const countEls = container.querySelectorAll('.text-3xl.font-bold');
      expect(countEls.length).toBeGreaterThanOrEqual(5);
      const counts = Array.from(countEls).map(el => el.textContent);
      // urgentOrderCount = 3, pendingCartCount = 1, pendingReceivingCount = 2
      expect(counts).toContain('3');
      expect(counts).toContain('1');
      expect(counts).toContain('2');
    });
  });

  it('shows stock status overview bar', async () => {
    renderWithProviders(<StoreDashboardPage />);
    await waitFor(() => {
      // Stock status section has legend items: Normal 35, Low Stock 10, Out of Stock 3, Expiring 2
      expect(screen.queryByText(/Normal/)).toBeTruthy();
      expect(screen.queryByText(/Low Stock/)).toBeTruthy();
      expect(screen.queryByText(/Out of Stock/)).toBeTruthy();
    });
  });

  it('renders quick action buttons', async () => {
    renderWithProviders(<StoreDashboardPage />);
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(5);
    });
  });

  it('shows recent orders', async () => {
    renderWithProviders(<StoreDashboardPage />);
    await waitFor(() => {
      expect(screen.queryByText(/#101/)).toBeTruthy();
      expect(screen.queryByText(/#102/)).toBeTruthy();
    });
  });

  it('shows top consumption items', async () => {
    renderWithProviders(<StoreDashboardPage />);
    await waitFor(() => {
      expect(screen.queryByText(/Espresso Beans/)).toBeTruthy();
      expect(screen.queryByText(/Whole Milk/)).toBeTruthy();
    });
  });
});
