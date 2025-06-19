
'use client';

import type { UserStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, MessageSquare, Star, BarChart3 } from 'lucide-react';
import { formatNumberWithSuffix } from '@/lib/utils';

interface UserStatsDisplayProps {
  stats: UserStats;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  rating?: number | null;
  reviewCount?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, rating, reviewCount }) => (
  <Card className="bg-card/70 backdrop-blur-sm shadow-md border-border/30 hover:border-primary/30 transition-all hover:shadow-primary/20">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-primary" />
    </CardHeader>
    <CardContent className="pb-4 px-4">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {typeof rating === 'number' && typeof reviewCount === 'number' && reviewCount > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          from {formatNumberWithSuffix(reviewCount)} reviews
        </p>
      )}
       {typeof rating === 'number' && typeof reviewCount === 'number' && reviewCount === 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          No reviews yet
        </p>
      )}
    </CardContent>
  </Card>
);

export function UserStatsDisplay({ stats }: UserStatsDisplayProps) {
  return (
    <Card className="bg-card/80 backdrop-blur-lg border-border/40 shadow-lg">
        <CardHeader className="pb-3 pt-4">
             <CardTitle className="text-lg font-semibold text-primary flex items-center">
                <BarChart3 className="w-5 h-5 mr-2"/>
                Statistics
            </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-2">
            <StatCard title="Followers" value={formatNumberWithSuffix(stats.followersCount)} icon={Users} />
            <StatCard title="Published" value={formatNumberWithSuffix(stats.resourcesPublishedCount)} icon={Package} />
            <StatCard title="Reviews Given" value={formatNumberWithSuffix(stats.reviewsPublishedCount)} icon={MessageSquare} />
            <StatCard 
                title="Avg. Rating Received" 
                value={stats.overallResourceRating !== null ? stats.overallResourceRating.toFixed(1) : 'N/A'} 
                icon={Star} 
                rating={stats.overallResourceRating}
                reviewCount={stats.overallResourceReviewCount}
            />
        </CardContent>
    </Card>
  );
}
