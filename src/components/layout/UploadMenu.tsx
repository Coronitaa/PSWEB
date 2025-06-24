"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, Gamepad2, Code, TabletSmartphone, Music, Package, Layers } from 'lucide-react';
import { getAllItemsWithDetails } from '@/lib/data';
import type { ItemWithDetails, Category, ItemType } from '@/lib/types';
import { ITEM_TYPE_NAMES } from '@/lib/types';

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

export function UploadMenu({
  isOpen,
  onOpenChange,
  initialItemType,
  initialProjectSlug,
  initialCategorySlug,
}: UploadMenuProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [allItems, setAllItems] = useState<ItemWithDetails[]>([]);

  const [selectedItemType, setSelectedItemType] = useState<ItemType | null>(initialItemType || null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getAllItemsWithDetails()
        .then((items) => {
          setAllItems(items);
          // After fetching, try to set initial selections based on slugs
          if (initialItemType) {
            setSelectedItemType(initialItemType);
            if (initialProjectSlug) {
              const project = items.find(
                (item) => item.itemType === initialItemType && item.slug === initialProjectSlug
              );
              if (project) {
                setSelectedProjectId(project.id);
                if (initialCategorySlug) {
                  const category = project.categories.find(
                    (cat) => cat.slug === initialCategorySlug
                  );
                  if (category) {
                    setSelectedCategoryId(category.id);
                  }
                }
              }
            }
          }
        })
        .catch((err) => console.error("Failed to load items for upload menu", err))
        .finally(() => setIsLoading(false));
    } else {
        // Reset state when closed
        setSelectedItemType(null);
        setSelectedProjectId(null);
        setSelectedCategoryId(null);
    }
  }, [isOpen, initialItemType, initialProjectSlug, initialCategorySlug]);
  
  useEffect(() => {
    // Reset selections if initial type changes while dialog is open
    setSelectedProjectId(null);
    setSelectedCategoryId(null);
  }, [selectedItemType]);

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
      const itemTypePath = project.itemType === 'art-music' ? 'art-music' : `${project.itemType}s`;
      const path = `/${itemTypePath}/${project.slug}/${category.slug}`;
      onOpenChange(false);
      router.push(path);
    }
  };

  return (
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
              <Select
                value={selectedProjectId || ""}
                onValueChange={handleProjectChange}
                disabled={!selectedItemType}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
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
              <Select
                value={selectedCategoryId || ""}
                onValueChange={setSelectedCategoryId}
                disabled={!selectedProjectId}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
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
          <Button
            onClick={handleContinue}
            disabled={!selectedItemType || !selectedProjectId || !selectedCategoryId}
          >
            Go to Category <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
