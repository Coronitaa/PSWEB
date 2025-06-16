
import { getWebItemsWithDetails } from '@/lib/data'; // This function will now only fetch published items
import type { ItemWithDetails } from '@/lib/types';
import { WebItemsPageContent } from './WebItemsPageContent';

export default async function WebPage() {
  const webItemsWithDetails: ItemWithDetails[] = await getWebItemsWithDetails();
  return (
    <WebItemsPageContent initialItems={webItemsWithDetails} />
  );
}

export const revalidate = 3600;
