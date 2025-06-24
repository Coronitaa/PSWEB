
import { notFound } from 'next/navigation';
import { getUserProfileByUsertag } from '@/lib/data';
import type { UserProfile, ItemWithDetails, ItemType } from '@/lib/types';
import { getProjectsForUser, getAuthorPublishedResources } from '@/lib/data';
import { UserResourcesPageContent } from '@/components/user/UserResourcesPageContent';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { User } from 'lucide-react';

interface UserResourcesPageProps {
  params: { usertag: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

const RESOURCES_PER_PAGE = 12;

export default async function UserResourcesPage({ params, searchParams }: UserResourcesPageProps) {
  const profile = await getUserProfileByUsertag(params.usertag);
  if (!profile) {
    notFound();
  }

  const filterOptions = {
    itemType: typeof searchParams.section === 'string' ? (searchParams.section as ItemType) : undefined,
    parentItemId: typeof searchParams.project === 'string' ? searchParams.project : undefined,
    categoryId: typeof searchParams.category === 'string' ? searchParams.category : undefined,
  };

  const [projectsForFilter, initialResourcesData] = await Promise.all([
    getProjectsForUser(profile.id),
    getAuthorPublishedResources(profile.id, {
      limit: RESOURCES_PER_PAGE,
      itemType: filterOptions.itemType,
      parentItemId: filterOptions.parentItemId,
      categoryId: filterOptions.categoryId,
    })
  ]);
  
  const { resources: initialResources, total: initialTotal, hasMore: initialHasMore } = initialResourcesData;

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          {/* Removed /users link as it doesn't exist */}
          <BreadcrumbItem><BreadcrumbLink href={`/users/${params.usertag}`}>{profile.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Resources</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="pb-4 border-b border-border/40">
        <div className="flex items-center space-x-3">
          <User className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-4xl font-bold text-foreground">Resources by {profile.name}</h1>
            <p className="text-muted-foreground">Browse all creations published by {profile.usertag}.</p>
          </div>
        </div>
      </header>

      <UserResourcesPageContent
        profile={profile}
        projectsForFilter={projectsForFilter}
        initialResources={initialResources}
        initialTotal={initialTotal}
        initialHasMore={initialHasMore}
        resourcesPerPage={RESOURCES_PER_PAGE}
      />
    </div>
  );
}

export const revalidate = 3600;
