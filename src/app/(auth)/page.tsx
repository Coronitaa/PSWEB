
import AdminDashboardPage from '@/app/admin/page'; // Import the actual dashboard content

export default function AuthenticatedRootPage() {
  // This page is the content for the /admin route.
  // The AdminSidebar is already provided by the (auth)/layout.tsx file.
  // We render the content of the admin dashboard here.
  return <AdminDashboardPage />;
}
