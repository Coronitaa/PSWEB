
'use client';

import Link from 'next/link';
import type { Author as UserProfile, UserStats, RankedResource, Resource } from '@/lib/types';
import { UserProfileHeader } from './UserProfileHeader';
import { UserStatsDisplay } from './UserStatsDisplay';
import { UserSocialLinks } from './UserSocialLinks';
import { UserBio } from './UserBio';
import { TopResourceCard } from './TopResourceCard';
import { ResourceCard } from '@/components/resource/ResourceCard';
import { Carousel, CarouselItem } from '@/components/shared/Carousel';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { PackageOpen, ArrowRight } from 'lucide-react';

interface UserProfilePageContentProps {
  profile: UserProfile;
  stats: UserStats;
  topResources: RankedResource[];
  recentResourcesForCarousel: Resource[];
}

const CAROUSEL_ITEMS_TO_SHOW_RECENT = 3; // Number of items visible at once in the recent carousel

export function UserProfilePageContent({ profile, stats, topResources, recentResourcesForCarousel }: UserProfilePageContentProps) {
  const [carouselAllowOverflow, setCarouselAllowOverflow] = useState(false);

  const handleResourceCardHover = (hovering: boolean) => {
    // This can be used if specific hover behavior is needed for the carousel items
  };
  const handleResourceCardOverflowHover = (hovering: boolean) => {
    setCarouselAllowOverflow(hovering);
  };

  const hasAnyContent = topResources.length > 0 || recentResourcesForCarousel.length > 0;

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

        <main className="lg:col-span-8 space-y-10">
          {topResources.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">Top Resources</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {topResources.map(resource => (
                  <div key={resource.id} className="w-full">
                    <TopResourceCard resource={resource} />
                  </div>
                ))}
              </div>
            </section>
          )}
          
          {recentResourcesForCarousel.length > 0 && (
            <section>
              {(topResources.length > 0) && <Separator className="my-8 bg-border/50" />}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-primary">Recent Resources</h2>
                {/* Conceptual link, actual page /users/[usertag]/resources would need to be created */}
                <Button variant="link" asChild className="text-primary hover:text-accent">
                  <Link href={`/users/${profile.usertag?.substring(1)}/resources`}>
                    View All Resources <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
              <Carousel
                itemsToShow={CAROUSEL_ITEMS_TO_SHOW_RECENT}
                showArrows={recentResourcesForCarousel.length > CAROUSEL_ITEMS_TO_SHOW_RECENT}
                autoplay={!carouselAllowOverflow}
                autoplayInterval={4000}
                allowOverflow={carouselAllowOverflow}
                className="h-auto" // Adjust height as needed or let content define it
              >
                {recentResourcesForCarousel.map(resource => (
                  <CarouselItem key={resource.id}>
                    <ResourceCard
                      resource={resource}
                      compact // Using compact version for carousel
                      onHoverChange={handleResourceCardHover}
                      onOverflowHoverChange={handleResourceCardOverflowHover}
                    />
                  </CarouselItem>
                ))}
              </Carousel>
            </section>
          )}

          {!hasAnyContent && (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
              <PackageOpen className="w-16 h-16 text-primary/50 mb-4" />
              <p className="text-lg">{profile.name || 'This user'} hasn't published any resources yet.</p>
              {profile.bio && <p className="text-sm mt-1">Their bio is available on the left.</p>}
            </div>
           )}
        </main>
      </div>
    </div>
  );
}
