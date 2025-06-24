
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import type { Resource, Tag, Category, PaginatedResourcesResponse, GetResourcesParams, ItemType, DynamicAvailableFilterTags } from '@/lib/types';
import { ResourceCard } from '@/components/resource/ResourceCard';
import { ResourceFilterControls } from '@/components/resource/ResourceFilterControls';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Info, Layers, PlusCircle } from 'lucide-react';
import { fetchPaginatedResourcesAction } from '@/app/actions/resourceActions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { CreateResourceButtonAndModal } from '@/components/resource/CreateResourceButtonAndModal';

const RESOURCES_PER_PAGE = 21;
const SEARCH_DEBOUNCE_MS = 500;

type SortByType = 'relevance' | 'downloads' | 'updatedAt' | 'name';

interface CategoryPageContentProps {
  initialResources: Resource[];
  initialHasMore: boolean;
  initialTotal: number;
  itemSlug: string;
  itemType: ItemType;
  categorySlug: string;
  dynamicAvailableFilterGroups: DynamicAvailableFilterTags;
  itemName: string;
  categoryName: string;
  allItemCategories: Category[];
  currentCategory: Category;
  parentItemName: string;
  parentItemSlug: string;
  maxVisibleCategoryTabs: number;
}

export function CategoryPageContent({
  initialResources,
  initialHasMore,
  initialTotal,
  itemSlug,
  itemType,
  categorySlug,
  dynamicAvailableFilterGroups,
  itemName,
  categoryName,
  allItemCategories,
  currentCategory,
  parentItemName,
  parentItemSlug,
  maxVisibleCategoryTabs,
}: CategoryPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavPending, startNavTransition] = useTransition();
  const [isDataLoading, startDataTransition] = useTransition();

  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [totalResources, setTotalResources] = useState(initialTotal);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [searchQueryInput, setSearchQueryInput] = useState(searchParams.get('q') || '');

  const getDefaultSortBy = useCallback(() => {
    const qFromUrl = searchParams.get('q') || '';
    if (qFromUrl) return 'relevance';
    return itemType === 'game' ? 'downloads' : 'updatedAt';
  }, [itemType, searchParams]);

  const [sortBy, setSortBy] = useState<SortByType>(() => {
    const sortParam = searchParams.get('sort') as SortByType;
    return sortParam || getDefaultSortBy();
  });

  const activeTagIdsRef = useRef<string[]>([]);

  const getAllActiveTagIdsFromParams = useCallback((params: URLSearchParams): string[] => {
    const allIds: string[] = [];
    dynamicAvailableFilterGroups.forEach(group => {
      const tagId = params.get(group.id);
      if (tagId) {
        allIds.push(tagId);
      }
    });
    return allIds;
  }, [dynamicAvailableFilterGroups]);

  useEffect(() => {
    const qFromUrl = searchParams.get('q') || '';
    setSearchQueryInput(qFromUrl);
    const sortParam = searchParams.get('sort');
    if (sortParam && ['relevance', 'downloads', 'updatedAt', 'name'].includes(sortParam)) {
      setSortBy(sortParam as SortByType);
    } else {
      setSortBy(getDefaultSortBy());
    }
    activeTagIdsRef.current = getAllActiveTagIdsFromParams(searchParams);
  }, [searchParams, getDefaultSortBy, getAllActiveTagIdsFromParams]);

  const fetchAndSetResources = useCallback(async (page: number, options?: { isNewSearchOrFilter?: boolean }) => {
    startDataTransition(async () => {
      const currentQ = searchParams.get('q') || '';
      const currentSort = (searchParams.get('sort') as SortByType) || getDefaultSortBy();
      const currentTagIds = getAllActiveTagIdsFromParams(searchParams);

      const params: GetResourcesParams = {
        parentItemSlug: itemSlug,
        parentItemType: itemType,
        categorySlug,
        page,
        limit: RESOURCES_PER_PAGE,
        searchQuery: currentQ || undefined,
        sortBy: currentSort,
        selectedTagIds: currentTagIds.length > 0 ? currentTagIds : undefined, 
      };

      try {
        const data = await fetchPaginatedResourcesAction(params);
        if (page === 1 || options?.isNewSearchOrFilter) {
          setResources(data.resources);
          setCurrentPage(1);
        } else {
          setResources((prev) => [...prev, ...data.resources]);
          setCurrentPage(page);
        }
        setHasMore(data.hasMore);
        setTotalResources(data.total);
      } catch (error) {
        console.error("Failed to fetch resources:", error);
      }
    });
  }, [itemSlug, itemType, categorySlug, searchParams, startDataTransition, getDefaultSortBy, getAllActiveTagIdsFromParams]);

  useEffect(() => {
    setResources(initialResources);
    setCurrentPage(1);
    setHasMore(initialHasMore);
    setTotalResources(initialTotal);
  }, [initialResources, initialHasMore, initialTotal]);

  useEffect(() => {
    fetchAndSetResources(1, { isNewSearchOrFilter: true });
  }, [searchParams, fetchAndSetResources]);

  const loadMoreResources = useCallback(() => {
    if (isDataLoading || !hasMore || isNavPending) return;
    fetchAndSetResources(currentPage + 1);
  }, [isDataLoading, hasMore, currentPage, fetchAndSetResources, isNavPending]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isDataLoading && !isNavPending) {
        loadMoreResources();
      }
    });
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, isDataLoading, isNavPending, loadMoreResources]);

  const updateUrlParams = useCallback((newParams: Record<string, string | undefined | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value.length > 0) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });
    if (current.get('sort') === 'relevance' && !current.get('q')) {
        const defaultSortValue = itemType === 'game' ? 'downloads' : 'updatedAt';
        current.set('sort', defaultSortValue);
    }
    if (current.get('q') && current.get('sort') !== 'relevance') {
        current.set('sort', 'relevance');
    }
    startNavTransition(() => {
      router.push(pathname + '?' + current.toString(), { scroll: false });
    });
  }, [searchParams, pathname, router, itemType]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQueryInput !== (searchParams.get('q') || '')) {
         updateUrlParams({ q: searchQueryInput });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [searchQueryInput, searchParams, updateUrlParams]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQueryInput(e.target.value);
  };

  const handleSortChange = (value: SortByType) => {
    updateUrlParams({ sort: value });
  };

  const handleFilterChange = useCallback((newFilters: Record<string, string | undefined>) => {
    updateUrlParams(newFilters);
  }, [updateUrlParams]);

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    router.refresh();
  };

  const isLoadingFirstPage = isDataLoading && currentPage === 1;
  const isLoadingMore = isDataLoading && currentPage > 1;
  const totalPages = Math.ceil(totalResources / RESOURCES_PER_PAGE) || 1;
  const hasAnyAvailableFilters = dynamicAvailableFilterGroups.length > 0;
  const hasActiveSearchOrFilters = activeTagIdsRef.current.length > 0 || (searchParams.get('q') || '');
  const itemTypePath = itemType === 'art-music' ? 'art-music' : `${itemType}s`;
  const visibleCategories = allItemCategories.slice(0, maxVisibleCategoryTabs);
  const showMoreCategoriesButton = allItemCategories.length > maxVisibleCategoryTabs;

  return (
    <>
      <header className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
              <Layers className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">{categoryName}</h1>
          </div>
          <Button variant="outline" className="ml-4 shrink-0" onClick={() => setIsCreateModalOpen(true)}>
              <PlusCircle className="w-4 h-4 mr-2" /> Add Resource
          </Button>
          <CreateResourceButtonAndModal
              isOpen={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
              onSuccess={handleCreateSuccess}
              itemType={itemType}
              itemSlug={parentItemSlug}
              categorySlug={categorySlug}
              itemName={parentItemName}
              categoryName={categoryName}
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
                    <Link href={`/${itemTypePath}/${parentItemSlug}/${cat.slug}`}>{cat.name}</Link>
                  </TabsTrigger>
                ))}
                {showMoreCategoriesButton && (
                  <Button variant="ghost" size="sm" asChild className="ml-2 text-sm h-auto py-1.5 px-2.5 hover:bg-muted/50">
                     <Link href={`/${itemTypePath}/${parentItemSlug}`} title={`View all categories for ${parentItemName}`}>
                        <PlusCircle className="w-4 h-4 mr-1.5" /> More
                    </Link>
                  </Button>
                )}
              </TabsList>
            </Tabs>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {hasAnyAvailableFilters && (
          <aside className="md:col-span-3 lg:col-span-3 space-y-6">
            <ResourceFilterControls
              dynamicAvailableFilterGroups={dynamicAvailableFilterGroups}
              itemType={itemType}
              onFilterChangeCallback={handleFilterChange}
            />
          </aside>
        )}

        <main className={hasAnyAvailableFilters ? "md:col-span-9 lg:col-span-9" : "md:col-span-12"}>
          <div className="mb-6 p-4 border rounded-lg bg-card shadow">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={'Search in ' + categoryName + '...'}
                  className="pl-10 w-full sm:min-w-[250px] md:min-w-[300px]"
                  value={searchQueryInput}
                  onChange={handleSearchInputChange}
                />
              </div>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full sm:w-auto min-w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  {itemType === 'game' && <SelectItem value="downloads">Downloads</SelectItem>}
                  <SelectItem value="updatedAt">Last Updated</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(isNavPending || isLoadingFirstPage) && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}

          {!(isNavPending || isLoadingFirstPage) && resources.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map(resource => (
                <ResourceCard key={resource.id} resource={resource} compact />
              ))}
            </div>
          )}

          {!(isNavPending || isLoadingFirstPage) && resources.length === 0 && (
            <div className="text-center py-12">
              <Image src="https://placehold.co/128x128.png" alt="No results" width={128} height={128} className="mx-auto mb-4 rounded-lg opacity-70" data-ai-hint="sad peachcat"/>
              <p className="text-xl font-semibold text-foreground">No resources found</p>
              <p className="text-muted-foreground">
                {hasActiveSearchOrFilters ? "Try adjusting your filters or search terms." : 'No resources in ' + categoryName + ' for ' + itemName + ' yet.'}
              </p>
            </div>
          )}

          {isLoadingMore && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          <div ref={loadMoreRef} className="h-10" />

          {!(isDataLoading || isNavPending) && resources.length > 0 && (
            <div className="py-6 text-center text-muted-foreground">
              {hasMore ? (
                <p>Loading more...</p>
              ) : (
                <p>You've reached the end of the list.</p>
              )}
              <p className="text-sm mt-1">Page {currentPage} of {totalPages} ({totalResources} resources total)</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
