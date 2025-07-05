
import { getWebItemsWithDetails } from '@/lib/data';
import type { ItemWithDetails } from '@/lib/types';
import { ItemsPageContent } from '@/components/shared/ItemsPageContent';
import { Code } from 'lucide-react';

export default async function WebPage() {
  const webItemsWithDetails: ItemWithDetails[] = await getWebItemsWithDetails();
  return (
    <ItemsPageContent 
      initialItems={webItemsWithDetails}
      itemType="web"
      title="Web Projects"
      description="Explore innovative web projects, templates, and libraries."
      icon={Code}
    />
  );
}

export const revalidate = 3600;
