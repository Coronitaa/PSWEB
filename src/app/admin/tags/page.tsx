
// This file can be removed as "Manage Tags" was removed from Admin Sidebar.
// If it must exist for some reason, keep it minimal or redirect.
// For now, just ensuring it won't cause a build error.
import { redirect } from 'next/navigation';

export default function AdminTagsPage_DELETED() {
  // Redirect to admin dashboard or projects page as this page is no longer used
  redirect('/admin/projects'); 
  // return null; // Or simply return null if redirect isn't desired during build
}

