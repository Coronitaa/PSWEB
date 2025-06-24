
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGameBySlug, getCategoryDetails, getResources, getAvailableFilterTags, getCategoriesForItemGeneric } from '@/lib/data';
import type { Game, Category, ItemType, DynamicAvailableFilterTags } from '@/lib/types';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { CategoryPageContent } from './CategoryPageContent';

const RESOURCES_PER_PAGE = 20;
const MAX_VISIBLE_CATEGORY_TABS = 5;

interface CategoryPageParams { gameSlug: string; categorySlug: string };
interface CategoryPageSearchParams { [key: string]: string | string[] | undefined };

interface CategoryPageProps {
  params: Promise<CategoryPageParams>;
  searchParams: Promise<CategoryPageSearchParams>;
}

type SortByType = 'relevance' | 'downloads' | 'updatedAt' | 'name';

export default async function GameCategoryPage({ params: paramsPromise, searchParams: searchParamsPromise }: CategoryPageProps) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;

  const game = await getGameBySlug(params.gameSlug);
  if (!game) {
    notFound();
  }
  const itemType: ItemType = 'game';
  const currentCategory = await getCategoryDetails(params.gameSlug, itemType, params.categorySlug);
  const allItemCategories = await getCategoriesForItemGeneric(game.id, itemType);

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
  const defaultSort = searchQuery ? 'relevance' : (itemType === 'game' ? 'downloads' : 'updatedAt');
  const sortBy = (typeof searchParams.sort === 'string' ? searchParams.sort : defaultSort) as SortByType;

  const { resources: initialResources, total: initialTotal, hasMore: initialHasMore } = await getResources({
    parentItemSlug: params.gameSlug,
    parentItemType: itemType,
    categorySlug: params.categorySlug,
    selectedTagIds: activeTagFilters.length > 0 ? activeTagFilters : undefined,
    searchQuery,
    sortBy,
    page: 1,
    limit: RESOURCES_PER_PAGE,
  });

  const dynamicAvailableFilterGroups: DynamicAvailableFilterTags = await getAvailableFilterTags(params.gameSlug, itemType, params.categorySlug);

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/games">Games</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/games/${game.slug}`}>{game.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{currentCategory.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <CategoryPageContent
        initialResources={initialResources}
        initialHasMore={initialHasMore}
        initialTotal={initialTotal}
        itemSlug={params.gameSlug}
        itemType={itemType}
        categorySlug={params.categorySlug}
        dynamicAvailableFilterGroups={dynamicAvailableFilterGroups}
        itemName={game.name}
        categoryName={currentCategory.name}
        allItemCategories={allItemCategories}
        currentCategory={currentCategory}
        parentItemName={game.name}
        parentItemSlug={game.slug}
        maxVisibleCategoryTabs={MAX_VISIBLE_CATEGORY_TABS}
      />
    </div>
  );
}

export const revalidate = 3600;
