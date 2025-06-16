
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import type { CategoryTagGroupConfig, ProjectCategoryTagConfigurations, ProjectTagGroupSource, TagInGroupConfig } from '@/lib/types';
import { fetchProjectCategoryTagConfigurationsAction } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Loader2, PackageSearch, Inbox, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ImportTagGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  projectId: string;
  onImportGroup: (groupConfig: CategoryTagGroupConfig) => void;
}

export function ImportTagGroupDialog({
  isOpen,
  onOpenChange,
  projectId,
  onImportGroup,
}: ImportTagGroupDialogProps) {
  const [isLoading, startLoadingTransition] = useTransition();
  const [availableGroups, setAvailableGroups] = useState<ProjectCategoryTagConfigurations>([]);
  const [selectedGroupSource, setSelectedGroupSource] = useState<ProjectTagGroupSource | null>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      startLoadingTransition(async () => {
        const result = await fetchProjectCategoryTagConfigurationsAction(projectId);
        if (result.success && result.data) {
          setAvailableGroups(result.data);
        } else {
          toast({ title: "Error", description: result.error || "Failed to load existing tag group configurations.", variant: "destructive" });
          setAvailableGroups([]);
        }
      });
    } else {
      setAvailableGroups([]); // Clear when dialog is not open or no project ID
      setSelectedGroupSource(null);
    }
  }, [isOpen, projectId]);

  const handleImport = () => {
    if (selectedGroupSource) {
      onImportGroup(selectedGroupSource.groupConfig);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center"><PackageSearch className="mr-2 h-5 w-5 text-primary" /> Import Existing Tag Group</DialogTitle>
          <DialogDescription>
            Select a tag group configuration from another category in this project to import as a new, editable group.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : availableGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
                <Inbox className="w-12 h-12 mx-auto mb-3 text-primary/50"/>
                No existing tag group configurations found in other categories of this project.
            </div>
          ) : (
            <ScrollArea className="h-[40vh] border rounded-md p-2 bg-muted/30">
              <div className="space-y-2">
                {availableGroups.map((groupSource, index) => (
                  <button
                    key={`${groupSource.sourceCategoryId}-${groupSource.groupConfig.id}-${index}`} // More robust key
                    onClick={() => setSelectedGroupSource(groupSource)}
                    className={cn(
                      "w-full text-left p-3 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
                      selectedGroupSource?.groupConfig.id === groupSource.groupConfig.id && selectedGroupSource.sourceCategoryId === groupSource.sourceCategoryId
                        ? "bg-primary/10 border-primary ring-2 ring-primary"
                        : "bg-card hover:bg-muted/60 border-border"
                    )}
                  >
                    <div className="font-semibold text-foreground">{groupSource.groupConfig.groupDisplayName}</div>
                    <div className="text-xs text-muted-foreground">
                      From Category: <span className="font-medium text-foreground/80">{groupSource.sourceCategoryName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Tags: {groupSource.groupConfig.tags && groupSource.groupConfig.tags.length > 0
                                ? groupSource.groupConfig.tags.slice(0,3).map((tag: TagInGroupConfig) => <Badge key={tag.id} variant="secondary" className="mr-1 text-[10px]">{tag.name}</Badge>)
                                : "No tags"
                             }
                             {groupSource.groupConfig.tags && groupSource.groupConfig.tags.length > 3 && <Badge variant="outline" className="text-[10px]">+{groupSource.groupConfig.tags.length - 3} more</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} disabled={!selectedGroupSource || isLoading} className="button-primary-glow">
            <Copy className="mr-2 h-4 w-4" /> Import Selected Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
