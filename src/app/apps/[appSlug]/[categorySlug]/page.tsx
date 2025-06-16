
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAppItemBySlug, getCategoryDetails, getResources, getAvailableFilterTags, getCategoriesForItemGeneric } from '@/lib/data';
import type { AppItem, Category, ItemType, DynamicAvailableFilterTags } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, PlusCircle, TabletSmartphone } from 'lucide-react';
import { CategoryPageContent } from '@/app/games/[gameSlug]/[categorySlug]/CategoryPageContent'; // Re-using the generic component
import { CreateResourceButtonAndModal } from '@/components/resource/CreateResourceButtonAndModal';
import { cn } from '@/lib/utils';

const RESOURCES_PER_PAGE = 20;
const MAX_VISIBLE_CATEGORY_TABS = 5;

interface AppCategoryPageParams { appSlug: string; categorySlug: string };
interface AppCategoryPageSearchParams { [key: string]: string | string[] | undefined };

interface AppCategoryPageProps {
  params: Promise<AppCategoryPageParams>;
  searchParams: Promise<AppCategoryPageSearchParams>;
}

type SortByType = 'relevance' | 'updatedAt' | 'name';

export default async function AppCategoryPage({ params: paramsPromise, searchParams: searchParamsPromise }: AppCategoryPageProps) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;

  const appItem = await getAppItemBySlug(params.appSlug);
  if (!appItem) {
    notFound();
  }
  const itemType: ItemType = 'app';
  const currentCategory = await getCategoryDetails(params.appSlug, itemType, params.categorySlug);
  const allItemCategories = await getCategoriesForItemGeneric(appItem.id, itemType);

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
    parentItemSlug: params.appSlug,
    parentItemType: itemType,
    categorySlug: params.categorySlug,
    selectedTagIds: activeTagFilters.length > 0 ? activeTagFilters : undefined,
    searchQuery,
    sortBy,
    page: 1,
    limit: RESOURCES_PER_PAGE,
  });

  const dynamicAvailableFilterGroups: DynamicAvailableFilterTags = await getAvailableFilterTags(params.appSlug, itemType, params.categorySlug);

  const visibleCategories = allItemCategories.length > MAX_VISIBLE_CATEGORY_TABS
    ? allItemCategories.slice(0, MAX_VISIBLE_CATEGORY_TABS)
    : allItemCategories;
  const showMoreCategoriesButton = allItemCategories.length > MAX_VISIBLE_CATEGORY_TABS;

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/apps">Apps</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/apps/${appItem.slug}`}>{appItem.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{currentCategory.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
              <Layers className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">{currentCategory.name}</h1>
          </div>
          <CreateResourceButtonAndModal
              itemType={itemType}
              itemSlug={params.appSlug}
              categorySlug={params.categorySlug}
              itemName={appItem.name}
              categoryName={currentCategory.name}
          />
        </div>
        {currentCategory.description && <p className="mt-2 text-lg text-muted-foreground">{currentCategory.description}</p>}
      </header>

      {allItemCategories.length > 1 && (
        <div className="mb-6 border-b pb-2">
            <Tabs defaultValue={currentCategory.slug} className="overflow-x-auto whitespace-nowrap scrollbar-hide">
              <TabsList className="inline-flex justify-start gap-1 bg-transparent p-0 w-max">
                {visibleCategories.map(cat => (
                  <TabsTrigger
                    key={cat.id}
                    value={cat.slug}
                    asChild
                    className={cn(
                      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-muted/50 px-3 py-1.5 h-auto text-sm",
                      cat.slug === currentCategory.slug && "bg-primary text-primary-foreground shadow-md"
                    )}
                  >
                    <Link href={`/apps/${appItem.slug}/${cat.slug}`}>{cat.name}</Link>
                  </TabsTrigger>
                ))}
                {showMoreCategoriesButton && (
                  <Button variant="ghost" size="sm" asChild className="ml-2 text-sm h-auto py-1.5 px-2.5 hover:bg-muted/50">
                     <Link href={`/apps/${appItem.slug}`} title={`View all categories for ${appItem.name}`}>
                        <PlusCircle className="w-4 h-4 mr-1.5" /> More
                    </Link>
                  </Button>
                )}
              </TabsList>
            </Tabs>
        </div>
      )}

      <CategoryPageContent
        initialResources={initialResources}
        initialHasMore={initialHasMore}
        initialTotal={initialTotal}
        itemSlug={params.appSlug}
        itemType={itemType}
        categorySlug={params.categorySlug}
        dynamicAvailableFilterGroups={dynamicAvailableFilterGroups}
        itemName={appItem.name}
        categoryName={currentCategory.name}
      />
    </div>
  );
}

export const revalidate = 3600;
