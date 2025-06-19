
import { getRawCategoryDetailsForForm, getAvailableFilterTags } from '@/lib/data';
import type { ItemType, RawCategoryProjectDetails, DynamicAvailableFilterTags } from '@/lib/types';
import { ResourceForm } from '@/components/admin/ResourceForm';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { notFound } from 'next/navigation';
import { ITEM_TYPE_NAMES } from '@/lib/types';

interface CreateResourcePageProps {
  params: Promise<{
    itemType: ItemType;
    projectSlug: string;
    categorySlug: string;
  }>;
}

export default async function CreateResourcePage({ params: paramsPromise }: CreateResourcePageProps) {
  const params = await paramsPromise;
  const { itemType, projectSlug, categorySlug } = params;

  if (!ITEM_TYPE_NAMES[itemType]) {
    notFound();
  }

  const parentDetails: RawCategoryProjectDetails | undefined = await getRawCategoryDetailsForForm(projectSlug, itemType, categorySlug);
  if (!parentDetails) {
    notFound();
  }

  const dynamicTagGroups: DynamicAvailableFilterTags = await getAvailableFilterTags(projectSlug, itemType, categorySlug);

  const pageTitle = `New Resource in ${parentDetails.categoryName}`;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin">Admin</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/projects">Projects</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/admin/projects/${itemType}/${projectSlug}/edit`}>{parentDetails.projectName}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/admin/projects/${itemType}/${projectSlug}/edit#categories`}>{parentDetails.categoryName} (Categories)</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{pageTitle}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{pageTitle}</h1>
        <p className="text-muted-foreground">
          Fill in the details for the new resource.
        </p>
      </header>

      <ResourceForm
        isNew={true}
        itemType={itemType}
        projectSlug={projectSlug}
        categorySlug={categorySlug}
        parentItemId={parentDetails.parentItemId}
        categoryId={parentDetails.categoryId}
        dynamicTagGroups={dynamicTagGroups}
      />
    </div>
  );
}

export const dynamic = 'force-dynamic';
