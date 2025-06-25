
import { notFound } from 'next/navigation';
import { getResourceBySlug, getResources } from '@/lib/data';
import { ResourcePageContent } from '@/components/resource/ResourcePageContent';

interface WebResourcePageProps {
  params: Promise<{
    webSlug: string;
    categorySlug: string;
    resourceSlug: string;
  }>;
}

export default async function WebResourcePage({ params: paramsPromise }: WebResourcePageProps) {
  const params = await paramsPromise;
  const resource = await getResourceBySlug(params.resourceSlug);

  if (!resource || resource.parentItemType !== 'web' || resource.parentItemSlug !== params.webSlug || resource.categorySlug !== params.categorySlug) {
    notFound();
  }

  const { resources: relatedResources } = await getResources({
    parentItemSlug: resource.parentItemSlug,
    parentItemType: resource.parentItemType,
    categorySlug: resource.categorySlug,
    limit: 6
  });
  const filteredRelated = relatedResources.filter(r => r.id !== resource.id).slice(0, 5);

  return <ResourcePageContent resource={resource} relatedResources={filteredRelated} />;
}
