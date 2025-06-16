
import { getRawCategoryDetailsForForm, getResourceForEdit, getAvailableFilterTags } from '@/lib/data';
import type { ItemType, Resource, RawCategoryProjectDetails, DynamicAvailableFilterTags } from '@/lib/types';
import { ResourceForm } from '@/components/admin/ResourceForm';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { notFound } from 'next/navigation';
import { ITEM_TYPE_NAMES } from '@/lib/types';

interface EditResourcePageProps {
  params: Promise<{
    itemType: ItemType;
    projectSlug: string;
    categorySlug: string;
    resourceSlug: string;
  }>;
}

export default async function EditResourcePage({ params: paramsPromise }: EditResourcePageProps) {
  const params = await paramsPromise;
  const { itemType, projectSlug, categorySlug, resourceSlug } = params;

  if (!ITEM_TYPE_NAMES[itemType]) {
    notFound();
  }

  const resource = await getResourceForEdit(resourceSlug);
  if (!resource) {
    notFound();
  }
  // Verify parent item and category match URL params
  if (resource.parentItemSlug !== projectSlug || resource.categorySlug !== categorySlug || resource.parentItemType !== itemType) {
    console.warn("Resource parent/category mismatch with URL params.");
    notFound(); // Or redirect to correct URL
  }
  
  const parentDetails: RawCategoryProjectDetails | undefined = await getRawCategoryDetailsForForm(projectSlug, itemType, categorySlug);
   if (!parentDetails) {
    notFound();
  }

  const dynamicTagGroups: DynamicAvailableFilterTags = await getAvailableFilterTags(projectSlug, itemType, categorySlug);

  const pageTitle = `Edit Resource: ${resource.name}`;

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
          Update the details for this resource.
        </p>
      </header>

      <ResourceForm
        isNew={false}
        initialData={resource}
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

    