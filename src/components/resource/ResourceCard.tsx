
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Resource, ItemType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TagBadge } from '@/components/shared/TagBadge';
import { Download, Eye, User, Tags, Info, ArrowRight, Star, StarHalf, Heart, ThumbsUp, Gamepad2, Code, TabletSmartphone, Music as MusicIconPackage } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Carousel as NestedCarousel, CarouselItem as NestedCarouselItem } from '@/components/shared/Carousel';
import { formatNumberWithSuffix, getItemTypePlural } from '@/lib/utils';

interface ResourceCardProps {
  resource: Resource;
  compact?: boolean;
  onHoverChange?: (hovering: boolean) => void;
  onOverflowHoverChange?: (hovering: boolean) => void;
}

const MAX_TAGS_COMPACT = 1;
const MAX_TAGS_OVERLAY = 9;

const sectionIconMap: Record<ItemType, React.ElementType> = {
  game: Gamepad2,
  web: Code,
  app: TabletSmartphone,
  'art-music': MusicIconPackage,
};

const RatingDisplay: React.FC<{
  rating?: number;
  reviewCount?: number;
  positiveReviewPercentage?: number;
  compact?: boolean;
  fiveStarMode?: boolean
}> = ({ rating, reviewCount, positiveReviewPercentage, compact = false, fiveStarMode = false }) => {
  if (typeof rating !== 'number' || rating < 0 || rating > 5 || reviewCount === undefined || reviewCount === 0) {
     return <span className={cn("text-muted-foreground", compact ? "text-xs" : "text-base")}>No reviews</span>;
  }

  if (fiveStarMode) {
    const stars = [];
    const starSize = compact ? "w-3.5 h-3.5" : "w-4 h-4";
    for (let i = 0; i < 5; i++) {
      if (rating >= i + 0.75) {
        stars.push(<Star key={`star-full-${i}`} className={cn(starSize, "text-amber-400 fill-amber-400")} />);
      } else if (rating >= i + 0.25) {
        stars.push(<StarHalf key={`star-half-${i}`} className={cn(starSize, "text-amber-400 fill-amber-400")} />);
      } else {
        stars.push(<Star key={`star-empty-${i}`} className={cn(starSize, "text-amber-400/40")} />);
      }
    }
    return (
      <div className="flex items-center">
        {stars}
        <span className={cn("ml-1.5", compact ? "text-xs" : "text-base", "text-muted-foreground")}>
          ({rating.toFixed(1)})
          {reviewCount !== undefined && <span className="ml-1">({formatNumberWithSuffix(reviewCount)} reviews)</span>}
        </span>
      </div>
    );
  } else {
    const iconSizeClass = compact ? "w-3.5 h-3.5" : "w-4 h-4";
    const textSize = compact ? "text-xs" : "text-base";

    const sentimentColorClass = positiveReviewPercentage && positiveReviewPercentage >= 70 ? 'text-green-400' : positiveReviewPercentage && positiveReviewPercentage >=40 ? 'text-yellow-400' : 'text-red-400';

    return (
      <div className={cn("flex items-center gap-1", textSize)}>
        <ThumbsUp className={cn(iconSizeClass, sentimentColorClass, compact && "mr-0.5")} />
        <span className={cn(sentimentColorClass, "font-medium")}>{positiveReviewPercentage?.toFixed(0)}%</span>
        <span className="text-muted-foreground">({formatNumberWithSuffix(reviewCount)})</span>
      </div>
    );
  }
};

export function ResourceCard({ resource, compact = false, onHoverChange, onOverflowHoverChange }: ResourceCardProps) {
  const [isHoveringLocal, setIsHoveringLocal] = useState(false); 

  const handleMouseEnter = () => {
    setIsHoveringLocal(true);
    onHoverChange?.(true);
    if (compact) {
      onOverflowHoverChange?.(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHoveringLocal(false);
    onHoverChange?.(false);
     if (compact) {
      onOverflowHoverChange?.(false);
    }
  };

  const latestFile = resource.files && resource.files.length > 0
    ? resource.files.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0]
    : null;

  const SectionIcon = sectionIconMap[resource.parentItemType];
  
  const imageGalleryForOverlay: string[] = [];
  if (resource.showMainImageInGallery !== false && resource.imageUrl) {
      imageGalleryForOverlay.push(resource.imageUrl);
  }
  if (resource.imageGallery && resource.imageGallery.length > 0) {
      resource.imageGallery.forEach(imgUrl => {
          if (!imageGalleryForOverlay.includes(imgUrl)) {
              imageGalleryForOverlay.push(imgUrl);
          }
      });
  }
  if (imageGalleryForOverlay.length === 0 && resource.imageUrl) {
      imageGalleryForOverlay.push(resource.imageUrl);
  }

  const hasGalleryForOverlay = imageGalleryForOverlay.length > 0;
  
  const resourcePath = `/${getItemTypePlural(resource.parentItemType)}/${resource.parentItemSlug}/${resource.categorySlug}/${resource.slug}`;

  return (
    <div
      className={cn(
        "relative h-full group/card-container",
        compact ? "hover:z-40" : ""
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={resourcePath} className="block h-full" aria-label={`View details for ${resource.name}`}>
          <Card
            className={cn(
              "overflow-hidden h-full flex flex-col bg-card/80 backdrop-blur-sm shadow-lg transition-all duration-300 ease-in-out border-border/30 group-hover/card-container:border-primary/50 group-hover/card-container:shadow-primary/20 group-hover/card-container:transform group-hover/card-container:-translate-y-px", 
              compact ? "p-2 pb-1.5" : "p-4",
            )}
          >
            <CardHeader className="p-0 relative">
              {compact && SectionIcon && (
                <Badge variant="secondary" className="absolute top-1.5 right-1.5 z-20 p-1 rounded-full bg-accent/80 text-accent-foreground shadow">
                  <SectionIcon className="w-3 h-3" />
                </Badge>
              )}
              <div className="block relative aspect-video overflow-hidden">
                <Image
                  src={resource.imageUrl || 'https://placehold.co/800x450.png'}
                  alt={`${resource.name} preview`}
                  fill
                  style={{ objectFit: "cover" }}
                  className="group-hover/card-container:scale-105 transition-transform duration-300 ease-in-out"
                  data-ai-hint={compact ? "gameplay thumbnail abstract" : "gameplay screenshot pattern"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/70 via-card/30 to-transparent group-hover/card-container:from-card/50 transition-all duration-300"></div> 
              </div>
            </CardHeader>
            <CardContent className={cn("flex-grow", compact ? 'p-2 pt-1.5 pb-1' : 'p-4 pt-3')}>
              <CardTitle className={cn("font-semibold group-hover/card-container:text-primary transition-colors line-clamp-2", compact ? "text-lg mb-0" : "text-2xl mb-0.5")}>
                {resource.name}
              </CardTitle>
              {!compact && (
                <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                  For {resource.parentItemName} / {resource.categoryName}
                </p>
              )}
               <p className={cn("text-muted-foreground flex items-center line-clamp-1", compact ? "text-[10px] mb-0.5" : "text-sm mb-1.5")}>
                By <span className="text-primary ml-1">{resource.author.name}</span>
              </p>
              {compact && resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {resource.tags.slice(0, MAX_TAGS_COMPACT).map(tag => (
                    <TagBadge key={tag.id} tag={tag} className="text-[9px] px-1 py-0" />
                  ))}
                  {resource.tags.length > MAX_TAGS_COMPACT && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-accent/50 text-accent">
                      +{resource.tags.length - MAX_TAGS_COMPACT}
                    </Badge>
                  )}
                </div>
              )}
               {!compact && resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {resource.tags.slice(0, 3).map(tag => (
                    <TagBadge key={tag.id} tag={tag} className="text-[10px] px-1.5 py-0.5" />
                  ))}
                  {resource.tags.length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-accent/50 text-accent">
                      +{resource.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
            <div className={cn("text-muted-foreground flex justify-between items-center mt-auto", compact ? 'p-2 pt-0 pb-1.5 text-xs' : 'p-4 pt-0 text-base border-t border-border/20')}>
              <span className="flex items-center" title={`${resource.downloads.toLocaleString()} downloads`}>
                <Download className={cn("mr-1 text-accent", compact ? "w-3.5 h-3.5" : "w-4 h-4")} /> {formatNumberWithSuffix(resource.downloads)}
              </span>
              <RatingDisplay
                rating={resource.rating}
                reviewCount={resource.reviewCount}
                positiveReviewPercentage={resource.positiveReviewPercentage}
                compact={compact}
              />
            </div>
          </Card>
      </Link>

      {compact && (
        <div 
          className={cn(
            "detail-overlay absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-80 h-auto",
            "bg-card/95 backdrop-blur-md p-4 rounded-lg shadow-2xl border border-primary/50",
            "flex flex-col transition-all duration-300 ease-in-out transform-gpu",
            isHoveringLocal ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none",
            "z-50"
          )}
          style={{transformOrigin: 'center center'}}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              window.location.href = resourcePath;
            }
          }}
        >
            <>
              <div className="aspect-video overflow-hidden rounded-md mb-3 shadow-inner" onClick={(e) => e.stopPropagation()}>
                {hasGalleryForOverlay ? (
                  <NestedCarousel
                    itemsToShow={1}
                    showArrows={imageGalleryForOverlay.length > 1}
                    autoplay={isHoveringLocal}
                    autoplayInterval={2500}
                    className="h-full"
                  >
                    {imageGalleryForOverlay.map((imgUrl, idx) => (
                      <NestedCarouselItem key={idx} className="h-full">
                        <Image
                          src={imgUrl}
                          alt={`${resource.name} gallery image ${idx + 1}`}
                          fill
                          style={{ objectFit: "cover" }}
                          className="rounded-md"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          data-ai-hint="resource detail image"
                        />
                      </NestedCarouselItem>
                    ))}
                  </NestedCarousel>
                ) : (
                  <div className="aspect-video overflow-hidden rounded-md relative bg-muted/30">
                    <Image
                      src={resource.imageUrl || 'https://placehold.co/800x450.png'}
                      alt={`${resource.name} preview`}
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-md"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      data-ai-hint="abstract pattern"
                    />
                  </div>
                )}
              </div>

              <h3 className="text-xl font-semibold text-primary mb-1 line-clamp-2">{resource.name}</h3>
              <p className="text-xs text-muted-foreground mb-0.5">
                By <span className="text-primary">{resource.author.name}</span>
              </p>

              <div className="mb-1.5">
                <RatingDisplay
                  rating={resource.rating}
                  reviewCount={resource.reviewCount}
                  positiveReviewPercentage={resource.positiveReviewPercentage}
                  compact={false}
                  fiveStarMode={true}
                />
              </div>

              <p className="text-xs text-muted-foreground mb-2 line-clamp-2 h-8">{resource.description}</p>

              {resource.tags.length > 0 && (
                <div className="mb-2">
                  <h4 className="text-[11px] font-semibold text-accent mb-1 flex items-center"><Tags className="w-3.5 h-3.5 mr-1" /> Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {resource.tags.slice(0, MAX_TAGS_OVERLAY).map(tag => (
                      <TagBadge key={tag.id} tag={tag} className="text-xs px-1.5 py-0.5" />
                    ))}
                    {resource.tags.length > MAX_TAGS_OVERLAY && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-accent/50 text-accent">
                        +{resource.tags.length - MAX_TAGS_OVERLAY}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-border/10 flex justify-around text-base">
                <div className="flex items-center text-muted-foreground" title={`${resource.downloads.toLocaleString()} downloads`}>
                  <Download className="w-4 h-4 mr-1 text-accent" />
                  {formatNumberWithSuffix(resource.downloads)}
                </div>
                {resource.followers !== undefined && (
                  <div className="flex items-center text-muted-foreground" title={`${resource.followers.toLocaleString()} followers`}>
                    <Heart className="w-4 h-4 mr-1 text-accent fill-accent" />
                    {formatNumberWithSuffix(resource.followers)}
                  </div>
                )}
              </div>

              <div className="mt-auto pt-3 border-t border-border/20 flex items-center gap-2">
                {latestFile ? (
                  <a
                    href={latestFile.url}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1"
                    aria-label={`Download ${resource.name} - ${latestFile.name}`}
                  >
                    <Button variant="default" size="sm" className="w-full button-primary-glow text-xs py-1.5 h-auto">
                      <Download className="w-4 h-4 mr-1.5" /> Download
                    </Button>
                  </a>
                ) : (
                  <Button variant="default" size="sm" className="w-full button-primary-glow text-xs py-1.5 h-auto" disabled>
                    <Download className="w-4 h-4 mr-1.5" /> Download
                  </Button>
                )}
                <Button asChild variant="outline" size="icon" className={cn("button-outline-glow text-xs h-auto p-2")}>
                  <Link
                    href={resourcePath}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`More information about ${resource.name}`}
                  >
                    <Info className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </>
        </div>
      )}
    </div>
  );
}
