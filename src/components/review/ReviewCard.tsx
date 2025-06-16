
"use client";

import type React from 'react';
import Image from 'next/image';
import type { Review } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, MessageSquare, Smile, GitCommitVertical } from 'lucide-react';
import { formatTimeAgo, formatNumberWithSuffix } from '@/lib/utils'; 
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [createdAtFormatted, setCreatedAtFormatted] = React.useState<string>(() => {
    // Initial server-side rendering or if window is not available
    return new Date(review.createdAt).toLocaleDateString();
  });

  React.useEffect(() => {
    // This effect will run on the client after hydration and whenever review.createdAt changes.
    setCreatedAtFormatted(formatTimeAgo(review.createdAt));
  }, [review.createdAt]);

  return (
      <Card className={cn(
        "w-full shadow-md bg-card/90 backdrop-blur-sm h-full", 
        review.isMostHelpful && "border-2 border-primary shadow-primary/30"
      )}>
        {review.isMostHelpful && (
          <div className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-t-md">
            Most Helpful Review
          </div>
        )}
        <CardHeader className={cn("flex flex-row items-start space-x-4 pb-3", review.isMostHelpful ? "pt-3" : "pt-4")}>
          <Image
            src={review.author.avatarUrl || `https://placehold.co/40x40/888888/FFFFFF?text=${review.author.name.substring(0,1)}`}
            alt={review.author.name}
            width={40}
            height={40}
            className="rounded-full border"
            data-ai-hint="user avatar"
          />
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">{review.author.name}</p>
              <p className="text-xs text-muted-foreground" suppressHydrationWarning={true}>
                {createdAtFormatted}
              </p>
            </div>
            <div className="flex items-center mt-1">
              {review.isRecommended ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-0.5">
                  <ThumbsUp className="w-3 h-3 mr-1" /> Recommended
                </Badge>
              ) : (
                <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-0.5">
                  <ThumbsDown className="w-3 h-3 mr-1" /> Not Recommended
                </Badge>
              )}
               <span className="text-xs text-muted-foreground ml-3 flex items-center">
                  <GitCommitVertical className="w-3 h-3 mr-1 text-accent"/> Version: {review.resourceVersion}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
            {review.comment}
          </p>
        </CardContent>
        <CardFooter className="flex justify-start items-center gap-2 pt-2 pb-3 border-t border-border/20">
          <p className="text-xs text-muted-foreground mr-2">Was this review helpful?</p>
          <Button variant="outline" size="sm" className="text-xs h-7 px-2 py-1 hover:bg-green-500/10 hover:border-green-500/50 group">
            <ThumbsUp className="w-3.5 h-3.5 mr-1.5 text-green-500 group-hover:text-green-400" /> Yes ({formatNumberWithSuffix(review.interactionCounts.helpful)})
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 px-2 py-1 hover:bg-red-500/10 hover:border-red-500/50 group">
            <ThumbsDown className="w-3.5 h-3.5 mr-1.5 text-red-500 group-hover:text-red-400" /> No ({formatNumberWithSuffix(review.interactionCounts.unhelpful)})
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 px-2 py-1 hover:bg-yellow-500/10 hover:border-yellow-500/50 group">
            <Smile className="w-3.5 h-3.5 mr-1.5 text-yellow-500 group-hover:text-yellow-400" /> Funny ({formatNumberWithSuffix(review.interactionCounts.funny)})
          </Button>
        </CardFooter>
      </Card>
  );
}

