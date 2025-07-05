
import { getAppItemsWithDetails } from '@/lib/data';
import type { ItemWithDetails } from '@/lib/types';
import { ItemsPageContent } from '@/components/shared/ItemsPageContent';

export default async function AppsPage() {
  const appItemsWithDetails: ItemWithDetails[] = await getAppItemsWithDetails();
  return (
    <ItemsPageContent 
      initialItems={appItemsWithDetails} 
      itemType="app"
      title="Apps"
      description="Discover powerful applications for various platforms and needs."
    />
  );
}

export const revalidate = 3600;
