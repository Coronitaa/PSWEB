
"use client"; 

import { use, useState, useEffect } from 'react'; 
import { notFound, useRouter, usePathname, useSearchParams as useNextSearchParams } from 'next/navigation'; // Added useRouter, usePathname
import Image from 'next/image';
import Link from 'next/link';
import type { Resource, ItemType, DynamicAvailableFilterTags } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResourceInfoSidebar } from '@/components/resource/ResourceInfoSidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceFilesTabContent } from '@/components/resource/ResourceFilesTabContent';
import { ResourceReviewsTabContent } from '@/components/resource/ResourceReviewsTabContent'; 
import { FileText, BookOpen, ListChecks, MessageCircle, Eye, Heart, Star, Loader2, Edit3, ImageIcon } from 'lucide-react'; // Added ImageIcon
import { Carousel, CarouselItem } from '@/components/shared/Carousel';
import { ImageGalleryCarousel } from '@/components/shared/ImageGalleryCarousel';
import { ResourceCard } from '@/components/resource/ResourceCard';
import { fetchResourceBySlugAction, fetchPaginatedResourcesAction } from '@/app/actions/resourceActions';
import { EditResourceButtonAndModal } from '@/components/resource/EditResourceButtonAndModal'; 
import { getAvailableFilterTags } from '@/lib/data';

interface ResourcePageProps {
  params: Promise<{ resourceSlug: string }>; 
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const getItemTypeSectionPathAndName = (itemType: ItemType): { path: string; name: string } => {
  switch (itemType) {
    case 'game': return { path: '/games', name: 'Games' };
    case 'web': return { path: '/web', name: 'Web Projects' };
    case 'app': return { path: '/apps', name: 'Apps' };
    case 'art-music': return { path: '/art-music', name: 'Art & Music' };
    default: return { path: '/', name: 'Projects' }; 
  }
};

export default function ResourcePageWrapper({ params: paramsPromise, searchParams: searchParamsPromise }: ResourcePageProps) {
    const resolvedParams = use(paramsPromise); 
    const resolvedSearchParamsHook = useNextSearchParams(); // Use hook for live updates
    const router = useRouter();
    const pathname = usePathname();

    const resourceSlug = resolvedParams?.resourceSlug;

    const [resource, setResource] = useState<Resource | null>(null);
    const [relatedResources, setRelatedResources] = useState<Resource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [carouselAllowOverflow, setCarouselAllowOverflow] = useState(false);
    const [dynamicAvailableFileTagGroups, setDynamicAvailableFileTagGroups] = useState<DynamicAvailableFilterTags>([]);

    const initialTabFromUrl = resolvedSearchParamsHook.get('tab') || 'overview';
    const [activeTab, setActiveTab] = useState<string>(initialTabFromUrl);

    useEffect(() => {
      const currentTab = resolvedSearchParamsHook.get('tab') || 'overview';
      if (currentTab !== activeTab) {
        setActiveTab(currentTab);
      }
    }, [resolvedSearchParamsHook, activeTab]);


    useEffect(() => {
        async function fetchData() {
            if (!resourceSlug) {
                setIsLoading(false);
                setResource(null);
                return;
            }
            setIsLoading(true);
            try {
                const fetchedResource = await fetchResourceBySlugAction(resourceSlug);
                
                if (!fetchedResource) {
                    setResource(null);
                    setIsLoading(false);
                    return; 
                }
                setResource(fetchedResource);

                const { resources: allResourcesInParentCategory } = await fetchPaginatedResourcesAction({
                    parentItemSlug: fetchedResource.parentItemSlug,
                    parentItemType: fetchedResource.parentItemType,
                    categorySlug: fetchedResource.categorySlug,
                    limit: 6 
                });
                setRelatedResources(allResourcesInParentCategory.filter(r => r.id !== fetchedResource.id).slice(0, 5));

                const allCategoryTags = await getAvailableFilterTags(fetchedResource.parentItemSlug, fetchedResource.parentItemType, fetchedResource.categorySlug);
                setDynamicAvailableFileTagGroups(allCategoryTags.filter(group => group.appliesToFiles));

            } catch (error) {
                console.error("Error fetching resource data:", error);
                setResource(null);
            } finally {
                setIsLoading(false);
            }
        }

        if (resourceSlug) {
            fetchData();
        } else {
            setIsLoading(false);
            setResource(null);
        }
    }, [resourceSlug]);

    if (isLoading) {
        return (
          <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading resource details...</p>
          </div>
        );
    }

    if (!resource) {
        notFound(); 
    }
    
    const parentItemSection = getItemTypeSectionPathAndName(resource.parentItemType);
    const parentItemPath = `${parentItemSection.path}/${resource.parentItemSlug}`;
    const parentCategoryPath = `${parentItemPath}/${resource.categorySlug}`;

    const handleResourceCardHover = (hovering: boolean) => {
        // Placeholder if needed
    };
    const handleResourceCardOverflowHover = (hovering: boolean) => {
        setCarouselAllowOverflow(hovering);
    };

    const galleryImages: string[] = [];
    if (resource.imageUrl) {
        galleryImages.push(resource.imageUrl);
    }
    if (resource.imageGallery && resource.imageGallery.length > 0) {
        resource.imageGallery.forEach(imgUrl => {
            if (!galleryImages.includes(imgUrl)) { 
                galleryImages.push(imgUrl);
            }
        });
    }
    if (galleryImages.length === 0) {
        galleryImages.push('https://placehold.co/800x450.png?text=No+Image'); 
    }

    const handleTabChange = (newTab: string) => {
      setActiveTab(newTab);
      const current = new URLSearchParams(Array.from(resolvedSearchParamsHook.entries()));
      current.set('tab', newTab);
      router.replace(`${pathname}?${current.toString()}`, { scroll: false });
    };

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={parentItemSection.path}>{parentItemSection.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={parentItemPath}>{resource.parentItemName}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={parentCategoryPath}>{resource.categoryName}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{resource.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <main className="lg:col-span-8 space-y-6">
          <Card className="overflow-hidden shadow-xl bg-card/70 backdrop-blur-sm border-border/30">
            {galleryImages.length > 0 ? (
                <ImageGalleryCarousel images={galleryImages} className="w-full aspect-[16/9] rounded-t-md" />
            ) : (
                <div className="relative aspect-[16/9] bg-muted rounded-t-md flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-muted-foreground" />
                </div>
            )}
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                <div>
                  <CardTitle className="text-3xl md:text-4xl font-bold mb-1 text-primary drop-shadow-md">{resource.name}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground">{resource.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                    <Button variant="outline" size="sm" className="button-outline-glow button-follow-sheen shrink-0">
                        <Heart className="w-4 h-4 mr-2 text-accent" /> Follow
                    </Button>
                    <EditResourceButtonAndModal resource={resource} />
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4 bg-card-foreground/5 rounded-md"> 
                  <TabsTrigger value="overview" id="overview-tab"><Eye className="w-4 h-4 mr-1 sm:mr-2" />Overview</TabsTrigger>
                  <TabsTrigger value="files" id="files-tab"><FileText className="w-4 h-4 mr-1 sm:mr-2" />Files</TabsTrigger>
                  <TabsTrigger value="requirements" id="requirements-tab"><ListChecks className="w-4 h-4 mr-1 sm:mr-2" />Requirements</TabsTrigger>
                  <TabsTrigger value="reviews" id="reviews-tab"><Star className="w-4 h-4 mr-1 sm:mr-2" />Reviews</TabsTrigger> 
                </TabsList>
                <TabsContent value="overview">
                  <div
                    className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none prose-headings:text-primary prose-a:text-accent hover:prose-a:text-accent/80 whitespace-pre-line leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: resource.detailedDescription ? resource.detailedDescription.replace(/\n/g, '<br />') : '' }}
                  />
                </TabsContent>
                <TabsContent value="files">
                  {resource.files && resource.files.length > 0 ? (
                    <ResourceFilesTabContent
                        files={resource.files}
                        allChangelogEntries={resource.changelogEntries || []}
                        resourceId={resource.id}
                        dynamicAvailableFileTagGroups={dynamicAvailableFileTagGroups}
                    />
                  ) : (
                    <p className="text-muted-foreground p-4 text-center">No files available for this resource.</p>
                  )}
                </TabsContent>
                <TabsContent value="requirements">
                  {resource.requirements ? (
                     <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line leading-relaxed" dangerouslySetInnerHTML={{ __html: resource.requirements.replace(/\n/g, '<br />') }}/>
                  ) : (
                    <p className="text-muted-foreground p-4 text-center">No specific requirements listed for this resource.</p>
                  )}
                </TabsContent>
                <TabsContent value="reviews"> 
                  <ResourceReviewsTabContent resource={resource} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>

        <aside className="lg:col-span-4 mt-8 lg:mt-0">
          <ResourceInfoSidebar resource={resource} />
        </aside>
      </div>

      {relatedResources.length > 0 && (
        <section className="pt-8 mt-8 border-t border-border/30">
          <h2 className="text-2xl font-semibold mb-6 text-center text-primary">Related Resources</h2>
           <Carousel
            itemsToShow={3}
            showArrows={relatedResources.length > 3}
            autoplay={!carouselAllowOverflow} 
            autoplayInterval={6000}
            className="px-2"
            allowOverflow={carouselAllowOverflow}
          >
            {relatedResources.map(related => (
              <CarouselItem key={related.id}>
                <ResourceCard 
                    resource={related} 
                    compact 
                    onHoverChange={handleResourceCardHover}
                    onOverflowHoverChange={handleResourceCardOverflowHover}
                />
              </CarouselItem>
            ))}
          </Carousel>
        </section>
      )}
    </div>
  );
}
