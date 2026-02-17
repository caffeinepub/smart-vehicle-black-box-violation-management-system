import { createRouter, createRoute, createRootRoute, RouterProvider, Outlet } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import PortalLayout from './components/PortalLayout';
import DashboardPage from './pages/DashboardPage';
import LiveViolationsPage from './pages/LiveViolationsPage';
import ChallanManagementPage from './pages/ChallanManagementPage';
import VehicleDetailsPage from './pages/VehicleDetailsPage';
import ChallanPreviewPage from './pages/ChallanPreviewPage';

const rootRoute = createRootRoute({
  component: () => (
    <PortalLayout>
      <Outlet />
      <Toaster />
    </PortalLayout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const violationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/violations',
  component: LiveViolationsPage,
});

const challansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/challans',
  component: ChallanManagementPage,
});

const vehicleDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vehicle-details',
  component: VehicleDetailsPage,
});

const challanPreviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/challan-preview',
  component: ChallanPreviewPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  violationsRoute,
  challansRoute,
  vehicleDetailsRoute,
  challanPreviewRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
