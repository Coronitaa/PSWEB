// This component has been generalized and moved to /src/components/shared/ItemCard.tsx
// This file is being emptied to clean up the project.
import type { ItemWithDetails } from '@/lib/types';
import Link from 'next/link';

export function GameCard({ item }: { item: ItemWithDetails;[key: string]: any }) {
  return <Link href={`/games/${item.slug}`}>DEPRECATED COMPONENT</Link>;
}
