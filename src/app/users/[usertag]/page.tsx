
import { notFound } from 'next/navigation';
import { getUserProfileByUsertag, getUserStats, getTopUserResources, getRecentUserResources } from '@/lib/data';
import type { Author as UserProfile, UserStats, RankedResource, Resource } from '@/lib/types';
import { UserProfilePageContent } from '@/components/user/UserProfilePageContent';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { createSupabaseClient } from '@/lib/supabase/client'; // Import Supabase client

interface UserProfilePageProps {
  params: { usertag: string };
}

const RECENT_RESOURCES_COUNT = 6;

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const profile = await getUserProfileByUsertag(params.usertag);
  if (!profile) {
    notFound();
  }

  const stats = await getUserStats(profile.id);
  const topResources = await getTopUserResources(profile.id, 3);
  const recentResources = await getRecentUserResources(profile.id, RECENT_RESOURCES_COUNT);


  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/users">Users</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{profile.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <UserProfilePageContent profile={profile} stats={stats} topResources={topResources} recentResources={recentResources} />
    </div>
  );
}

export async function generateStaticParams() {
  const supabase = createSupabaseClient();
  const { data: profilesData, error } = await supabase
    .from('profiles')
    .select('usertag')
    .filter('usertag', 'isnot', null); // Ensure usertag is not null

  if (error) {
    console.error("Error fetching profiles for generateStaticParams:", error);
    return [];
  }

  if (!profilesData) {
    return [];
  }

  return profilesData
    .filter(p => p.usertag) // Double check usertag exists
    .map(profile => ({
      usertag: profile.usertag!, // usertag should be defined due to filter
    }));
}

export const revalidate = 3600; // Revalidate profile pages every hour
