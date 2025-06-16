
import { getGamesWithDetails } from '@/lib/data'; // This function will now only fetch published games
import type { ItemWithDetails } from '@/lib/types'; 
import { GamesPageContent } from './GamesPageContent';

export default async function GamesPage() {
  const gamesWithDetails: ItemWithDetails[] = await getGamesWithDetails();
  return (
    <GamesPageContent initialItems={gamesWithDetails} />
  );
}

export const revalidate = 3600;
