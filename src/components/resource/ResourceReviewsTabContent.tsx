
"use client";

import type React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Resource, Review, UserAppRole } from '@/lib/types';
import { ReviewCard } from './ReviewCard';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, ListOrdered, Info, Star } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WriteReviewModal } from '@/components/review/WriteReviewModal';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';

interface ResourceReviewsTabContentProps {
  resource: Resource;
}

type SortOption = 'most_helpful_first' | 'most_recent_first';

interface MockUser {
  id: string;
  usertag: string;
  name: string;
  role: UserAppRole;
}

export function ResourceReviewsTabContent({ resource }: ResourceReviewsTabContentProps) {
  const [sortBy, setSortBy] = useState<SortOption>('most_helpful_first');
  const [isWriteReviewModalOpen, setIsWriteReviewModalOpen] = useState(false);
  const [canWriteReview, setCanWriteReview] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setIsLoadingUser(true);
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser) {
      try {
        const user: MockUser = JSON.parse(storedUser);
        const isAuthor = user.id === resource.authorId;
        const hasDownloadedMock = true; // Mocking this check

        if (isAuthor) {
          setCanWriteReview(false);
        } else if (!hasDownloadedMock) {
          setCanWriteReview(false);
        } else {
          setCanWriteReview(true);
        }

      } catch (e) {
        console.error("Failed to parse mockUser for review permissions", e);
        setCanWriteReview(false);
      }
    } else {
      setCanWriteReview(false);
    }
    setIsLoadingUser(false);
  }, [resource.authorId]);

  const reviews = useMemo(() => resource.reviews || [], [resource.reviews]);

  const { mostHelpfulReview, otherReviewsSorted } = useMemo(() => {
    const allReviews = [...reviews];
    let helpfulReview = null;
    let remainingReviews = allReviews;

    // Only separate mostHelpfulReview if sorting by 'most_helpful_first'
    if (sortBy === 'most_helpful_first') {
      helpfulReview = allReviews.find(r => r.isMostHelpful);
      remainingReviews = helpfulReview ? allReviews.filter(r => r.id !== helpfulReview.id) : allReviews;
    }
    // If sorting by most_recent_first, mostHelpfulReview remains null and all reviews are in remainingReviews

    if (sortBy === 'most_recent_first') {
      // If sorting by recent, all reviews (including the one that might be "most helpful") are sorted by date
      remainingReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else { 
      // If sorting by helpful, sort the *remaining* reviews by helpfulness then date
      remainingReviews.sort((a, b) => {
        if ((b.interactionCounts?.helpful || 0) !== (a.interactionCounts?.helpful || 0)) {
          return (b.interactionCounts?.helpful || 0) - (a.interactionCounts?.helpful || 0);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return { mostHelpfulReview: helpfulReview, otherReviewsSorted: remainingReviews };
  }, [reviews, sortBy]);


  const handleOpenWriteReviewModal = () => {
    setIsWriteReviewModalOpen(true);
  };

  const handleReviewSubmitted = () => {
    router.refresh();
  };


  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquarePlus className="w-16 h-16 text-primary mx-auto mb-4" />
        <p className="text-xl font-semibold text-foreground">No reviews yet for {resource.name}</p>
        <p className="text-muted-foreground">Be the first to share your thoughts!</p>
        <Button
            className="mt-6 button-primary-glow"
            onClick={handleOpenWriteReviewModal}
            disabled={isLoadingUser || !canWriteReview}
            title={!canWriteReview && !isLoadingUser ? "You cannot review this resource (e.g., you are the author or haven't downloaded it - download check is currently mocked)." : "Write a review"}
        >
          <MessageSquarePlus className="w-4 h-4 mr-2" /> Write a Review
        </Button>
         {!isLoadingUser && !canWriteReview && (
             <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center">
                <Info className="w-3 h-3 mr-1"/>
                You are the author or haven&apos;t downloaded this resource. (Download check is mocked)
            </p>
         )}
          <WriteReviewModal
            resource={resource}
            isOpen={isWriteReviewModalOpen}
            onOpenChange={setIsWriteReviewModalOpen}
            onReviewSubmitted={handleReviewSubmitted}
          />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border rounded-lg bg-card/70 backdrop-blur-sm">
        <h3 className="text-xl font-semibold text-foreground">
          {resource.reviewCount} Review{resource.reviewCount !== 1 ? 's' : ''}
        </h3>
        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-full sm:w-auto min-w-[200px] h-9 text-sm">
              <ListOrdered className="w-4 h-4 mr-2 opacity-70" />
              <SelectValue placeholder="Sort reviews..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most_helpful_first" className="text-sm">Most Helpful First</SelectItem>
              <SelectItem value="most_recent_first" className="text-sm">Most Recent First</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="h-9 button-primary-glow"
            onClick={handleOpenWriteReviewModal}
            disabled={isLoadingUser || !canWriteReview}
            title={!canWriteReview && !isLoadingUser ? "You cannot review this resource (e.g., you are the author or haven't downloaded it - download check is currently mocked)." : "Write a review"}
          >
             <MessageSquarePlus className="w-4 h-4 mr-2" /> Write a Review
          </Button>
        </div>
      </div>
        {!isLoadingUser && !canWriteReview && (
             <p className="text-xs text-muted-foreground mt-0 text-center flex items-center justify-center">
                <Info className="w-3 h-3 mr-1"/>
                You are the author or haven&apos;t downloaded this resource. (Download check is mocked)
            </p>
        )}

      {mostHelpfulReview && sortBy === 'most_helpful_first' && ( // Only show if sorting by helpful and one exists
        <div className="space-y-3">
          <ReviewCard review={mostHelpfulReview} />
          {otherReviewsSorted.length > 0 && <Separator className="my-6 bg-border/50" />}
        </div>
      )}

      {otherReviewsSorted.length > 0 && (
        <div className="space-y-4">
          {otherReviewsSorted.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      <WriteReviewModal
        resource={resource}
        isOpen={isWriteReviewModalOpen}
        onOpenChange={setIsWriteReviewModalOpen}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </div>
  );
}
