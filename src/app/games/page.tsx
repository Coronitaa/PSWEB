
import { getGamesWithDetails } from '@/lib/data';
import type { ItemWithDetails } from '@/lib/types'; 
import { ItemsPageContent } from '@/components/shared/ItemsPageContent';

export default async function GamesPage() {
  const gamesWithDetails: ItemWithDetails[] = await getGamesWithDetails();
  return (
    <ItemsPageContent 
      initialItems={gamesWithDetails}
      itemType="game"
      title="Games"
      description="Browse our curated collection of games and their amazing resources."
    />
  );
}

export const revalidate = 3600;
