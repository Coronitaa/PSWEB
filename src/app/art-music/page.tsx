
import { getArtMusicItemsWithDetails } from '@/lib/data';
import type { ItemWithDetails } from '@/lib/types';
import { ItemsPageContent } from '@/components/shared/ItemsPageContent';
import { Music } from 'lucide-react';

export default async function ArtMusicPage() {
  const artMusicItemsWithDetails: ItemWithDetails[] = await getArtMusicItemsWithDetails();
  return (
    <ItemsPageContent 
      initialItems={artMusicItemsWithDetails} 
      itemType="art-music"
      title="Art & Music"
      description="Immerse yourself in stunning visuals and captivating sounds."
      icon={Music}
    />
  );
}

export const revalidate = 3600;
