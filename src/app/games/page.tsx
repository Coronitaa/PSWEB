
import { getGamesWithDetails } from '@/lib/data';
import type { ItemWithDetails } from '@/lib/types'; 
import { ItemsPageContent } from '@/components/shared/ItemsPageContent';
import { Gamepad2 } from 'lucide-react';

export default async function GamesPage() {
  const gamesWithDetails: ItemWithDetails[] = await getGamesWithDetails();
  return (
    <ItemsPageContent 
      initialItems={gamesWithDetails}
      itemType="game"
      title="Games"
      description="Browse our curated collection of games and their amazing resources."
      icon={Gamepad2}
    />
  );
}

export const revalidate = 3600;
