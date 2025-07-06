

"use client"; 

import { useState, useEffect } from 'react'; 
import { notFound, useRouter, useSearchParams as useNextSearchParams, usePathname } from 'next/navigation'; 
import Link from 'next/link';
import type { Resource, ItemType, DynamicAvailableFilterTags } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResourceInfoSidebar } from '@/components/resource/ResourceInfoSidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceFilesTabContent } from '@/components/resource/ResourceFilesTabContent';
import { ResourceReviewsTabContent } from '@/components/resource/ResourceReviewsTabContent'; 
import { FileText, BookOpen, ListChecks, MessageCircle, Eye, Heart, Star, Loader2, Edit3, ImageIcon } from 'lucide-react';
import { ImageGalleryCarousel } from '@/components/shared/ImageGalleryCarousel';
import { ResourceCard } from '@/components/resource/ResourceCard';
import { Carousel, CarouselItem } from '@/components/shared/Carousel';
import { EditResourceButtonAndModal } from '@/components/resource/EditResourceButtonAndModal'; 
import { getAvailableFilterTags } from '@/lib/data';
import { getItemTypePlural } from '@/lib/utils';
import parse, { domToReact, Element } from 'html-react-parser';
import { cn } from '@/lib/utils';
import { RenderedCodeBlock } from '@/components/shared/RenderedCodeBlock';


interface ResourcePageContentProps {
  resource: Resource; 
  relatedResources: Resource[];
}

function getText(node: any): string {
  if (node.type === 'text') return node.data;
  if (node.children && node.children.length > 0) {
    return node.children.map(getText).join('');
  }
  return '';
}

export function ResourcePageContent({ resource, relatedResources }: ResourcePageContentProps) {
    const resolvedSearchParamsHook = useNextSearchParams(); 
    const router = useRouter();
    const pathname = usePathname();

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
        async function fetchTags() {
            try {
                const allCategoryTags = await getAvailableFilterTags(resource.parentItemSlug, resource.parentItemType, resource.categorySlug);
                setDynamicAvailableFileTagGroups(allCategoryTags.filter(group => group.appliesToFiles));
            } catch (error) {
                console.error("Error fetching available file tags:", error);
            }
        }
        fetchTags();
    }, [resource.parentItemSlug, resource.parentItemType, resource.categorySlug]);

    const itemTypePlural = getItemTypePlural(resource.parentItemType);
    const parentItemSectionPath = `/${itemTypePlural}`;
    const parentItemPath = `${parentItemSectionPath}/${resource.parentItemSlug}`;
    const parentCategoryPath = `${parentItemPath}/${resource.categorySlug}`;

    const handleResourceCardHover = (hovering: boolean) => {
        // Placeholder if needed
    };
    const handleResourceCardOverflowHover = (hovering: boolean) => {
        setCarouselAllowOverflow(hovering);
    };

    const galleryImages: string[] = [];
    if (resource.showMainImageInGallery && resource.imageUrl) {
        galleryImages.push(resource.imageUrl);
    }
    if (resource.imageGallery && resource.imageGallery.length > 0) {
        resource.imageGallery.forEach(imgUrl => {
            if (imgUrl && !galleryImages.includes(imgUrl)) { 
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

    const parseOptions = {
        replace: (domNode: any) => {
            if (domNode instanceof Element && domNode.attribs) {
                // Carousel parser
                if (domNode.attribs['data-image-carousel'] !== undefined) {
                    try {
                        const { 
                            ['data-image-carousel']: _,
                            ['data-images']: imagesJson,
                            ['data-aspect-ratio']: aspectRatio,
                            ['data-autoplay-interval']: autoplayIntervalStr,
                            style,
                            class: className,
                            ...restAttribs 
                        } = domNode.attribs;

                        const images = JSON.parse(imagesJson || '[]');
                        const autoplayInterval = autoplayIntervalStr ? parseInt(autoplayIntervalStr, 10) : 5000;
                        const finalAspectRatio = aspectRatio || '16/9';

                        const styleString = style || '';
                        const styleObject = styleString.split(';').reduce((acc: React.CSSProperties, styleRule: string) => {
                          const [key, value] = styleRule.split(':');
                          if (key && value) {
                            const camelCasedKey = key.trim().replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
                            (acc as any)[camelCasedKey] = value.trim();
                          }
                          return acc;
                        }, {} as React.CSSProperties);
                        
                        return (
                            <div {...restAttribs} style={styleObject} className={cn("rich-text-media-node", className)}> 
                                <ImageGalleryCarousel
                                  images={images}
                                  aspectRatio={finalAspectRatio}
                                  autoplayInterval={autoplayInterval}
                                />
                            </div>
                        );

                    } catch (e) {
                        console.error("Failed to parse carousel images:", e);
                    }
                }
                
                // Code Block parser
                if (domNode.attribs['data-custom-code-block'] !== undefined) {
                    const preElement = domNode.children.find((child: any) => child.name === 'pre') as Element | undefined;
                    const codeElement = preElement?.children.find((child: any) => child.name === 'code') as Element | undefined;
                    
                    if (codeElement) {
                        const title = domNode.attribs['data-title'] || '';
                        const language = codeElement.attribs['class']?.replace('language-', '') || 'plaintext';
                        const maxHeight = domNode.attribs['data-max-height'] || '400px';
                        const rawCodeContent = getText(codeElement);

                        return <RenderedCodeBlock
                            title={title}
                            language={language}
                            maxHeight={maxHeight}
                            rawCodeContent={rawCodeContent}
                        >
                            {domToReact(codeElement.children, parseOptions)}
                        </RenderedCodeBlock>;
                    }
                }
            }
        }
    };

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={parentItemSectionPath}>{resource.parentItemType}</BreadcrumbLink></BreadcrumbItem>
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
                <ImageGalleryCarousel 
                    images={galleryImages} 
                    className="w-full rounded-t-md" 
                    aspectRatio={resource.galleryAspectRatio || '16/9'}
                    autoplayInterval={resource.galleryAutoplayInterval}
                />
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
                    className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none prose-headings:text-primary prose-a:text-accent hover:prose-a:text-accent/80 leading-relaxed"
                  >
                    {parse(resource.detailedDescription || '', parseOptions)}
                  </div>
                </TabsContent>
                <TabsContent value="files">
                  {resource.files && resource.files.length > 0 ? (
                    <ResourceFilesTabContent
                        files={resource.files}
                        resourceId={resource.id}
                        dynamicAvailableFileTagGroups={dynamicAvailableFileTagGroups}
                    />
                  ) : (
                    <p className="text-muted-foreground p-4 text-center">No files available for this resource.</p>
                  )}
                </TabsContent>
                <TabsContent value="requirements">
                  {resource.requirements ? (
                     <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line leading-relaxed" dangerouslySetInnerHTML={{ __html: resource.requirements.replace(/\\n/g, '<br />') }}/>
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
