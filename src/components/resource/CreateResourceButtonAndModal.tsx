
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ResourceForm } from '@/components/admin/ResourceForm';
import type { ItemType, DynamicAvailableFilterTags, RawCategoryProjectDetails, UserAppRole } from '@/lib/types';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAvailableFilterTags, getRawCategoryDetailsForForm } from '@/lib/data'; // For fetching data client-side
import { toast } from '@/hooks/use-toast';

interface CreateResourceButtonAndModalProps {
  itemType: ItemType;
  itemSlug: string;
  categorySlug: string;
  itemName: string;
  categoryName: string;
}

interface MockUserForRole {
  usertag: string;
  name: string;
  role: UserAppRole;
}

export function CreateResourceButtonAndModal({
  itemType,
  itemSlug,
  categorySlug,
  itemName,
  categoryName,
}: CreateResourceButtonAndModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [parentDetails, setParentDetails] = useState<RawCategoryProjectDetails | null>(null);
  const [dynamicTagGroups, setDynamicTagGroups] = useState<DynamicAvailableFilterTags>([]);
  const router = useRouter();

  const handleOpen = async () => {
    const storedUser = localStorage.getItem('mockUser');
    if (!storedUser) {
      toast({
        title: "Login Required",
        description: "You need to be logged in to add a resource.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingData(true);
    setIsOpen(true); // Open modal immediately, show loader inside if needed

    try {
      const fetchedParentDetails = await getRawCategoryDetailsForForm(itemSlug, itemType, categorySlug);
      if (!fetchedParentDetails) {
        console.error("Failed to fetch parent details for modal.");
        toast({
            title: "Error",
            description: "Could not load data to create resource. Please try again.",
            variant: "destructive",
        });
        setIsOpen(false); // Close if essential data fails
        return;
      }
      setParentDetails(fetchedParentDetails);

      const fetchedDynamicTags = await getAvailableFilterTags(itemSlug, itemType, categorySlug);
      setDynamicTagGroups(fetchedDynamicTags);
    } catch (error) {
      console.error("Error fetching data for resource modal:", error);
      toast({
        title: "Error",
        description: "An error occurred while preparing the form. Please try again.",
        variant: "destructive",
      });
      setIsOpen(false); // Close on error
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSaveSuccess = () => {
    setIsOpen(false);
    router.refresh(); 
  };

  return (
    <>
      <Button variant="outline" className="ml-4 shrink-0" onClick={handleOpen} disabled={isLoadingData}>
        {isLoadingData && isOpen ? ( // Show loader on button only if it's the initial click causing data load
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <PlusCircle className="w-4 h-4 mr-2" />
        )}
        Add Resource
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Resource in {categoryName}</DialogTitle>
            <DialogDescription>
              Fill in the details for your new resource for {itemName}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2 -mr-2 custom-scrollbar">
            {isLoadingData && ( // Loader inside the modal content area
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading form data...</p>
              </div>
            )}
            {!isLoadingData && parentDetails && (
              <ResourceForm
                isNew={true}
                itemType={itemType}
                projectSlug={itemSlug}
                categorySlug={categorySlug}
                parentItemId={parentDetails.parentItemId}
                categoryId={parentDetails.categoryId}
                dynamicTagGroups={dynamicTagGroups}
                onSuccess={handleSaveSuccess}
              />
            )}
             {!isLoadingData && !parentDetails && !isOpen && ( // Should not happen if isOpen controls dialog, but as fallback
                <div className="flex justify-center items-center h-64">
                    <p className="text-destructive">Failed to load resource creation form. Please try again.</p>
                </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
    