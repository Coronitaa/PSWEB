
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArtMusicItemBySlug, getCategoryDetails, getResources, getAvailableFilterTags, getCategoriesForItemGeneric } from '@/lib/data';
import type { ArtMusicItem, Category, ItemType, DynamicAvailableFilterTags } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, PlusCircle, Music } from 'lucide-react';
import { CategoryPageContent } from '@/components/shared/CategoryPageContent';
import { cn } from '@/lib/utils';

const RESOURCES_PER_PAGE = 20;
const MAX_VISIBLE_CATEGORY_TABS = 5;

interface ArtMusicCategoryPageParams { artMusicSlug: string; categorySlug: string };
interface ArtMusicCategoryPageSearchParams { [key: string]: string | string[] | undefined };

interface ArtMusicCategoryPageProps {
  params: Promise<ArtMusicCategoryPageParams>;
  searchParams: Promise<ArtMusicCategoryPageSearchParams>;
}

type SortByType = 'relevance' | 'updatedAt' | 'name';

export default async function ArtMusicCategoryPage({ params: paramsPromise, searchParams: searchParamsPromise }: ArtMusicCategoryPageProps) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;

  const artMusicItem = await getArtMusicItemBySlug(params.artMusicSlug);
  if (!artMusicItem) {
    notFound();
  }
  const itemType: ItemType = 'art-music';
  const currentCategory = await getCategoryDetails(params.artMusicSlug, itemType, params.categorySlug);
  const allItemCategories = await getCategoriesForItemGeneric(artMusicItem.id, itemType);

  if (!currentCategory) {
    notFound();
  }

  const activeTagFilters: string[] = [];
  Object.keys(searchParams).forEach(key => {
    if (key !== 'q' && key !== 'sort' && searchParams[key]) {
      const value = searchParams[key];
      if (typeof value === 'string') {
        activeTagFilters.push(value);
      }
    }
  });

  const searchQuery = typeof searchParams.q === 'string' ? searchParams.q : undefined;
  const defaultSort = searchQuery ? 'relevance' : 'updatedAt';
  const sortBy = (typeof searchParams.sort === 'string' ? searchParams.sort : defaultSort) as SortByType;

  const { resources: initialResources, total: initialTotal, hasMore: initialHasMore } = await getResources({
    parentItemSlug: params.artMusicSlug,
    parentItemType: itemType,
    categorySlug: params.categorySlug,
    selectedTagIds: activeTagFilters.length > 0 ? activeTagFilters : undefined,
    searchQuery,
    sortBy,
    page: 1,
    limit: RESOURCES_PER_PAGE,
  });

  const dynamicAvailableFilterGroups: DynamicAvailableFilterTags = await getAvailableFilterTags(params.artMusicSlug, itemType, params.categorySlug);

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/art-music">Art &amp; Music</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/art-music/${artMusicItem.slug}`}>{artMusicItem.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{currentCategory.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <CategoryPageContent
        initialResources={initialResources}
        initialHasMore={initialHasMore}
        initialTotal={initialTotal}
        itemSlug={params.artMusicSlug}
        itemType={itemType}
        categorySlug={params.categorySlug}
        dynamicAvailableFilterGroups={dynamicAvailableFilterGroups}
        itemName={artMusicItem.name}
        categoryName={currentCategory.name}
        allItemCategories={allItemCategories}
        currentCategory={currentCategory}
        parentItemName={artMusicItem.name}
        parentItemSlug={artMusicItem.slug}
        maxVisibleCategoryTabs={MAX_VISIBLE_CATEGORY_TABS}
      />
    </div>
  );
}

export const revalidate = 3600;
