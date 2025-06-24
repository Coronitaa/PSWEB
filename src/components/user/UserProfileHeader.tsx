
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Author as UserProfile, UserBadge } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, PlusCircle, ShieldCheck, Star as StarIcon, CheckCircle, Shield, Edit3, Share2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditProfileModal } from './EditProfileModal';

interface UserProfileHeaderProps {
  profile: UserProfile;
}

interface MockUser {
    id: string;
}

const badgeIconMap: { [key: string]: React.ElementType } = {
  ShieldCheck,
  Star: StarIcon,
  CheckCircle,
  Shield,
  Edit3,
};

function UserProfileBadge({ badge, isInline = false }: { badge: UserBadge, isInline?: boolean }) {
  const IconComponent = badge.icon ? badgeIconMap[badge.icon] : null;
  return (
    <Badge
      variant="default"
      className={cn(
        "text-xs px-2 py-0.5 font-semibold flex items-center gap-1 shadow-md",
        badge.color || 'bg-accent',
        badge.textColor || 'text-accent-foreground',
        isInline && "transform scale-90"
      )}
    >
      {IconComponent && <IconComponent className={cn("w-3 h-3", isInline && "w-3.5 h-3.5")} />}
      {badge.name}
    </Badge>
  );
}

export function UserProfileHeader({ profile }: UserProfileHeaderProps) {
  const [isClient, setIsClient] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser) {
      try {
        const user: MockUser = JSON.parse(storedUser);
        if (user.id === profile.id) {
          setIsOwnProfile(true);
        }
      } catch (e) {
        console.error("Failed to parse user for profile header check", e);
        setIsOwnProfile(false);
      }
    }
  }, [profile.id]);


  const verifiedBadge = profile.badges?.find(b => b.id === 'badge-verified');
  const otherBadges = profile.badges?.filter(b => b.id !== 'badge-verified');

  return (
    <>
    <section className="relative -mx-4 -mt-8 rounded-b-xl overflow-hidden">
      <div className="relative h-48 md:h-64 w-full">
        <Image
          src={profile.bannerUrl || `https://placehold.co/1200x300/1f1f1f/E64A8B?text=${profile.name ? profile.name.substring(0,1) : 'P'}`}
          alt={`${profile.name || 'User'}'s banner`}
          fill
          style={{objectFit:"cover"}}
          priority
          data-ai-hint="abstract background pattern"
          className="bg-muted"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>

      <div className="container max-w-screen-2xl relative -mt-12 md:-mt-16 px-4 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0">
              <Image
                src={profile.avatarUrl || `https://placehold.co/128x128/E64A8B/FFFFFF?text=${profile.name ? profile.name.substring(0,1) : 'U'}`}
                alt={`${profile.name || 'User'}'s avatar`}
                fill
                style={{objectFit:"cover"}}
                className="rounded-full border-4 border-background shadow-xl bg-muted"
                data-ai-hint="user avatar portrait"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground drop-shadow-md">{profile.name || 'User'}</h1>
                {verifiedBadge && (
                  <div className="self-center mt-1"> 
                    <UserProfileBadge badge={verifiedBadge} isInline />
                  </div>
                )}
              </div>
              <p className="text-base text-muted-foreground">{profile.usertag || '@unknown'}</p>
              {otherBadges && otherBadges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {otherBadges.map(badge => (
                    <UserProfileBadge key={badge.id} badge={badge} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            {isClient && isOwnProfile ? (
                 <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                    <Edit3 className="w-4 h-4 mr-2"/> Edit Profile
                </Button>
            ) : isClient ? (
                <>
                    <Button className="button-primary-glow button-follow-sheen">
                        <Heart className="w-4 h-4 mr-2 fill-current" /> Follow
                    </Button>
                    <Button variant="outline" size="icon" className="button-outline-glow rounded-full">
                        <Share2 className="w-4 h-4" />
                        <span className="sr-only">Share Profile</span>
                    </Button>
                    <Button variant="destructive" size="icon" className="bg-destructive/80 hover:bg-destructive rounded-full">
                        <AlertTriangle className="w-4 h-4" />
                         <span className="sr-only">Report Profile</span>
                    </Button>
                </>
            ) : (
                <Button className="h-10 w-24"><Loader2 className="w-4 h-4 animate-spin"/></Button>
            )}
          </div>
        </div>
      </div>
    </section>

    {isOwnProfile && (
        <EditProfileModal 
            profile={profile}
            isOpen={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
        />
    )}
    </>
  );
}
