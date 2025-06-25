

'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useRef, useTransition, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Resource, UserProfile, ItemWithDetails, ItemType, Category } from '@/lib/types';
import { ResourceCard } from '@/components/resource/ResourceCard';
import { Loader2, Search, ListFilter } from 'lucide-react';
import { fetchPaginatedAuthorResourcesAction } from '@/app/actions/resourceActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ITEM_TYPE_NAMES } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface UserResourcesPageContentProps {
  profile: UserProfile;
  projectsForFilter: { [key in ItemType]?: ItemWithDetails[] };
  initialResources: Resource[];
  initialHasMore: boolean;
  initialTotal: number;
  resourcesPerPage: number;
}

type SortByType = 'relevance' | 'updated_at' | 'downloads' | 'rating' | 'name';

const CLEAR_SELECTION_VALUE = "_ALL_";
const SEARCH_DEBOUNCE_MS = 500;

export function UserResourcesPageContent({
  profile,
  projectsForFilter,
  initialResources,
  initialHasMore,
  initialTotal,
  resourcesPerPage,
}: UserResourcesPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isNavPending, startNavTransition] = useTransition();
  const [isDataLoading, startDataTransition] = useTransition();

  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [totalResources, setTotalResources] = useState(initialTotal);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // State for UI controls
  const [searchQueryInput, setSearchQueryInput] = useState(searchParams.get('q') || '');
  const [selectedSection, setSelectedSection] = useState<ItemType | undefined>(() => searchParams.get('section') as ItemType || undefined);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(() => searchParams.get('project') || undefined);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(() => searchParams.get('category') || undefined);

  const getDefaultSortBy = useCallback(() => {
    return searchParams.get('q') ? 'relevance' : 'updated_at';
  }, [searchParams]);

  const [sortBy, setSortBy] = useState<SortByType>(() => {
    const sortParam = searchParams.get('sort') as SortByType;
    return sortParam || getDefaultSortBy();
  });


  // This effect syncs the local state of filters with the URL search params on mount/change
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const section = searchParams.get('section') as ItemType | undefined;
    const project = searchParams.get('project') || undefined;
    const category = searchParams.get('category') || undefined;
    const sort = searchParams.get('sort') as SortByType || getDefaultSortBy();

    setSearchQueryInput(q);
    setSelectedSection(section);
    setSelectedProject(project);
    setSelectedCategory(category);
    setSortBy(sort);
  }, [searchParams, getDefaultSortBy]);


  const updateUrlParams = useCallback((newParams: Record<string, string | undefined | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value.length > 0 && value !== CLEAR_SELECTION_VALUE) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    if (current.get('q') && current.get('sort') !== 'relevance') {
      current.set('sort', 'relevance');
    } else if (!current.get('q') && current.get('sort') === 'relevance') {
      current.set('sort', 'updated_at');
    }

    const searchString = current.toString();
    startNavTransition(() => {
      router.push(`${pathname}${searchString ? `?${searchString}` : ''}`, { scroll: false });
    });
  }, [searchParams, pathname, router]);

  useEffect(() => {
    const handler = setTimeout(() => {
      updateUrlParams({ q: searchQueryInput });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [searchQueryInput, updateUrlParams]);

  const fetchAndSetResources = useCallback((page: number, options?: { isNewFilter?: boolean }) => {
    startDataTransition(async () => {
      const currentSearchParams = new URLSearchParams(window.location.search);
      const params = {
        userId: profile.id,
        itemType: currentSearchParams.get('section') as ItemType | undefined,
        parentItemId: currentSearchParams.get('project') || undefined,
        categoryId: currentSearchParams.get('category') || undefined,
        searchQuery: currentSearchParams.get('q') || undefined,
        sortBy: (currentSearchParams.get('sort') as SortByType) || undefined,
        page,
        limit: resourcesPerPage,
      };

      try {
        const data = await fetchPaginatedAuthorResourcesAction(params);
        if (page === 1 || options?.isNewFilter) {
          setResources(data.resources);
          setCurrentPage(1);
        } else {
          setResources((prev) => [...prev, ...data.resources]);
          setCurrentPage(page);
        }
        setHasMore(data.hasMore);
        setTotalResources(data.total);
      } catch (error) {
        console.error("Failed to fetch author resources:", error);
      }
    });
  }, [profile.id, resourcesPerPage]);
  
  useEffect(() => {
    setResources(initialResources);
    setCurrentPage(1);
    setHasMore(initialHasMore);
    setTotalResources(initialTotal);
  }, [initialResources, initialHasMore, initialTotal]);


  useEffect(() => {
    fetchAndSetResources(1, { isNewFilter: true });
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

  const handleFilterChange = (level: 'section' | 'project' | 'category', value: string) => {
      const currentFilters = new URLSearchParams(searchParams);
      
      if (level === 'section') {
        currentFilters.set('section', value);
        currentFilters.delete('project');
        currentFilters.delete('category');
      } else if (level === 'project') {
        currentFilters.set('project', value);
        currentFilters.delete('category');
      } else if (level === 'category') {
        currentFilters.set('category', value);
      }
      
      if (value === CLEAR_SELECTION_VALUE) {
        currentFilters.delete(level);
        if (level === 'section') {
            currentFilters.delete('project');
            currentFilters.delete('category');
        }
        if (level === 'project') {
            currentFilters.delete('category');
        }
      }

      startNavTransition(() => {
        router.push(`${pathname}?${currentFilters.toString()}`, { scroll: false });
      });
  };

  const handleSortChange = (value: SortByType) => {
    updateUrlParams({ sort: value });
  };
  
  const allProjects = useMemo(() => Object.values(projectsForFilter).flat(), [projectsForFilter]);
  
  const projectOptions = useMemo(() => {
    return selectedSection ? (projectsForFilter[selectedSection] || []) : [];
  }, [selectedSection, projectsForFilter]);

  const categoryOptions = useMemo(() => {
    if (!selectedProject) return [];
    const project = allProjects.find(p => p.id === selectedProject);
    return project?.categories || [];
  }, [selectedProject, allProjects]);

  const isLoadingFirstPage = isDataLoading && currentPage === 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      <aside className="md:col-span-3 lg:col-span-3 space-y-6">
        <Card className="bg-card/80 backdrop-blur-sm shadow-md sticky top-24">
            <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-lg flex items-center">
                    <ListFilter className="w-5 h-5 mr-2 text-primary" />
                    Filters
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div className="space-y-4">
                <div>
                    <Label htmlFor="section-filter" className="text-xs">Section</Label>
                    <Select value={selectedSection || CLEAR_SELECTION_VALUE} onValueChange={(val) => handleFilterChange('section', val)}>
                    <SelectTrigger id="section-filter" className="mt-1"><SelectValue placeholder="All Sections" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={CLEAR_SELECTION_VALUE}>All Sections</SelectItem>
                        {Object.keys(projectsForFilter).map(itemType => (
                        <SelectItem key={itemType} value={itemType}>{ITEM_TYPE_NAMES[itemType as ItemType]}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="project-filter" className="text-xs">Project</Label>
                    <Select value={selectedProject || CLEAR_SELECTION_VALUE} onValueChange={(val) => handleFilterChange('project', val)} disabled={!selectedSection}>
                    <SelectTrigger id="project-filter" className="mt-1"><SelectValue placeholder="All Projects" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={CLEAR_SELECTION_VALUE}>All Projects</SelectItem>
                        {projectOptions.map(proj => <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="category-filter" className="text-xs">Category</Label>
                    <Select value={selectedCategory || CLEAR_SELECTION_VALUE} onValueChange={(val) => handleFilterChange('category', val)} disabled={!selectedProject}>
                    <SelectTrigger id="category-filter" className="mt-1"><SelectValue placeholder="All Categories" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={CLEAR_SELECTION_VALUE}>All Categories</SelectItem>
                        {categoryOptions.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                </div>
            </CardContent>
        </Card>
      </aside>

      <main className="md:col-span-9 lg:col-span-9 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                type="search"
                placeholder={`Search ${profile.name}'s resources...`}
                className="pl-10 w-full"
                value={searchQueryInput}
                onChange={(e) => setSearchQueryInput(e.target.value)}
                />
            </div>
            <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full sm:w-auto min-w-[160px]">
                <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="relevance" disabled={!searchQueryInput}>Relevance</SelectItem>
                <SelectItem value="updated_at">Last Updated</SelectItem>
                <SelectItem value="downloads">Downloads</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                </SelectContent>
            </Select>
        </div>

        {(isNavPending || isLoadingFirstPage) ? (
            <div className="flex justify-center items-center py-24"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
        ) : resources.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {resources.map(resource => <ResourceCard key={resource.id} resource={resource} />)}
            </div>
        ) : (
            <div className="text-center py-24"><p className="text-muted-foreground">No resources found matching the current filters.</p></div>
        )}

        <div ref={loadMoreRef} className="h-10" />

        {isDataLoading && currentPage > 1 && (
            <div className="flex justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        )}
      </main>
    </div>
  );
}
