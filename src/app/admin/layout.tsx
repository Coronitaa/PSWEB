
import type { Metadata } from 'next';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Toaster } from "@/components/ui/toaster"; // Keep toaster for admin notifications

export const metadata: Metadata = {
  title: 'PinkStar - Admin Panel',
  description: 'Manage PinkStar content and settings.',
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-muted/40">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8">
        {children}
        <Toaster />
      </main>
    </div>
  );
}
