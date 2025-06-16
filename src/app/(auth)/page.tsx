import AdminDashboardPage from '@/app/admin/page';

export default function AuthenticatedRootPage() {
  // This page is the content for the /admin route.
  // The AdminSidebar is already provided by the (auth)/layout.tsx file.
  return <AdminDashboardPage />;
}
