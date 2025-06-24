
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ResourceForm } from '@/components/admin/ResourceForm';
import type { ItemType, DynamicAvailableFilterTags, RawCategoryProjectDetails } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAvailableFilterTags, getRawCategoryDetailsForForm } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

interface CreateResourceModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  itemType: ItemType;
  itemSlug: string;
  categorySlug: string;
  itemName: string;
  categoryName: string;
}

export function CreateResourceButtonAndModal({
  isOpen,
  onOpenChange,
  onSuccess,
  itemType,
  itemSlug,
  categorySlug,
  itemName,
  categoryName,
}: CreateResourceModalProps) {
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [parentDetails, setParentDetails] = useState<RawCategoryProjectDetails | null>(null);
  const [dynamicTagGroups, setDynamicTagGroups] = useState<DynamicAvailableFilterTags>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsLoadingData(true);
      const fetchData = async () => {
        try {
          const fetchedParentDetails = await getRawCategoryDetailsForForm(itemSlug, itemType, categorySlug);
          if (!fetchedParentDetails) {
            toast({ title: "Error", description: "Could not load data to create resource.", variant: "destructive" });
            onOpenChange(false);
            return;
          }
          setParentDetails(fetchedParentDetails);

          const fetchedDynamicTags = await getAvailableFilterTags(itemSlug, itemType, categorySlug);
          setDynamicTagGroups(fetchedDynamicTags);
        } catch (error) {
          toast({ title: "Error", description: "An error occurred while preparing the form.", variant: "destructive" });
          onOpenChange(false);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchData();
    }
  }, [isOpen, itemSlug, itemType, categorySlug, onOpenChange, toast]);

  return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Resource in {categoryName}</DialogTitle>
            <DialogDescription>
              Fill in the details for your new resource for {itemName}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2 -mr-2 custom-scrollbar">
            {isLoadingData ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading form data...</p>
              </div>
            ) : parentDetails ? (
              <ResourceForm
                isNew={true}
                itemType={itemType}
                projectSlug={itemSlug}
                categorySlug={categorySlug}
                parentItemId={parentDetails.parentItemId}
                categoryId={parentDetails.categoryId}
                dynamicTagGroups={dynamicTagGroups}
                onSuccess={onSuccess}
              />
            ) : (
              <div className="flex justify-center items-center h-64">
                <p className="text-destructive">Failed to load resource creation form. Please try again.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
  );
}
