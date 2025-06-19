
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
import { useState } from 'react'; 
import { PackageOpen } from 'lucide-react';

interface UserProfilePageContentProps {
  profile: UserProfile;
  stats: UserStats;
  topResources: RankedResource[];
  publishedResources: Resource[]; // Changed from recentResources
}

const CAROUSEL_ITEMS_TO_SHOW_RECENT = 3; // This was for recent, might not be used or repurposed

export function UserProfilePageContent({ profile, stats, topResources, publishedResources }: UserProfilePageContentProps) {
  const [carouselAllowOverflow, setCarouselAllowOverflow] = useState(false);
  const [isRecentCarouselHovered, setIsRecentCarouselHovered] = useState(false); // May not be needed if recent carousel is removed

  // These handlers might be reused if a carousel is used for published resources,
  // or removed if a simple grid is used.
  const handleResourceCardHover = (hovering: boolean) => {
    // setIsRecentCarouselHovered(hovering); // Example, adjust if needed
  };
  const handleResourceCardOverflowHover = (hovering: boolean) => {
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
          
          {publishedResources.length > 0 && (
            <section>
              {(topResources.length > 0) && <Separator className="my-8 bg-border/50" />}
              <h2 className="text-2xl font-semibold mb-6 text-primary">Published Resources</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {publishedResources.map(resource => (
                  <ResourceCard 
                    key={resource.id}
                    resource={resource} 
                    compact={false} // Use the non-compact version for better display
                    onHoverChange={handleResourceCardHover} // Optional: can be used if interaction is needed
                    onOverflowHoverChange={handleResourceCardOverflowHover} // Optional
                  />
                ))}
              </div>
            </section>
          )}

          {topResources.length === 0 && publishedResources.length === 0 && ( 
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
              <PackageOpen className="w-16 h-16 text-primary/50 mb-4" />
              <p className="text-lg">{profile.name} hasn't published any resources yet.</p>
              {profile.bio && <p className="text-sm mt-1">Their bio is available on the left.</p>}
            </div>
           )}
        </main>
      </div>
    </div>
  );
}
