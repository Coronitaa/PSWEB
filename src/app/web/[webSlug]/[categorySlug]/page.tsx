
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWebItemBySlug, getCategoryDetails, getResources, getAvailableFilterTags, getCategoriesForItemGeneric } from '@/lib/data';
import type { WebItem, Category, ItemType, DynamicAvailableFilterTags } from '@/lib/types';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { CategoryPageContent } from '@/app/games/[gameSlug]/[categorySlug]/CategoryPageContent'; // Re-using the generic component

const RESOURCES_PER_PAGE = 20;
const MAX_VISIBLE_CATEGORY_TABS = 5;

interface WebCategoryPageParams { webSlug: string; categorySlug: string };
interface WebCategoryPageSearchParams { [key: string]: string | string[] | undefined };

interface WebCategoryPageProps {
  params: Promise<WebCategoryPageParams>;
  searchParams: Promise<WebCategoryPageSearchParams>;
}

type SortByType = 'relevance' | 'updatedAt' | 'name';

export default async function WebCategoryPage({ params: paramsPromise, searchParams: searchParamsPromise }: WebCategoryPageProps) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;

  const webItem = await getWebItemBySlug(params.webSlug);
  if (!webItem) {
    notFound();
  }
  const itemType: ItemType = 'web';
  const currentCategory = await getCategoryDetails(params.webSlug, itemType, params.categorySlug);
  const allItemCategories = await getCategoriesForItemGeneric(webItem.id, itemType);

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
    parentItemSlug: params.webSlug,
    parentItemType: itemType,
    categorySlug: params.categorySlug,
    selectedTagIds: activeTagFilters.length > 0 ? activeTagFilters : undefined,
    searchQuery,
    sortBy,
    page: 1,
    limit: RESOURCES_PER_PAGE,
  });

  const dynamicAvailableFilterGroups: DynamicAvailableFilterTags = await getAvailableFilterTags(params.webSlug, itemType, params.categorySlug);

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/web">Web</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/web/${webItem.slug}`}>{webItem.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{currentCategory.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <CategoryPageContent
        initialResources={initialResources}
        initialHasMore={initialHasMore}
        initialTotal={initialTotal}
        itemSlug={params.webSlug}
        itemType={itemType}
        categorySlug={params.categorySlug}
        dynamicAvailableFilterGroups={dynamicAvailableFilterGroups}
        itemName={webItem.name}
        categoryName={currentCategory.name}
        allItemCategories={allItemCategories}
        currentCategory={currentCategory}
        parentItemName={webItem.name}
        parentItemSlug={webItem.slug}
        maxVisibleCategoryTabs={MAX_VISIBLE_CATEGORY_TABS}
      />
    </div>
  );
}

export const revalidate = 3600;
