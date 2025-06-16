
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { Review, ReviewInteractionCounts, UserAppRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, MessageSquare, Smile, GitCommitVertical, Loader2, Edit3, Trash2, Star } from 'lucide-react';
import { formatTimeAgo, formatNumberWithSuffix } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
// Updated imports to use clientWrappers
import { 
    updateReviewInteraction, 
    deleteReview, 
    getUserSentimentForReview 
} from '@/app/actions/clientWrappers';
import { useToast } from '@/hooks/use-toast';
import { WriteReviewModal } from '@/components/review/WriteReviewModal'; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';

interface ReviewCardProps {
  review: Review;
}

interface MockUser {
  id: string;
  usertag: string;
  name: string;
  role: UserAppRole;
}

export function ReviewCard({ review: initialReview }: ReviewCardProps) {
  const [review, setReview] = useState<Review>(initialReview);
  const [interactionCounts, setInteractionCounts] = useState<ReviewInteractionCounts>(initialReview.interactionCounts);
  
  const [currentUserSentiment, setCurrentUserSentiment] = useState<'helpful' | 'unhelpful' | null>(null);
  const [currentUserIsFunny, setCurrentUserIsFunny] = useState<boolean>(false);
  const [isFetchingUserSentiment, setIsFetchingUserSentiment] = useState(true); // Start true to trigger fetch

  const [isLoading, setIsLoading] = useState<Record<'helpful' | 'unhelpful' | 'funny' | 'delete', boolean>>({
    helpful: false,
    unhelpful: false,
    funny: false,
    delete: false,
  });
  const { toast } = useToast();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingCurrentUserId, setIsLoadingCurrentUserId] = useState(true);


  useEffect(() => {
    setIsLoadingCurrentUserId(true);
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser) {
      try {
        const user: MockUser = JSON.parse(storedUser);
        setCurrentUserId(user.id);
      } catch (e) {
        console.error("Failed to parse mockUser for review card", e);
        setCurrentUserId(null);
      }
    } else {
        setCurrentUserId(null);
    }
    setIsLoadingCurrentUserId(false);
  }, []);

  useEffect(() => {
    // Fetch user sentiment only if currentUserId is known and initial fetch hasn't happened
    if (!isLoadingCurrentUserId && isFetchingUserSentiment) { // Check isLoadingCurrentUserId here
      const fetchSentiment = async () => {
        // Only fetch if a user ID is present (meaning someone is "logged in")
        if (currentUserId) { 
            const result = await getUserSentimentForReview(review.id); // Wrapper will handle passing ID
            if (result.success && result.data) {
                setCurrentUserSentiment(result.data.sentiment);
                setCurrentUserIsFunny(result.data.isFunny);
            } else if (!result.success && result.errorCode !== 'AUTH_REQUIRED') {
                console.error("Failed to fetch user sentiment:", result.error);
            }
        }
        // Whether there's a user or not, or if fetch failed, mark as done for this attempt
        setIsFetchingUserSentiment(false); 
      };
      fetchSentiment();
    }
  }, [currentUserId, review.id, isFetchingUserSentiment, isLoadingCurrentUserId]);


  const isAuthor = currentUserId === review.author.id;

  const [createdAtFormatted, setCreatedAtFormatted] = React.useState<string>(() => {
    return new Date(review.createdAt).toLocaleDateString();
  });

  React.useEffect(() => {
    setCreatedAtFormatted(formatTimeAgo(review.createdAt));
  }, [review.createdAt]);
  
  useEffect(() => {
    setInteractionCounts(initialReview.interactionCounts);
    // When the initial review prop changes (e.g. after an edit and re-fetch by parent)
    // re-evaluate the user's sentiment for this review.
    if (!isLoadingCurrentUserId) { // Only if we know the current user status
        setIsFetchingUserSentiment(true); // Trigger re-fetch of sentiment
    }
  }, [initialReview, isLoadingCurrentUserId]);

  const handleInteraction = async (interactionType: 'helpful' | 'unhelpful' | 'funny') => {
    if (!currentUserId) {
        toast({ title: "Login Required", description: "You need to be logged in to interact with reviews.", variant: "destructive" });
        return;
    }
    setIsLoading(prev => ({ ...prev, [interactionType]: true }));
    try {
      // Using the wrapped action which will implicitly pass the current user's mock ID
      const result = await updateReviewInteraction(review.id, interactionType);
      if (result.success && result.data) {
        setInteractionCounts(result.data.updatedCounts);
        setCurrentUserSentiment(result.data.currentUserSentiment);
        setCurrentUserIsFunny(result.data.currentUserIsFunny);
      } else {
        toast({
          title: "Error",
          description: result.error || "Could not update interaction.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [interactionType]: false }));
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = async () => {
    setIsLoading(prev => ({ ...prev, delete: true }));
    try {
      // Using the wrapped action
      const result = await deleteReview(review.id);
      if (result.success) {
        toast({ title: "Review Deleted", description: "Your review has been removed." });
        router.refresh(); 
      } else {
        toast({
          title: "Error Deleting Review",
          description: result.error || "Could not delete review.",
          variant: "destructive",
        });
      }
    } catch (error) {
       toast({
          title: "Error",
          description: "An unexpected error occurred while deleting.",
          variant: "destructive",
        });
    } finally {
      setIsLoading(prev => ({ ...prev, delete: false }));
    }
  };

  return (
    <>
      <Card className={cn(
        "w-full shadow-md bg-card/90 backdrop-blur-sm h-full",
        review.isMostHelpful && "border-2 border-primary shadow-primary/30"
      )}>
        {review.isMostHelpful && (
          <div className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-t-md flex items-center">
            <Star className="w-4 h-4 mr-2 fill-current" /> Most Helpful Review
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
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground" suppressHydrationWarning={true}>
                  {createdAtFormatted}
                </p>
                {!isLoadingCurrentUserId && isAuthor && ( 
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEdit} title="Edit review">
                      <Edit3 className="h-3.5 w-3.5 text-blue-500 hover:text-blue-400" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Delete review">
                          <Trash2 className="h-3.5 w-3.5 text-destructive/70 hover:text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Your Review?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. Your review will be permanently removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isLoading.delete}>
                            {isLoading.delete && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
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
          <Button
            variant={currentUserSentiment === 'helpful' ? "default" : "outline"}
            size="sm"
            className={cn("text-xs h-7 px-2 py-1 group",
                currentUserSentiment === 'helpful' ? "bg-green-500 hover:bg-green-600 text-white" : "hover:bg-green-500/10 hover:border-green-500/50 hover:text-white"
            )}
            onClick={() => handleInteraction('helpful')}
            disabled={isLoading.helpful || isFetchingUserSentiment || isLoadingCurrentUserId}
          >
            {isLoading.helpful ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin"/> : <ThumbsUp className={cn("w-3.5 h-3.5 mr-1.5", currentUserSentiment === 'helpful' ? "text-white" : "text-green-500 group-hover:text-white")} />}
            Yes ({formatNumberWithSuffix(interactionCounts.helpful)})
          </Button>
          <Button
            variant={currentUserSentiment === 'unhelpful' ? "destructive" : "outline"}
            size="sm"
            className={cn("text-xs h-7 px-2 py-1 group",
                currentUserSentiment === 'unhelpful' ? "bg-red-500 hover:bg-red-600 text-white" : "hover:bg-red-500/10 hover:border-red-500/50 hover:text-white"
            )}
            onClick={() => handleInteraction('unhelpful')}
            disabled={isLoading.unhelpful || isFetchingUserSentiment || isLoadingCurrentUserId}
          >
            {isLoading.unhelpful ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin"/> : <ThumbsDown className={cn("w-3.5 h-3.5 mr-1.5", currentUserSentiment === 'unhelpful' ? "text-white" : "text-red-500 group-hover:text-white")} />}
            No ({formatNumberWithSuffix(interactionCounts.unhelpful)})
          </Button>
          <Button
            variant={currentUserIsFunny ? "default" : "outline"}
            size="sm"
            className={cn("text-xs h-7 px-2 py-1 group",
                currentUserIsFunny ? "bg-yellow-500 hover:bg-yellow-600 text-black" : "hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:text-white"
            )}
            onClick={() => handleInteraction('funny')}
            disabled={isLoading.funny || isFetchingUserSentiment || isLoadingCurrentUserId}
          >
            {isLoading.funny ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin"/> : <Smile className={cn("w-3.5 h-3.5 mr-1.5", currentUserIsFunny ? "text-black" : "text-yellow-500 group-hover:text-white")} />}
            Funny ({formatNumberWithSuffix(interactionCounts.funny)})
          </Button>
        </CardFooter>
      </Card>

      {!isLoadingCurrentUserId && isAuthor && review.author && (
        <WriteReviewModal
          resource={{
            id: review.resourceId,
            name: "this resource", 
            authorId: review.authorId, 
            version: review.resourceVersion, 
          } as any} 
          isOpen={isEditing}
          onOpenChange={setIsEditing}
          onReviewSubmitted={() => { setIsEditing(false); router.refresh(); }}
          editingReview={review} 
        />
      )}
    </>
  );
}
