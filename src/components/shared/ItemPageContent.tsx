
'use client';

import type React from 'react';
import { useState, useEffect, useTransition, useRef } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselItem } from '@/components/shared/Carousel';
import { ResourceCard } from '@/components/resource/ResourceCard';
import { Loader2, Search, Layers, ChevronRight, Gamepad2, Code, TabletSmartphone, Music } from 'lucide-react';
import type { GenericListItem, Category, Resource, ItemType } from '@/lib/types';
import { fetchBestMatchForCategoryAction } from '@/app/actions/resourceActions';
import { getItemTypePlural } from '@/lib/utils';

interface ItemPageContentProps {
  item: GenericListItem;
  categories: Category[];
  initialCategoryResources: Record<string, Resource[]>;
}

const itemTypeIcons: Record<ItemType, React.ElementType> = {
  game: Gamepad2,
  web: Code,
  app: TabletSmartphone,
  'art-music': Music,
};

const DEBOUNCE_DELAY = 300;
const CAROUSEL_ITEMS_TO_SHOW = 5;
const FETCH_CAROUSEL_ITEMS_COUNT = CAROUSEL_ITEMS_TO_SHOW + 5;

export function ItemPageContent({ item, categories, initialCategoryResources }: ItemPageContentProps) {
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearching, startSearchTransition] = useTransition();
  const [categorySearchResults, setCategorySearchResults] = useState<Record<string, Resource[] | null>>({});
  const [isAutoplayActive, setIsAutoplayActive] = useState(true);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [carouselAllowOverflow, setCarouselAllowOverflow] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const basePath = `/${getItemTypePlural(item.itemType)}`;
  const NoResultsIcon = itemTypeIcons[item.itemType] || Layers;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(globalSearchQuery);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(handler);
  }, [globalSearchQuery]);

  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setCategorySearchResults({});
      setIsAutoplayActive(true);
      return;
    }

    setIsAutoplayActive(false);
    startSearchTransition(async () => {
      const results: Record<string, Resource[] | null> = {};
      for (const category of categories) {
        try {
          const bestMatches = await fetchBestMatchForCategoryAction(item.slug, item.itemType, category.slug, debouncedSearchQuery, FETCH_CAROUSEL_ITEMS_COUNT);
          results[category.slug] = bestMatches.length > 0 ? bestMatches : null;
        } catch (error) {
          console.error(`Failed to fetch search results for category ${category.name}:`, error);
          results[category.slug] = null;
        }
      }
      setCategorySearchResults(results);
    });
  }, [debouncedSearchQuery, item, categories]); 

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalSearchQuery(e.target.value);
  };

  const hasActiveSearch = debouncedSearchQuery.trim().length > 0;
  
  const handleResourceCardHover = (hovering: boolean) => {
    if (!hasActiveSearch) {
      setIsCarouselHovered(hovering);
    }
  };

  const handleResourceCardOverflowHover = (hovering: boolean) => {
    setCarouselAllowOverflow(hovering);
  };

  return (
    <div className="space-y-8">
      <div className="relative w-full sm:w-auto max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="search"
          placeholder={`Search all resources in ${item.name}...`}
          className="pl-10 text-base w-full"
          value={globalSearchQuery}
          onChange={handleSearchInputChange}
        />
      </div>
      {isSearching && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Searching...</p>
        </div>
      )}

      {!isSearching && hasActiveSearch && Object.values(categorySearchResults).every(res => res === null || res?.length === 0) && (
         <div className="text-center py-12">
            <NoResultsIcon className="w-16 h-16 text-primary mx-auto mb-4" />
            <p className="text-xl font-semibold text-foreground">No resources found for "{debouncedSearchQuery}"</p>
            <p className="text-muted-foreground">Try a different search term.</p>
          </div>
      )}

      {!isSearching && categories.length > 0 ? (
        categories.map((category) => {
          const categoryPageLink = `${basePath}/${item.slug}/${category.slug}`;
          const resourcesForCarousel = (hasActiveSearch
            ? categorySearchResults[category.slug]
            : initialCategoryResources[category.slug]) || [];

          if (hasActiveSearch && resourcesForCarousel.length === 0) {
            return (
              <section key={category.id} className="space-y-6 py-6 border-t border-border/40 first:border-t-0 opacity-60">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <Link href={categoryPageLink} className="group">
                      <h2 className="text-3xl font-semibold group-hover:text-primary transition-colors flex items-center">
                        <Layers className="w-7 h-7 mr-3 text-accent group-hover:text-primary transition-colors" />
                        {category.name}
                      </h2>
                    </Link>
                    {category.description && <p className="text-muted-foreground mt-1 max-w-2xl">{category.description}</p>}
                  </div>
                  <Button variant="outline" asChild className="mt-3 sm:mt-0">
                    <Link href={categoryPageLink}>View all in {category.name} <ChevronRight className="w-4 h-4 ml-2" /></Link>
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm mt-2 pl-10">No matching resources in this category for "{debouncedSearchQuery}".</p>
              </section>
            );
          }

          if (resourcesForCarousel.length === 0) {
             return (
                <section key={category.id} className="space-y-6 py-6 border-t border-border/40 first:border-t-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                    <Link href={categoryPageLink} className="group">
                        <h2 className="text-3xl font-semibold group-hover:text-primary transition-colors flex items-center">
                        <Layers className="w-7 h-7 mr-3 text-accent group-hover:text-primary transition-colors" />
                        {category.name}
                        </h2>
                    </Link>
                    {category.description && <p className="text-muted-foreground mt-1 max-w-2xl">{category.description}</p>}
                    </div>
                    <Button variant="outline" asChild className="mt-3 sm:mt-0">
                        <Link href={categoryPageLink}>View all in {category.name} <ChevronRight className="w-4 h-4 ml-2" /></Link>
                    </Button>
                </div>
                 <p className="text-muted-foreground text-sm mt-2 pl-10">No resources available in this category yet.</p>
                </section>
            );
          }

          return (
            <section key={category.id} className="space-y-6 py-6 border-t border-border/40 first:border-t-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <Link href={categoryPageLink} className="group">
                    <h2 className="text-3xl font-semibold group-hover:text-primary transition-colors flex items-center">
                      <Layers className="w-7 h-7 mr-3 text-accent group-hover:text-primary transition-colors" />
                      {category.name}
                    </h2>
                  </Link>
                  {category.description && <p className="text-muted-foreground mt-1 max-w-2xl">{category.description}</p>}
                </div>
                 <Button variant="outline" asChild className="mt-3 sm:mt-0">
                    <Link href={categoryPageLink}>View all in {category.name} <ChevronRight className="w-4 h-4 ml-2" /></Link>
                </Button>
              </div>
              <div className="mt-4">
                 <Carousel
                    autoplay={isAutoplayActive && !isCarouselHovered && resourcesForCarousel.length > CAROUSEL_ITEMS_TO_SHOW}
                    autoplayInterval={5000}
                    itemsToShow={CAROUSEL_ITEMS_TO_SHOW}
                    showArrows={resourcesForCarousel.length > CAROUSEL_ITEMS_TO_SHOW}
                    allowOverflow={carouselAllowOverflow}
                  >
                  {resourcesForCarousel.slice(0, FETCH_CAROUSEL_ITEMS_COUNT).map(resource => (
                    <CarouselItem key={resource.id}>
                      <ResourceCard
                        resource={resource}
                        compact
                        onHoverChange={handleResourceCardHover}
                        onOverflowHoverChange={handleResourceCardOverflowHover}
                      />
                    </CarouselItem>
                  ))}
                </Carousel>
              </div>
            </section>
          );
        })
      ) : (
         !isSearching && <section className="py-6 border-t border-border/40 first:border-t-0">
            <p className="text-muted-foreground text-center">No categories available for this project yet.</p>
        </section>
      )}
    </div>
  );
}
