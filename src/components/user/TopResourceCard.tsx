
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { RankedResource, ItemType } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselItem } from '@/components/shared/Carousel';
import { Download, Package, Gamepad2, Code, TabletSmartphone, Music as MusicIcon, Star as StarIcon, Layers } from 'lucide-react';
import { formatNumberWithSuffix } from '@/lib/utils'; // Updated import
import { cn } from '@/lib/utils';
import GlareHover from '@/components/effects/GlareHover';

interface TopResourceCardProps {
  resource: RankedResource;
}

const sectionIconMap: Record<ItemType, React.ElementType> = {
  game: Gamepad2,
  web: Code,
  app: TabletSmartphone,
  'art-music': MusicIcon,
};

const rankIndicatorMap: { [key: number]: string } = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export function TopResourceCard({ resource }: TopResourceCardProps) {
  const SectionIcon = sectionIconMap[resource.parentItemType] || Package;
  const rankSymbol = rankIndicatorMap[resource.rank] || `#${resource.rank}`;
  const [isHovering, setIsHovering] = useState(false);

  const hasGallery = resource.imageGallery && resource.imageGallery.length > 0;

  return (
    <Link href={`/resources/${resource.slug}`} className="block group/container h-full"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <GlareHover 
        borderRadius="var(--radius)" 
        className={cn(
          "rounded-lg h-full group/glare", 
          "transition-all duration-300 ease-in-out", 
          "group-hover/glare:transform group-hover/glare:-translate-y-1" // Transform on GlareHover
        )}
      >
        <Card className={cn(
            "flex flex-col overflow-visible h-full bg-card/80 backdrop-blur-sm shadow-xl transition-all duration-300 ease-in-out border-border/30 rounded-lg",
            "group-hover/glare:border-primary/50 group-hover/glare:shadow-primary/40" // Border and shadow on Card
        )}>
          <CardHeader className="p-0 relative">
            <div className="block aspect-video overflow-hidden rounded-t-lg">
              {isHovering && hasGallery ? (
                <Carousel
                  itemsToShow={1}
                  showArrows={false}
                  autoplay={true}
                  autoplayInterval={2000}
                  className="h-full w-full"
                >
                  {resource.imageGallery!.map((imgUrl, idx) => (
                    <CarouselItem key={idx} className="h-full">
                      <Image
                        src={imgUrl}
                        alt={`${resource.name} gallery image ${idx + 1}`}
                        fill
                        style={{ objectFit: "cover" }}
                        className="transition-transform duration-300 ease-in-out"
                        data-ai-hint="resource detail image"
                      />
                    </CarouselItem>
                  ))}
                </Carousel>
              ) : (
                <Image
                  src={resource.imageUrl}
                  alt={`${resource.name} banner`}
                  fill
                  style={{ objectFit: "cover" }}
                  className={cn("group-hover/glare:scale-105 transition-transform duration-300 ease-in-out", isHovering && hasGallery && "opacity-0")}
                  data-ai-hint="resource preview image"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card/70 via-card/30 to-transparent group-hover/glare:from-card/50 transition-all duration-300"></div>
            </div>
            
            <Badge className="absolute top-0 left-0 -translate-x-2 -translate-y-2 text-lg sm:text-xl bg-black/70 backdrop-blur-sm text-white shadow-lg group-hover/glare:shadow-primary/60 transition-all duration-300 group-hover/glare:scale-105 border-2 border-background py-1 sm:py-1.5 px-2 sm:px-3 z-10">
              {rankSymbol}
            </Badge>
            <Badge variant="secondary" className="absolute top-0 right-0 translate-x-2 -translate-y-2 bg-black/70 backdrop-blur-sm text-white shadow-lg border-2 border-background p-1.5 sm:p-2 z-10">
              <SectionIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </Badge>
          </CardHeader>
          <CardContent className="p-3 flex-grow">
            <CardTitle className="text-sm md:text-base font-semibold text-foreground group-hover/glare:text-primary transition-colors duration-200 line-clamp-2 mb-0.5">
              {resource.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
              For: <span className="font-medium text-foreground/80">{resource.parentItemName}</span>
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
          </CardContent>
          <CardFooter className="p-2 pt-0 border-t border-border/20 mt-auto">
            <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
              <div className="flex items-center" title={`${resource.downloads.toLocaleString()} Downloads`}>
                <Download className="w-3.5 h-3.5 mr-1 text-accent" />
                <span>{formatNumberWithSuffix(resource.downloads)}</span>
              </div>
              <div className="flex items-center" title={resource.rating ? `${resource.rating.toFixed(1)} (${formatNumberWithSuffix(resource.reviewCount)} reviews)` : 'No reviews'}>
                <StarIcon className={cn("w-3.5 h-3.5 mr-1", resource.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/50")} />
                <span>{resource.rating ? resource.rating.toFixed(1) : 'N/A'}</span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </GlareHover>
    </Link>
  );
}
