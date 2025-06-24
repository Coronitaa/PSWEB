
import { notFound } from 'next/navigation';
import { getUserProfileByUsertag, getUserStats, getTopUserResources, getAuthorPublishedResources } from '@/lib/data';
import type { Author as UserProfile, UserStats, RankedResource, Resource } from '@/lib/types';
import { UserProfilePageContent } from '@/components/user/UserProfilePageContent';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { getDb } from '@/lib/db';

interface UserProfilePageProps {
  params: { usertag: string };
}

const RECENT_RESOURCES_CAROUSEL_COUNT = 5;

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const profile = await getUserProfileByUsertag(params.usertag);
  if (!profile) {
    notFound();
  }

  const stats = await getUserStats(profile.id);
  const topResources = await getTopUserResources(profile.id, 3);
  
  // Fetch recent resources WITHOUT excluding the top ones.
  // This ensures the carousel always shows the latest content.
  const { resources: recentResourcesForCarousel } = await getAuthorPublishedResources(profile.id, {
    limit: RECENT_RESOURCES_CAROUSEL_COUNT,
    sortBy: 'created_at',
    order: 'DESC',
  });


  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
          {/* Removed /users link as it doesn't exist */}
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{profile.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <UserProfilePageContent
        profile={profile}
        stats={stats}
        topResources={topResources}
        recentResourcesForCarousel={recentResourcesForCarousel}
      />
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
    .filter(p => p.usertag && p.usertag.startsWith('@'))
    .map(profile => ({
      usertag: profile.usertag.substring(1), // Remove the "@" for the route parameter
    }));
}

export const revalidate = 3600;
