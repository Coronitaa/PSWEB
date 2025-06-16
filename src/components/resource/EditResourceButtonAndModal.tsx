
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ResourceForm } from '@/components/admin/ResourceForm';
import type { Resource, ItemType, DynamicAvailableFilterTags, UserAppRole, RawCategoryProjectDetails } from '@/lib/types';
import { Edit3, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAvailableFilterTags, getRawCategoryDetailsForForm } from '@/lib/data';
import { toast } from '@/hooks/use-toast';

interface EditResourceButtonAndModalProps {
  resource: Resource;
}

interface MockUserForRole {
  usertag: string;
  name: string;
  role: UserAppRole;
  id: string; // Ensure id is part of the type
}

export function EditResourceButtonAndModal({ resource }: EditResourceButtonAndModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dynamicTagGroups, setDynamicTagGroups] = useState<DynamicAvailableFilterTags>([]);
  const [parentDetails, setParentDetails] = useState<RawCategoryProjectDetails | null>(null);
  const [isAllowedToEdit, setIsAllowedToEdit] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsLoadingUser(true);
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser && resource) {
      try {
        const user: MockUserForRole = JSON.parse(storedUser);
        // Ensure the mock user ID matches the pattern used in the DB (e.g., 'mock-admin-id')
        // or simply check roles for admin/mod. For author check, resource.authorId is key.
        const userIsAdminOrMod = user.role === 'admin' || user.role === 'mod';
        // For mock setup, if author ID on resource is a mock ID, compare directly.
        // In a real setup, user.id would come from a session.
        const userIsAuthor = user.id === resource.authorId;

        setIsAllowedToEdit(userIsAdminOrMod || userIsAuthor);

      } catch (e) {
        console.error("Failed to parse mockUser for edit permissions", e);
        setIsAllowedToEdit(false);
      }
    } else {
      setIsAllowedToEdit(false);
    }
    setIsLoadingUser(false);
  }, [resource]);

  const handleOpen = async () => {
    if (!isAllowedToEdit) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to edit this resource.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingData(true);
    setIsOpen(true);

    try {
      // Fetch parent details needed for ResourceForm (project and category context)
      // These should ideally come from the resource object itself if it's complete
      const fetchedParentDetails: RawCategoryProjectDetails = {
        projectName: resource.parentItemName,
        projectSlug: resource.parentItemSlug,
        itemType: resource.parentItemType,
        categoryName: resource.categoryName,
        categorySlug: resource.categorySlug,
        parentItemId: resource.parentItemId,
        categoryId: resource.categoryId,
      };
      setParentDetails(fetchedParentDetails);

      const fetchedDynamicTags = await getAvailableFilterTags(resource.parentItemSlug, resource.parentItemType, resource.categorySlug);
      setDynamicTagGroups(fetchedDynamicTags);

    } catch (error) {
      console.error("Error fetching data for resource edit modal:", error);
      toast({
        title: "Error",
        description: "An error occurred while preparing the edit form. Please try again.",
        variant: "destructive",
      });
      setIsOpen(false);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSaveSuccess = () => {
    setIsOpen(false);
    router.refresh();
  };

  if (isLoadingUser) {
    // Render nothing or a tiny loader while checking permissions
    return <div className="h-9 w-20" />; // Placeholder to prevent layout shift
  }

  if (!isAllowedToEdit) {
    return null; // Don't render the button if user is not allowed
  }


  return (
    <>
      <Button variant="outline" className="ml-auto shrink-0 button-outline-glow" onClick={handleOpen} disabled={isLoadingData}>
        {isLoadingData && isOpen ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Edit3 className="w-4 h-4 mr-2" />
        )}
        Edit Resource
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Resource: {resource.name}</DialogTitle>
            <DialogDescription>
              Update the details for this resource. You can manage file versions below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2 -mr-2 custom-scrollbar">
            {isLoadingData && (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading form data...</p>
              </div>
            )}
            {!isLoadingData && parentDetails && (
              <ResourceForm
                isNew={false}
                initialData={resource}
                itemType={resource.parentItemType}
                projectSlug={resource.parentItemSlug}
                categorySlug={resource.categorySlug}
                parentItemId={parentDetails.parentItemId}
                categoryId={parentDetails.categoryId}
                dynamicTagGroups={dynamicTagGroups}
                onSuccess={handleSaveSuccess}
              />
            )}
            {!isLoadingData && !parentDetails && (
              <div className="flex justify-center items-center h-64">
                <p className="text-destructive">Failed to load resource edit form. Please try again.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
