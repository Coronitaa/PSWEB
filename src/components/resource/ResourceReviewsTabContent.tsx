
"use client";

import type React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Resource, Review, UserAppRole } from '@/lib/types';
import { ReviewCard } from './ReviewCard'; // Corrected path
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, ListOrdered, Info, Star, Loader2 } from 'lucide-react'; // Ensured Loader2 is here
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
  const [isLoadingUserCheck, setIsLoadingUserCheck] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setIsLoadingUserCheck(true);
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser) {
      try {
        const user: MockUser = JSON.parse(storedUser);
        const isAuthor = user.id === resource.authorId;
        const hasAlreadyReviewed = resource.reviews?.some(r => r.authorId === user.id);
        
        // For mock purposes, we'll assume user has "downloaded" if logged in and not author.
        // In a real app, this would involve checking download records.
        const hasDownloadedMock = !isAuthor; 

        if (isAuthor) {
          setCanWriteReview(false);
        } else if (hasAlreadyReviewed) {
          setCanWriteReview(false); // Can't write a new one, but can edit (handled in ReviewCard)
        } else if (!hasDownloadedMock) { // This condition might be removed if always true for non-authors
          setCanWriteReview(false);
        } else {
          setCanWriteReview(true);
        }

      } catch (e) {
        console.error("Failed to parse mockUser for review permissions", e);
        setCanWriteReview(false);
      }
    } else {
      setCanWriteReview(false); // Not logged in
    }
    setIsLoadingUserCheck(false);
  }, [resource.authorId, resource.reviews]);

  const reviews = useMemo(() => resource.reviews || [], [resource.reviews]);

  const { mostHelpfulReview, otherReviewsSorted } = useMemo(() => {
    const allReviews = [...reviews];
    let helpfulReview = null;
    let remainingReviews = allReviews;

    if (sortBy === 'most_helpful_first' && allReviews.length > 0) {
      // Find a review explicitly marked as most helpful by data layer, or pick one with highest helpful count
      helpfulReview = allReviews.find(r => r.isMostHelpful);
      if (!helpfulReview && allReviews.some(r => (r.interactionCounts?.helpful || 0) > 0)) {
          // Fallback: pick the one with the highest helpful count if no 'isMostHelpful' flag is set by server
          // This logic can be removed if server always sets 'isMostHelpful' correctly
          helpfulReview = [...allReviews].sort((a, b) => (b.interactionCounts?.helpful || 0) - (a.interactionCounts?.helpful || 0))[0];
          if ((helpfulReview?.interactionCounts?.helpful || 0) === 0) helpfulReview = null; // Don't feature if no helpful votes
      }
      remainingReviews = helpfulReview ? allReviews.filter(r => r.id !== helpfulReview!.id) : allReviews;
    }
    
    if (sortBy === 'most_recent_first') {
      remainingReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else { 
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
    const storedUser = localStorage.getItem('mockUser');
    if (!storedUser) {
      toast({
        title: "Login Required",
        description: "You need to be logged in to write a review.",
        variant: "destructive",
      });
      return;
    }
    if (!canWriteReview && !isLoadingUserCheck) { // Check if already determined they can't write
      toast({
        title: "Unable to Review",
        description: "You cannot write a new review for this resource (e.g., you are the author or have already reviewed it).",
        variant: "destructive",
      });
      return;
    }
    setIsWriteReviewModalOpen(true);
  };

  const handleReviewSubmitted = () => {
    router.refresh(); // Re-fetch server data
  };

  if (isLoadingUserCheck) {
    return (
        <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }


  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquarePlus className="w-16 h-16 text-primary mx-auto mb-4" />
        <p className="text-xl font-semibold text-foreground">No reviews yet for {resource.name}</p>
        <p className="text-muted-foreground">Be the first to share your thoughts!</p>
        <Button
            className="mt-6 button-primary-glow"
            onClick={handleOpenWriteReviewModal}
            disabled={!canWriteReview}
            title={!canWriteReview ? "You cannot write a new review for this resource." : "Write a review"}
        >
          <MessageSquarePlus className="w-4 h-4 mr-2" /> Write a Review
        </Button>
         {!canWriteReview && (
             <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center">
                <Info className="w-3 h-3 mr-1"/>
                You are the author or have already reviewed this resource.
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
        <div className="flex items-center gap-3 w-full sm:w-auto">
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
            className="h-9 button-primary-glow w-full sm:w-auto"
            onClick={handleOpenWriteReviewModal}
            disabled={!canWriteReview}
            title={!canWriteReview ? "You cannot write a new review for this resource." : "Write a review"}
          >
             <MessageSquarePlus className="w-4 h-4 mr-2" /> Write Review
          </Button>
        </div>
      </div>
        {!canWriteReview && (
             <p className="text-xs text-muted-foreground mt-0 text-center flex items-center justify-center">
                <Info className="w-3 h-3 mr-1"/>
                You are the author or have already reviewed this resource.
            </p>
        )}

      {mostHelpfulReview && sortBy === 'most_helpful_first' && (
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
