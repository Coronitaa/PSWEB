
import { getItemBySlugGeneric, getCategoriesForItemGeneric, getSectionTagsForItemType } from '@/lib/data'; 
import type { ItemType, GenericListItem, Category, Tag } from '@/lib/types'; 
import { ITEM_TYPE_NAMES } from '@/lib/types';
import { ProjectForm } from '@/components/admin/ProjectForm';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';

interface AdminEditProjectPageProps {
  params: Promise<{ 
    itemType: ItemType;
    projectSlug: string;
  }>;
}

export default async function AdminEditProjectPage({ params: paramsPromise }: AdminEditProjectPageProps) {
  const params = await paramsPromise; 
  const { itemType, projectSlug } = params;
  const isNewProject = projectSlug === 'new';

  let project: Partial<GenericListItem> = { itemType, authorDisplayName: '', status: 'draft' };
  let categories: Category[] = [];
  let availableSectionTags: Tag[] = []; 

  if (!ITEM_TYPE_NAMES[itemType]) {
    notFound();
  }

  availableSectionTags = await getSectionTagsForItemType(itemType);

  if (!isNewProject) {
    const fetchedProject = await getItemBySlugGeneric(projectSlug, itemType, false, true);
    if (!fetchedProject) {
      notFound();
    }
    project = fetchedProject;
    if (project && project.id) {
        categories = await getCategoriesForItemGeneric(project.id, itemType);
    }
  }

  const pageTitle = isNewProject ? `Create New ${ITEM_TYPE_NAMES[itemType].slice(0,-1)}` : `Edit: ${project?.name || 'Project'}`;
  const pageDescription = isNewProject
    ? `Fill in the details for your new ${ITEM_TYPE_NAMES[itemType].toLowerCase().slice(0,-1)}.`
    : `Manage details and categories for "${project?.name}". Use the preview button to see how it looks on the public site.`;


  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin">Admin</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/projects">Projects</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/admin/projects#${itemType}`}>{ITEM_TYPE_NAMES[itemType]}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{pageTitle}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{pageTitle}</h1>
        <p className="text-muted-foreground">
          {pageDescription}
        </p>
      </header>

      <ProjectForm
        initialData={project}
        isNew={isNewProject}
        itemType={itemType}
        availableSectionTags={availableSectionTags} 
      />


      {!isNewProject && project?.id && (
        <CategoryManager
          projectId={project.id}
          projectItemType={itemType}
          initialCategories={categories}
        />
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';

    
