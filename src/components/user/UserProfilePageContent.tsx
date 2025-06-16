
'use client';

import type { Author as UserProfile, UserStats, RankedResource, Resource } from '@/lib/types';
import { UserProfileHeader } from './UserProfileHeader';
import { UserStatsDisplay } from './UserStatsDisplay';
import { UserSocialLinks } from './UserSocialLinks';
import { UserBio } from './UserBio';
import { TopResourceCard } from './TopResourceCard';
import { ResourceCard } from '@/components/resource/ResourceCard';
import { Carousel, CarouselItem } from '@/components/shared/Carousel';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react'; // Import useState

interface UserProfilePageContentProps {
  profile: UserProfile;
  stats: UserStats;
  topResources: RankedResource[];
  recentResources: Resource[];
}

const CAROUSEL_ITEMS_TO_SHOW_RECENT = 3;

export function UserProfilePageContent({ profile, stats, topResources, recentResources }: UserProfilePageContentProps) {
  const [carouselAllowOverflow, setCarouselAllowOverflow] = useState(false);
  const [isRecentCarouselHovered, setIsRecentCarouselHovered] = useState(false);

  const handleRecentResourceCardHover = (hovering: boolean) => {
    setIsRecentCarouselHovered(hovering);
  };
  const handleRecentResourceCardOverflowHover = (hovering: boolean) => {
    setCarouselAllowOverflow(hovering);
  };

  return (
    <div className="space-y-8">
      <UserProfileHeader profile={profile} />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-6">
          <UserBio bio={profile.bio} />
          <UserStatsDisplay stats={stats} />
          {profile.socialLinks && Object.values(profile.socialLinks).some(link => !!link) && (
            <UserSocialLinks socialLinks={profile.socialLinks} />
          )}
        </aside>

        <main className="lg:col-span-8 space-y-8">
          {topResources.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-primary">Top Resources</h2>
              <div className="flex flex-col md:flex-row md:flex-nowrap gap-4">
                {topResources.map(resource => (
                  <div key={resource.id} className="w-full md:w-1/3 flex-shrink-0">
                    <TopResourceCard resource={resource} />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {recentResources.length > 0 && (
            <div>
              <Separator className="my-8 bg-border/50" />
              <h2 className="text-2xl font-semibold mb-6 text-primary">Latest Resources</h2>
              <Carousel
                itemsToShow={CAROUSEL_ITEMS_TO_SHOW_RECENT}
                showArrows={recentResources.length > CAROUSEL_ITEMS_TO_SHOW_RECENT}
                autoplay={!isRecentCarouselHovered && !carouselAllowOverflow}
                autoplayInterval={7000} 
                className="px-1" 
                allowOverflow={carouselAllowOverflow}
              >
                {recentResources.map(resource => (
                  <CarouselItem key={resource.id}>
                    <ResourceCard 
                        resource={resource} 
                        compact 
                        onHoverChange={handleRecentResourceCardHover}
                        onOverflowHoverChange={handleRecentResourceCardOverflowHover}
                    />
                  </CarouselItem>
                ))}
              </Carousel>
            </div>
          )}

          {topResources.length === 0 && recentResources.length === 0 && !profile.bio && ( 
            <div className="py-8 text-center text-muted-foreground">
              <p>{profile.name} hasn't published any resources or added a bio yet.</p>
            </div>
           )}
          {topResources.length === 0 && recentResources.length === 0 && profile.bio && (
            <div className="py-8 text-center text-muted-foreground">
              <p>{profile.name} hasn't published any resources yet.</p>
            </div>
           )}
        </main>
      </div>
    </div>
  );
}
