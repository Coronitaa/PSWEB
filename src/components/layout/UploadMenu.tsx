
"use client";

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, Gamepad2, Code, TabletSmartphone, Music, Package, Layers } from 'lucide-react';
import { getAllItemsWithDetails } from '@/lib/data';
import { fetchResourceBySlugAction } from '@/app/actions/resourceActions';
import type { ItemWithDetails, Category, ItemType, Resource } from '@/lib/types';
import { ITEM_TYPE_NAMES } from '@/lib/types';
import { CreateResourceButtonAndModal } from '../resource/CreateResourceButtonAndModal';

interface UploadMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialItemType?: ItemType;
  initialProjectSlug?: string;
  initialCategorySlug?: string;
}

const itemTypeIcons: Record<ItemType, React.ElementType> = {
  game: Gamepad2,
  web: Code,
  app: TabletSmartphone,
  'art-music': Music,
};

type Context = { itemType: ItemType; projectSlug: string; categorySlug: string; projectName: string, categoryName: string };

export function UploadMenu({
  isOpen,
  onOpenChange,
  initialItemType,
  initialProjectSlug,
  initialCategorySlug
}: UploadMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, startLoadingTransition] = useTransition();

  const [allItems, setAllItems] = useState<ItemWithDetails[]>([]);
  const [selectedItemType, setSelectedItemType] = useState<ItemType | null>(initialItemType || null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalContext, setCreateModalContext] = useState<Context | null>(null);

  const determineContext = async () => {
    startLoadingTransition(async () => {
      const allItemsPromise = getAllItemsWithDetails();
      const parts = pathname.split('/').filter(Boolean);
      let context: { itemType?: ItemType, projectSlug?: string, categorySlug?: string } = {
        itemType: initialItemType,
        projectSlug: initialProjectSlug,
        categorySlug: initialCategorySlug,
      };

      if (parts[0] === 'resources' && parts[1]) {
        const resource = await fetchResourceBySlugAction(parts[1]);
        if (resource) {
          context = { 
            itemType: resource.parentItemType, 
            projectSlug: resource.parentItemSlug, 
            categorySlug: resource.categorySlug 
          };
        }
      }
      
      const loadedItems = await allItemsPromise;
      setAllItems(loadedItems);

      if (context.itemType) {
        setSelectedItemType(context.itemType);
        if (context.projectSlug) {
          const project = loadedItems.find(i => i.itemType === context.itemType && i.slug === context.projectSlug);
          if (project) {
            setSelectedProjectId(project.id);
            if (context.categorySlug) {
              const category = project.categories.find(c => c.slug === context.categorySlug);
              if (category) {
                setSelectedCategoryId(category.id);
              }
            }
          }
        }
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      determineContext();
    } else {
      setSelectedItemType(null);
      setSelectedProjectId(null);
      setSelectedCategoryId(null);
    }
  }, [isOpen, pathname, initialItemType, initialProjectSlug, initialCategorySlug]);

  const handleItemTypeChange = (value: string) => {
    setSelectedCategoryId(null);
    setSelectedProjectId(null);
    setSelectedItemType(value as ItemType);
  };
  
  const handleProjectChange = (projectId: string) => {
    setSelectedCategoryId(null);
    setSelectedProjectId(projectId);
  };

  const filteredProjects = useMemo(() => {
    if (!selectedItemType) return [];
    return allItems.filter((item) => item.itemType === selectedItemType);
  }, [allItems, selectedItemType]);

  const availableCategories = useMemo(() => {
    if (!selectedProjectId) return [];
    const project = allItems.find((item) => item.id === selectedProjectId);
    return project?.categories || [];
  }, [allItems, selectedProjectId]);

  const handleContinue = () => {
    if (!selectedItemType || !selectedProjectId || !selectedCategoryId) return;
    
    const project = allItems.find(item => item.id === selectedProjectId);
    const category = project?.categories.find(cat => cat.id === selectedCategoryId);

    if (project && category) {
      setCreateModalContext({
        itemType: selectedItemType,
        projectSlug: project.slug,
        categorySlug: category.slug,
        projectName: project.name,
        categoryName: category.name,
      });
      onOpenChange(false); // Close the selection menu
      setIsCreateModalOpen(true); // Open the create resource form
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    router.refresh();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start an Upload</DialogTitle>
            <DialogDescription>
              Choose a category to upload your new resource to.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="item-type">Section</Label>
                <Select value={selectedItemType || ""} onValueChange={handleItemTypeChange}>
                  <SelectTrigger id="item-type">
                    <SelectValue placeholder="Select a section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ITEM_TYPE_NAMES).map(([key, name]) => {
                      const Icon = itemTypeIcons[key as ItemType];
                      return (
                          <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {name}
                          </div>
                          </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={selectedProjectId || ""} onValueChange={handleProjectChange} disabled={!selectedItemType}>
                  <SelectTrigger id="project"><SelectValue placeholder="Select a project..." /></SelectTrigger>
                  <SelectContent>
                    {filteredProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              {project.name}
                          </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategoryId || ""} onValueChange={setSelectedCategoryId} disabled={!selectedProjectId}>
                  <SelectTrigger id="category"><SelectValue placeholder="Select a category..." /></SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4" />
                              {cat.name}
                          </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleContinue} disabled={!selectedItemType || !selectedProjectId || !selectedCategoryId}>
              Create Resource <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {createModalContext && (
        <CreateResourceButtonAndModal
          isOpen={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSuccess={handleCreateSuccess}
          itemType={createModalContext.itemType}
          itemSlug={createModalContext.projectSlug}
          categorySlug={createModalContext.categorySlug}
          itemName={createModalContext.projectName}
          categoryName={createModalContext.categoryName}
        />
      )}
    </>
  );
}
