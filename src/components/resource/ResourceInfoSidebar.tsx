
"use client";

import * as React from 'react';
import type { Resource, Tag, ItemType, ResourceFile, ResourceAuthor } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Download, Tag as TagIcon, User, CalendarDays, Layers, Package, FileText, BarChart3, MessageSquare,
  ExternalLink, AlertTriangle, ShieldQuestion, Star, Users, GitBranch, ListChecks, Binary, Palette, MusicIcon, Laptop, Heart, StarHalf, ThumbsUp, ThumbsDown, Crown
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { TagBadge } from '../shared/TagBadge';
import { Separator } from '@/components/ui/separator';
import { formatTimeAgo, formatNumberWithSuffix } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { incrementResourceDownloadCountAction } from '@/app/actions/resourceActions';
import { useToast } from '@/hooks/use-toast';

interface SidebarCardProps extends React.PropsWithChildren<{ title?: string; icon?: React.ElementType; className?: string }> {}

const SidebarCard: React.FC<SidebarCardProps> = ({ title, icon: Icon, children, className }) => (
  <Card className={cn("shadow-lg bg-card/80 backdrop-blur-sm border-border/40", className)}>
    {title && (
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-base font-semibold text-primary flex items-center">
          {Icon && <Icon className="w-4 h-4 mr-2" />}
          {title}
        </CardTitle>
      </CardHeader>
    )}
    <CardContent className={cn("text-sm", title ? "px-4 pb-4 pt-0" : "p-4")}>
      {children}
    </CardContent>
  </Card>
);

interface InfoItemProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  className?: string;
  suppressHydrationWarning?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({ label, value, icon: Icon, className, suppressHydrationWarning }) => (
  <div className={cn("flex justify-between items-center py-1.5", className)}>
    <span className="text-muted-foreground flex items-center">
      {Icon && <Icon className="w-3.5 h-3.5 mr-2 text-accent" />}
      {label}
    </span>
    <span className="text-foreground font-medium text-right" suppressHydrationWarning={suppressHydrationWarning}>
      {value}
    </span>
  </div>
);

const RatingDisplaySidebar: React.FC<{
  rating?: number;
  reviewCount?: number;
  positiveReviewPercentage?: number
}> = ({ rating, reviewCount, positiveReviewPercentage }) => {
  if (typeof rating !== 'number' || rating < 0 || rating > 5 || reviewCount === undefined || reviewCount === 0) {
    return (
      <div className="flex flex-col items-end">
        <span className="text-muted-foreground text-xs">No reviews yet</span>
      </div>
    );
  }

  const stars = [];
  const starSize = "w-4 h-4";
  for (let i = 0; i < 5; i++) {
    if (rating >= i + 0.75) {
      stars.push(<Star key={`star-full-${i}`} className={cn(starSize, "text-amber-400 fill-amber-400")} />);
    } else if (rating >= i + 0.25) {
      stars.push(<StarHalf key={`star-half-${i}`} className={cn(starSize, "text-amber-400 fill-amber-400")} />);
    } else {
      stars.push(<Star key={`star-empty-${i}`} className={cn(starSize, "text-amber-400/40")} />);
    }
  }

  const getSentiment = (percentage: number) => {
    if (percentage >= 95) return "Overwhelmingly Positive";
    if (percentage >= 80) return "Very Positive";
    if (percentage >= 70) return "Mostly Positive";
    if (percentage >= 40) return "Mixed";
    if (percentage >= 20) return "Mostly Negative";
    return "Overwhelmingly Negative";
  };

  const sentimentText = getSentiment(positiveReviewPercentage || 0);
  const sentimentColorClass = positiveReviewPercentage && positiveReviewPercentage >= 70 ? 'text-green-400' : positiveReviewPercentage && positiveReviewPercentage >=40 ? 'text-yellow-400' : 'text-red-400';


  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center">
        {stars}
        <span className="ml-1.5 text-xs text-muted-foreground">
          ({rating.toFixed(1)})
        </span>
      </div>
      <div className={cn("text-xs mt-0.5", sentimentColorClass)}>
        {sentimentText}
        <span className="text-muted-foreground ml-1">({formatNumberWithSuffix(reviewCount)} reviews)</span>
      </div>
    </div>
  );
};

interface ResourceInfoSidebarProps {
  resource: Resource;
}

const getItemTypeIcon = (itemType: ItemType) => {
  switch (itemType) {
    case 'game': return Package;
    case 'web': return Binary;
    case 'app': return Laptop;
    case 'art-music': return Palette;
    default: return Package;
  }
};

const getAuthorLink = (author: ResourceAuthor) => {
    return author.usertag ? `/users/${author.usertag.startsWith('@') ? author.usertag.substring(1) : author.usertag}` : '#';
};

const AuthorItem = ({ author }: { author: ResourceAuthor }) => {
  const authorLink = getAuthorLink(author);
  const CREATOR_BORDER_COLOR = '#FFC107'; // Amber/Gold color
  const CREATOR_TEXT_COLOR = '#FFC107'; // Amber/Gold color
  const borderColor = author.isCreator ? CREATOR_BORDER_COLOR : (author.authorColor || 'hsl(var(--border))');

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Link href={authorLink}>
          <Image
            src={author.avatarUrl || `https://placehold.co/40x40/888888/FFFFFF?text=${author.name ? author.name.substring(0,1) : 'A'}`}
            alt={author.name || 'Author Avatar'}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full border-2 hover:opacity-80 transition-opacity object-cover"
            style={{ borderColor }}
            data-ai-hint="user avatar"
          />
        </Link>
        <div>
          <Link href={authorLink} className="hover:text-primary transition-colors">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-foreground">{author.name}</p>
              {author.isCreator && <Crown className="h-4 w-4 text-amber-500 fill-amber-400" />}
            </div>
          </Link>
          <p
            className={cn(
              "text-xs font-medium transition-colors text-muted-foreground",
              author.isCreator && "text-amber-400"
            )}
            style={{ color: !author.isCreator ? author.authorColor || undefined : undefined }}
          >
            {author.isCreator ? 'Creator' : (author.roleDescription || 'Collaborator')}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="button-outline-glow button-follow-sheen ml-2">
        <Heart className="w-3.5 h-3.5 mr-1.5 fill-accent text-accent" /> Follow
      </Button>
    </div>
  );
};


export function ResourceInfoSidebar({ resource }: ResourceInfoSidebarProps) {
  const { toast } = useToast();
  
  const getChannelPriority = (channelId: string | null | undefined): number => {
    if (channelId === 'release' || !channelId) return 0;
    if (channelId === 'beta') return 1;
    if (channelId === 'alpha') return 2;
    return 3;
  };

  const latestFile: ResourceFile | undefined = resource.files && resource.files.length > 0
    ? [...resource.files].sort((a, b) => {
        const priorityA = getChannelPriority(a.channelId);
        const priorityB = getChannelPriority(b.channelId);
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    })[0]
    : undefined;

  const [displayDateFormatted, setDisplayDateFormatted] = React.useState<string | null>(null);

  React.useEffect(() => {
    const dateToFormat = latestFile?.createdAt;
    if (dateToFormat) {
      setDisplayDateFormatted(formatTimeAgo(dateToFormat));
    }
  }, [latestFile]);


  const handleDownloadClick = async () => {
    if (!latestFile) return;
    try {
      const result = await incrementResourceDownloadCountAction(resource.id, latestFile.id);
      if (!result.success) {
        toast({ title: "Error", description: result.error || "Could not update download count.", variant: "destructive" });
      } else {
        const link = document.createElement('a');
        link.href = latestFile.url;
        link.setAttribute('download', latestFile.name || 'download');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Failed to increment download count:", error);
      toast({ title: "Error", description: "Could not update download count.", variant: "destructive" });
    }
  };

  const tagGroups = resource.tags.reduce((acc, tag) => {
    const groupName = tag.groupName || 'Misc';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const parentItemPath = `/${resource.parentItemType === 'art-music' ? 'art-music' : resource.parentItemType + 's'}/${resource.parentItemSlug}`;
  
  const creator = resource.authors.find(a => a.isCreator);
  const collaborators = resource.authors.filter(a => !a.isCreator);
  
  const positiveReviewsCount = resource.reviews?.filter(r => r.isRecommended).length || 0;
  const negativeReviewsCount = (resource.reviewCount || 0) - positiveReviewsCount;

  const scrollToTab = (tabId: string) => {
    setTimeout(() => {
      const element = document.getElementById(tabId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <div className="space-y-5 sticky top-20">
      <Card className="shadow-lg bg-card/80 backdrop-blur-sm border-border/40 download-card-glow">
          <CardContent className="p-4">
          <div className="space-y-2">
          {latestFile ? (
            <Button
              size="lg"
              className="w-full button-primary-glow button-3d-effect text-base py-3 h-auto"
              onClick={handleDownloadClick}
              aria-label={`Download ${resource.name} - ${latestFile.name}`}
            >
              <Download className="mr-2 h-5 w-5" /> Download Latest {latestFile.size ? `(${latestFile.size})` : ''}
            </Button>
          ) : (
            <Button size="lg" className="w-full button-primary-glow button-3d-effect text-base py-3 h-auto" disabled>
              <Download className="mr-2 h-5 w-5" /> Download Latest
            </Button>
          )}

          {resource.files.length > 0 && (
              <Button variant="outline" size="sm" className="w-full button-outline-glow" asChild>
                <Link
                  href={`?tab=files#files-tab`}
                  scroll={false}
                  onClick={() => scrollToTab('files-tab')}
                >
                  <FileText className="mr-2 h-4 w-4" /> View All Files ({resource.files.length})
                </Link>
              </Button>
          )}
          </div>
          </CardContent>
      </Card>


      <SidebarCard title="User Reviews" icon={Star}>
         <RatingDisplaySidebar
            rating={resource.rating}
            reviewCount={resource.reviewCount}
            positiveReviewPercentage={resource.positiveReviewPercentage}
          />
          <Separator className="my-2 bg-border/30"/>
          <div className="text-xs space-y-1">
             <InfoItem label="Recommended" value={formatNumberWithSuffix(positiveReviewsCount)} icon={ThumbsUp} className="text-green-400"/>
             <InfoItem label="Not Recommended" value={formatNumberWithSuffix(negativeReviewsCount)} icon={ThumbsDown} className="text-red-400"/>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3 button-outline-glow" asChild>
            <Link
              href={`?tab=reviews#reviews-tab`}
              scroll={false}
              onClick={() => scrollToTab('reviews-tab')}
            >
                <MessageSquare className="mr-2 h-4 w-4" /> Read Reviews
            </Link>
          </Button>
      </SidebarCard>

      <SidebarCard title="Authors" icon={Users}>
        <div className="space-y-3">
          {creator && <AuthorItem author={creator} />}
          {collaborators.length > 0 && creator && <Separator className="my-2 bg-border/30" />}
          {collaborators.map(collab => <AuthorItem key={collab.id} author={collab} />)}
        </div>
      </SidebarCard>


      <SidebarCard title="Details" icon={ListChecks}>
        <InfoItem label="Version" value={latestFile?.versionName || resource.version || 'N/A'} icon={GitBranch} />
        <InfoItem label="Project" value={<Link href={parentItemPath} className="hover:text-primary transition-colors">{resource.parentItemName}</Link>} icon={getItemTypeIcon(resource.parentItemType)} />
        <InfoItem label="Category" value={<Link href={`${parentItemPath}/${resource.categorySlug}`} className="hover:text-primary transition-colors">{resource.categoryName}</Link>} icon={Layers} />
        <InfoItem label="Downloads" value={formatNumberWithSuffix(resource.downloads)} icon={BarChart3} />
        <InfoItem label="Followers" value={formatNumberWithSuffix(resource.followers)} icon={Heart} />
        <InfoItem label="Created" value={format(new Date(resource.createdAt), 'MMM d, yyyy')} icon={CalendarDays} />
        <InfoItem label="Updated" value={latestFile ? (displayDateFormatted || 'Loading...') : 'N/A'} icon={CalendarDays} suppressHydrationWarning={true} />
      </SidebarCard>

      {Object.entries(tagGroups).length > 0 && (
        <SidebarCard title="Tags" icon={TagIcon}>
          <div className="space-y-3">
            {Object.entries(tagGroups).map(([groupName, tagsInGroup]) => (
              tagsInGroup.length > 0 && (
                <div key={groupName}>
                  <h5 className="text-xs font-semibold text-muted-foreground mb-1.5">{groupName}</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {tagsInGroup.map(tag => {
                      const queryParam = tag.groupId;
                      const categoryPath = `${parentItemPath}/${resource.categorySlug}`;
                      if (queryParam) { 
                        return (
                          <Link
                            key={tag.id}
                            href={`${categoryPath}?${queryParam}=${tag.id}`}
                            className="hover:opacity-80 transition-opacity"
                          >
                            <TagBadge tag={tag} />
                          </Link>
                        );
                      }
                      return <TagBadge key={tag.id} tag={tag} />;
                    })}
                  </div>
                </div>
              )
            ))}
          </div>
        </SidebarCard>
      )}

      {resource.links && Object.values(resource.links).some(link => !!link) && (
        <SidebarCard title="Project Links" icon={ExternalLink}>
            <div className="space-y-2">
                {resource.links.discord && <Button variant="outline" size="sm" asChild className="w-full justify-start"><Link href={resource.links.discord} target="_blank"><MessageSquare className="mr-2 h-4 w-4 text-indigo-400"/>Discord Server</Link></Button>}
                {resource.links.wiki && <Button variant="outline" size="sm" asChild className="w-full justify-start"><Link href={resource.links.wiki} target="_blank"><ShieldQuestion className="mr-2 h-4 w-4 text-green-400"/>Wiki / Guide</Link></Button>}
                {resource.links.issues && <Button variant="outline" size="sm" asChild className="w-full justify-start"><Link href={resource.links.issues} target="_blank"><AlertTriangle className="mr-2 h-4 w-4 text-yellow-400"/>Issue Tracker</Link></Button>}
                {resource.links.source && <Button variant="outline" size="sm" asChild className="w-full justify-start"><Link href={resource.links.source} target="_blank"><GitBranch className="mr-2 h-4 w-4 text-gray-400"/>Source Code</Link></Button>}
                {resource.links.projectUrl && <Button variant="outline" size="sm" asChild className="w-full justify-start"><Link href={resource.links.projectUrl} target="_blank"><ExternalLink className="mr-2 h-4 w-4 text-blue-400"/>Visit Resource Site</Link></Button>}
            </div>
        </SidebarCard>
      )}

      <Card className="shadow-lg bg-card/80 backdrop-blur-sm border-border/40">
        <CardContent className="p-4">
          <Button variant="destructive" size="sm" className="w-full bg-destructive/80 hover:bg-destructive text-destructive-foreground">
              <AlertTriangle className="mr-2 h-4 w-4" /> Report Resource
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
