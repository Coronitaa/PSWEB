
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Resource, ReviewFormData, UserAppRole, Review } from '@/lib/types'; // Added Review
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Star, ThumbsUp, ThumbsDown, Info, Send, MessageSquareWarning, Edit3 } from 'lucide-react'; // Added Edit3
import { useToast } from '@/hooks/use-toast';
import { addReview, updateReview } from '@/app/actions/clientWrappers'; // Using clientWrappers
import { cn } from '@/lib/utils';

const reviewFormSchema = z.object({
  isRecommended: z.boolean({ required_error: "Recommendation is required." }),
  comment: z.string().min(10, "Comment must be at least 10 characters.").max(2000, "Comment cannot exceed 2000 characters."),
  resourceVersion: z.string(),
});

interface WriteReviewModalProps {
  resource: Pick<Resource, 'id' | 'name' | 'version' | 'authorId'>; // Use Pick for minimal resource props
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewSubmitted: () => void;
  editingReview?: Review; // Optional prop for editing
}

export function WriteReviewModal({ resource, isOpen, onOpenChange, onReviewSubmitted, editingReview }: WriteReviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditMode = !!editingReview;

  const form = useForm<z.infer<typeof reviewFormSchema>>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      isRecommended: editingReview?.isRecommended ?? undefined,
      comment: editingReview?.comment || '',
      resourceVersion: editingReview?.resourceVersion || resource.version || 'N/A',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        isRecommended: editingReview?.isRecommended ?? undefined,
        comment: editingReview?.comment || '',
        resourceVersion: editingReview?.resourceVersion || resource.version || 'N/A',
      });
    }
  }, [isOpen, resource.version, editingReview, form]);


  const onSubmit = async (data: z.infer<typeof reviewFormSchema>) => {
    setIsSubmitting(true);
    try {
      let result;
      if (isEditMode && editingReview) {
        result = await updateReview(editingReview.id, data); // Using clientWrapper
      } else {
        result = await addReview(resource.id, data); // Using clientWrapper
      }

      if (result.success) {
        toast({
          title: isEditMode ? "Review Updated!" : "Review Submitted!",
          description: isEditMode ? "Your review has been successfully updated." : "Thank you for your feedback.",
        });
        onReviewSubmitted();
        onOpenChange(false);
      } else {
        toast({
          title: `Error ${isEditMode ? 'Updating' : 'Submitting'} Review`,
          description: result.error || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `An unexpected error occurred while ${isEditMode ? 'updating' : 'submitting'} your review.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const recommendation = form.watch('isRecommended');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl bg-card/95 backdrop-blur-lg border-border/50 shadow-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-2xl font-semibold text-primary flex items-center">
            {isEditMode ? <Edit3 className="w-6 h-6 mr-2.5" /> : <MessageSquareWarning className="w-6 h-6 mr-2.5" />}
            {isEditMode ? `Edit Your Review for ${resource.name}` : `Write a Review for ${resource.name}`}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditMode ? `Update your experience with this resource.` : `Share your experience with this resource.`} Version reviewed: <span className="font-semibold text-foreground/80">{form.getValues('resourceVersion')}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
          <div>
            <Label htmlFor="isRecommended" className="text-base font-medium text-foreground mb-2 block">Do you recommend this resource?</Label>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant={recommendation === true ? "default" : "outline"}
                onClick={() => form.setValue('isRecommended', true, { shouldValidate: true })}
                className={cn("flex-1 h-12 text-base group transition-all duration-200", recommendation === true && "bg-green-600 hover:bg-green-700 border-green-700 text-white shadow-lg scale-105")}
                disabled={isSubmitting}
              >
                <ThumbsUp className={cn("w-5 h-5 mr-2", recommendation === true ? "text-white" : "text-green-500 group-hover:text-green-400")} /> Yes
              </Button>
              <Button
                type="button"
                variant={recommendation === false ? "destructive" : "outline"}
                onClick={() => form.setValue('isRecommended', false, { shouldValidate: true })}
                className={cn("flex-1 h-12 text-base group transition-all duration-200", recommendation === false && "bg-red-600 hover:bg-red-700 border-red-700 text-white shadow-lg scale-105")}
                disabled={isSubmitting}
              >
                <ThumbsDown className={cn("w-5 h-5 mr-2", recommendation === false ? "text-white" : "text-red-500 group-hover:text-red-400")} /> No
              </Button>
            </div>
            {form.formState.errors.isRecommended && (
              <p className="text-xs text-destructive mt-1.5">{form.formState.errors.isRecommended.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="comment" className="text-base font-medium text-foreground mb-2 block">Your Review</Label>
            <Textarea
              id="comment"
              {...form.register('comment')}
              placeholder="Share your thoughts, good or bad..."
              rows={5}
              className="text-base"
              disabled={isSubmitting}
            />
            {form.formState.errors.comment && (
              <p className="text-xs text-destructive mt-1.5">{form.formState.errors.comment.message}</p>
            )}
          </div>

          <input type="hidden" {...form.register('resourceVersion')} />

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" className="button-primary-glow min-w-[120px]" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isEditMode ? <Edit3 className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {isEditMode ? 'Update Review' : 'Submit Review'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
