
'use client';

import type React from 'react';
import { useState, useEffect, useCallback, useRef, useTransition, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Resource, UserProfile, ItemWithDetails, ItemType, Category } from '@/lib/types';
import { ResourceCard } from '@/components/resource/ResourceCard';
import { Loader2 } from 'lucide-react';
import { fetchPaginatedAuthorResourcesAction } from '@/app/actions/resourceActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ITEM_TYPE_NAMES } from '@/lib/types';
import { Card } from '@/components/ui/card';

interface UserResourcesPageContentProps {
  profile: UserProfile;
  projectsForFilter: { [key in ItemType]?: ItemWithDetails[] };
  initialResources: Resource[];
  initialHasMore: boolean;
  initialTotal: number;
  resourcesPerPage: number;
}

const CLEAR_SELECTION_VALUE = "_ALL_";

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

  const [selectedSection, setSelectedSection] = useState<ItemType | undefined>(() => searchParams.get('section') as ItemType || undefined);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(() => searchParams.get('project') || undefined);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(() => searchParams.get('category') || undefined);

  useEffect(() => {
    setResources(initialResources);
    setCurrentPage(1);
    setHasMore(initialHasMore);
    setTotalResources(initialTotal);
  }, [initialResources, initialHasMore, initialTotal]);

  const updateUrlParams = useCallback((newParams: Record<string, string | undefined>) => {
    const current = new URLSearchParams();
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== CLEAR_SELECTION_VALUE) {
        current.set(key, value);
      }
    });
    const searchString = current.toString();
    startNavTransition(() => {
      router.push(`${pathname}${searchString ? `?${searchString}` : ''}`, { scroll: false });
    });
  }, [pathname, router]);

  const fetchAndSetResources = useCallback((page: number, options?: { isNewFilter?: boolean }) => {
    startDataTransition(async () => {
      const currentSearchParams = new URLSearchParams(window.location.search);
      const params = {
        userId: profile.id,
        itemType: currentSearchParams.get('section') as ItemType | undefined,
        parentItemId: currentSearchParams.get('project') || undefined,
        categoryId: currentSearchParams.get('category') || undefined,
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
    // This effect runs when the component mounts and whenever searchParams change,
    // ensuring the state is synced with the URL and initial data is loaded correctly.
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
      const newFilters = {
          section: level === 'section' ? (value || undefined) : selectedSection,
          project: level === 'project' ? (value || undefined) : (level === 'section' ? undefined : selectedProject),
          category: level === 'category' ? (value || undefined) : (level !== 'category' ? undefined : selectedCategory)
      };

      setSelectedSection(newFilters.section);
      setSelectedProject(newFilters.project);
      setSelectedCategory(newFilters.category);

      updateUrlParams(newFilters);
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
    <div className="space-y-6">
      <Card className="p-4 bg-card/80 backdrop-blur-sm shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
      </Card>

      {(isNavPending || isLoadingFirstPage) ? (
        <div className="flex justify-center items-center py-24"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
      ) : resources.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {resources.map(resource => <ResourceCard key={resource.id} resource={resource} />)}
        </div>
      ) : (
        <div className="text-center py-24"><p className="text-muted-foreground">No resources found matching the current filters.</p></div>
      )}

      <div ref={loadMoreRef} className="h-10" />

      {isDataLoading && currentPage > 1 && (
        <div className="flex justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}
    </div>
  );
}
