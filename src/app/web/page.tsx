
import { getWebItemsWithDetails } from '@/lib/data';
import type { ItemWithDetails } from '@/lib/types';
import { ItemsPageContent } from '@/components/shared/ItemsPageContent';

export default async function WebPage() {
  const webItemsWithDetails: ItemWithDetails[] = await getWebItemsWithDetails();
  return (
    <ItemsPageContent 
      initialItems={webItemsWithDetails}
      itemType="web"
      title="Web Projects"
      description="Explore innovative web projects, templates, and libraries."
    />
  );
}

export const revalidate = 3600;
