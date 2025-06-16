
import { notFound } from 'next/navigation';
import { getUserProfileByUsertag, getUserStats, getTopUserResources, getRecentUserResources } from '@/lib/data';
import type { Author as UserProfile, UserStats, RankedResource, Resource } from '@/lib/types';
import { UserProfilePageContent } from '@/components/user/UserProfilePageContent';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { getDb } from '@/lib/db';

interface UserProfilePageProps {
  params: { usertag: string };
}

const RECENT_RESOURCES_COUNT = 6;

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  // params.usertag will be "admin", "mod", "user", etc. (without "@")
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
  const db = await getDb();
  const profilesData = await db.all("SELECT usertag FROM profiles WHERE usertag IS NOT NULL");

  if (!profilesData) {
    console.warn("generateStaticParams for UserProfilePage: No profiles data found from local DB.");
    return [];
  }

  return profilesData
    .filter(p => p.usertag && p.usertag.startsWith('@')) // Ensure it starts with @
    .map(profile => ({
      usertag: profile.usertag.substring(1), // Remove the "@" for the route parameter
    }));
}

export const revalidate = 3600; // Revalidate profile pages every hour

