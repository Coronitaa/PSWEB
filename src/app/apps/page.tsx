
import { getAppItemsWithDetails } from '@/lib/data'; // This function will now only fetch published items
import type { ItemWithDetails } from '@/lib/types';
import { AppItemsPageContent } from './AppItemsPageContent';

export default async function AppsPage() {
  const appItemsWithDetails: ItemWithDetails[] = await getAppItemsWithDetails();
  return (
    <AppItemsPageContent initialItems={appItemsWithDetails} />
  );
}

export const revalidate = 3600;
