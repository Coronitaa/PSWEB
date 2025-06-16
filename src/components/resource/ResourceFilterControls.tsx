
"use client";

import type { TagInGroupConfig, ItemType, DynamicAvailableFilterTags, DynamicTagGroup } from '@/lib/types';
import { useState, useEffect, useTransition, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListFilter, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResourceFilterControlsProps {
  dynamicAvailableFilterGroups: DynamicAvailableFilterTags;
  itemType: ItemType;
  onFilterChangeCallback: (newFilters: Record<string, string | undefined>) => void;
}

export function ResourceFilterControls({
  dynamicAvailableFilterGroups,
  itemType,
  onFilterChangeCallback
}: ResourceFilterControlsProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedGroupFilters, setSelectedGroupFilters] = useState<Record<string, string | undefined>>(() => {
    const initialFilters: Record<string, string | undefined> = {};
    dynamicAvailableFilterGroups.forEach(group => {
      initialFilters[group.id] = undefined;
    });
    return initialFilters;
  });

  useEffect(() => {
    const newSelectedFilters: Record<string, string | undefined> = {};
    dynamicAvailableFilterGroups.forEach(group => {
      const paramValue = searchParams.get(group.id);
      newSelectedFilters[group.id] = paramValue || undefined;
    });
    setSelectedGroupFilters(newSelectedFilters);
  }, [searchParams, dynamicAvailableFilterGroups]);

  const updateFiltersInUrl = useCallback((updatedSelectedFilters: Record<string, string | undefined>) => {
    startTransition(() => {
      onFilterChangeCallback(updatedSelectedFilters);
    });
  }, [onFilterChangeCallback]);

  const handleClearFilters = () => {
    const clearedFilters: Record<string, string | undefined> = {};
    dynamicAvailableFilterGroups.forEach(group => {
      clearedFilters[group.id] = undefined;
    });
    setSelectedGroupFilters(clearedFilters);
    updateFiltersInUrl(clearedFilters);
  };

  const toggleTagSelection = (tagId: string, groupId: string) => {
    const newSelectedFilters = { ...selectedGroupFilters };
    newSelectedFilters[groupId] = newSelectedFilters[groupId] === tagId ? undefined : tagId;
    setSelectedGroupFilters(newSelectedFilters);
    updateFiltersInUrl(newSelectedFilters);
  };
  
  const hasActiveFilters = Object.values(selectedGroupFilters).some(tagId => tagId !== undefined);

  const renderTagGroup = (group: DynamicTagGroup) => {
    if (!group.tags || group.tags.length === 0) return null;

    const title = group.displayName;
    const currentSelectedTagId = selectedGroupFilters[group.id];

    return (
      <div key={group.id}>
        <h4 className="font-semibold mb-2 text-foreground/90 text-sm">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {group.tags.map(tag => { 
            const isSelected = currentSelectedTagId === tag.id;

            const baseBgColor = tag.color;
            const baseTextColor = tag.text_color;
            const baseBorderColor = tag.border_color; // Use the new field

            const hoverBgColor = tag.hover_bg_color;
            const hoverTextColor = tag.hover_text_color;
            const hoverBorderColor = tag.hover_border_color;

            const styles: React.CSSProperties = {
              '--base-bg-color': isSelected ? 'hsl(var(--primary))' : (baseBgColor || 'hsl(var(--secondary))'),
              '--base-text-color': isSelected ? 'hsl(var(--primary-foreground))' : (baseTextColor || 'hsl(var(--secondary-foreground))'),
              '--base-border-color': isSelected ? 'hsl(var(--primary))' : (baseBorderColor || baseBgColor || 'hsl(var(--border))'),
              
              '--hover-bg-color': hoverBgColor || baseBgColor || (isSelected ? 'hsl(var(--primary)/0.9)' : 'hsl(var(--accent)/0.2)'),
              '--hover-text-color': hoverTextColor || baseTextColor || (isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--accent-foreground))'),
              '--hover-border-color': hoverBorderColor || baseBorderColor || hoverBgColor || baseBgColor || (isSelected ? 'hsl(var(--primary)/0.9)' : 'hsl(var(--accent))'),

              '--icon-base-color': isSelected ? 'hsl(var(--primary-foreground))' : (baseTextColor || 'hsl(var(--secondary-foreground))'),
              '--icon-hover-color': hoverTextColor || baseTextColor || (isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--accent-foreground))'),
            };
            
            const hasCustomBaseStyles = baseBgColor || baseTextColor || baseBorderColor;
            const buttonVariant = isSelected ? 'default' : (hasCustomBaseStyles ? 'outline' : 'secondary');

            return (
              <Button
                key={tag.id}
                variant={buttonVariant}
                size="sm"
                onClick={() => toggleTagSelection(tag.id, group.id)}
                disabled={isPending}
                className={cn(
                  "text-xs px-2.5 py-1 h-auto rounded-full transition-all duration-150 ease-in-out group/filter-tag border",
                  "bg-[var(--base-bg-color)] text-[var(--base-text-color)] border-[var(--base-border-color)]",
                  "hover:bg-[var(--hover-bg-color)] hover:text-[var(--hover-text-color)] hover:border-[var(--hover-border-color)]",
                  isSelected && "ring-2 ring-offset-1 ring-offset-background ring-[var(--base-text-color)]", // Keep ring for selected
                )}
                style={styles}
                title={tag.name}
              >
                {isSelected && <Check className="w-3 h-3 mr-1 shrink-0" />}
                {tag.icon_svg && (
                    <span
                        className={cn(
                            "inline-block h-3 w-3 mr-1.5 shrink-0 text-[var(--icon-base-color)] group-hover/filter-tag:text-[var(--icon-hover-color)] transition-colors"
                        )}
                        dangerouslySetInnerHTML={{ __html: tag.icon_svg }}
                    />
                )}
                {tag.name}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="shadow-md sticky top-24 bg-card/80 backdrop-blur-sm border-border/40">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
        <CardTitle className="text-lg flex items-center"><ListFilter className="w-5 h-5 mr-2 text-primary" /> Filters</CardTitle>
        {hasActiveFilters && (
             <Button onClick={handleClearFilters} variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" disabled={isPending}>
                <X className="w-3.5 h-3.5 mr-1" /> Clear All
            </Button>
          )}
      </CardHeader>
      <CardContent className="space-y-5 pt-2 pb-4">
        {dynamicAvailableFilterGroups.length > 0 ? (
            dynamicAvailableFilterGroups.map(group => renderTagGroup(group))
        ) : (
            <p className="text-xs text-muted-foreground">No filters configured for this category.</p>
        )}
      </CardContent>
    </Card>
  );
}
