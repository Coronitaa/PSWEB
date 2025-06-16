
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { CategoryTagGroupConfig, TagInGroupConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit2, ChevronUp, ChevronDown, Save, GripVertical, Loader2, Tag as TagIconLucide, X as XIcon, CopyPlus, Palette, FileCheck2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ImportTagGroupDialog } from './ImportTagGroupDialog';
import { TAG_PALETTES } from '@/lib/tag-palettes';
import { TagBadge } from '@/components/shared/TagBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge'; // Added missing import

const generateId = () => `temp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

interface CategoryTagConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  categoryName: string;
  initialConfigs: CategoryTagGroupConfig[];
  projectId: string;
  onSave: (updatedConfigs: CategoryTagGroupConfig[]) => Promise<void>;
}

export function CategoryTagConfigDialog({
  isOpen,
  onOpenChange,
  categoryName,
  initialConfigs: initialConfigsProp,
  projectId,
  onSave,
}: CategoryTagConfigDialogProps) {
  const [configs, setConfigs] = useState<CategoryTagGroupConfig[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  // States for "Add/Edit Group" Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState<'add' | 'edit'>('add');
  const [currentEditingGroupIdForModal, setCurrentEditingGroupIdForModal] = useState<string | null>(null);
  const [groupModalNameInput, setGroupModalNameInput] = useState('');
  const [groupModalAppliesToFilesInput, setGroupModalAppliesToFilesInput] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  
  const [addTagToGroupInputName, setAddTagToGroupInputName] = useState('');
  
  const [currentEditingCategoryNameForDialog, setCurrentEditingCategoryNameForDialog] = useState<string | null>(null);

  const [isImportGroupDialogOpen, setIsImportGroupDialogOpen] = useState(false);

  const [draggingTagId, setDraggingTagId] = useState<string | null>(null);
  const dragOverTagIdRef = useRef<string | null>(null); 

  const [editingTag, setEditingTag] = useState<TagInGroupConfig | null>(null);
  const [editingTagGroupId, setEditingTagGroupId] = useState<string | null>(null);
  const [tagEdit_Name, setTagEdit_Name] = useState('');
  const [tagEdit_Color, setTagEdit_Color] = useState('');
  const [tagEdit_TextColor, setTagEdit_TextColor] = useState('');
  const [tagEdit_BorderColor, setTagEdit_BorderColor] = useState('');
  const [tagEdit_HoverBgColor, setTagEdit_HoverBgColor] = useState('');
  const [tagEdit_HoverTextColor, setTagEdit_HoverTextColor] = useState('');
  const [tagEdit_HoverBorderColor, setTagEdit_HoverBorderColor] = useState('');
  const [tagEdit_IconSvg, setTagEdit_IconSvg] = useState('');
  const [selectedPaletteName, setSelectedPaletteName] = useState<string>('_custom_');

  useEffect(() => {
    if (isOpen) {
      if (categoryName !== currentEditingCategoryNameForDialog) {
        const sortedInitial = [...initialConfigsProp].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const initialConfigsWithTempIds = sortedInitial.map(config => ({
          ...config,
          id: config.id || generateId(),
          appliesToFiles: config.appliesToFiles || false,
          tags: Array.isArray(config.tags) ? config.tags.map(t => ({...t, id: t.id || generateId()})) : []
        }));
        setConfigs(initialConfigsWithTempIds);
        
        if (initialConfigsWithTempIds.length > 0) {
            if (!selectedGroupId || !initialConfigsWithTempIds.find(g => g.id === selectedGroupId)) {
                 setSelectedGroupId(initialConfigsWithTempIds[0].id);
            }
        } else {
          setSelectedGroupId(null);
        }
        
        setAddTagToGroupInputName('');
        setEditingTag(null);
        setCurrentEditingCategoryNameForDialog(categoryName);
      }
    } else {
        setCurrentEditingCategoryNameForDialog(null); 
        setEditingTag(null);
        setIsGroupModalOpen(false);
    }
  }, [isOpen, categoryName, initialConfigsProp, currentEditingCategoryNameForDialog, selectedGroupId]);

  const selectedGroup = useMemo(() => configs.find(g => g.id === selectedGroupId), [configs, selectedGroupId]);

  const handleOpenAddGroupModal = () => {
    setGroupModalMode('add');
    setCurrentEditingGroupIdForModal(null);
    setGroupModalNameInput('');
    setGroupModalAppliesToFilesInput(false);
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroupModal = (group: CategoryTagGroupConfig) => {
    setGroupModalMode('edit');
    setCurrentEditingGroupIdForModal(group.id);
    setGroupModalNameInput(group.groupDisplayName);
    setGroupModalAppliesToFilesInput(group.appliesToFiles || false);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroupFromModal = () => {
    if (!groupModalNameInput.trim()) {
      toast({ title: "Error", description: "Group name cannot be empty.", variant: "destructive" });
      return;
    }
    if (groupModalMode === 'edit' && currentEditingGroupIdForModal) {
      setConfigs(prevConfigs => prevConfigs.map(g => 
        g.id === currentEditingGroupIdForModal 
        ? { ...g, groupDisplayName: groupModalNameInput.trim(), appliesToFiles: groupModalAppliesToFilesInput } 
        : g
      ));
      toast({ title: "Group Updated", description: `Group "${groupModalNameInput.trim()}" details updated.`});
    } else { // Adding new
      const newGroup: CategoryTagGroupConfig = {
        id: generateId(),
        groupDisplayName: groupModalNameInput.trim(),
        appliesToFiles: groupModalAppliesToFilesInput,
        tags: [],
        sortOrder: configs.length,
      };
      setConfigs(prevConfigs => [...prevConfigs, newGroup]);
      setSelectedGroupId(newGroup.id); 
      toast({ title: "Group Added", description: `Group "${newGroup.groupDisplayName}" created.`});
    }
    setIsGroupModalOpen(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    setConfigs(prevConfigs => {
        const newConfigs = prevConfigs.filter(g => g.id !== groupId).map((g, index) => ({ ...g, sortOrder: index }));
        if (selectedGroupId === groupId) { 
            setSelectedGroupId(newConfigs.length > 0 ? newConfigs[0].id : null);
        }
        return newConfigs;
    });
    toast({ title: "Group Deleted", variant: "default" });
  };

  const moveGroup = (groupId: string, direction: 'up' | 'down') => {
    const index = configs.findIndex(g => g.id === groupId);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= configs.length) return;

    const newConfigsList = [...configs];
    const [movedGroup] = newConfigsList.splice(index, 1);
    newConfigsList.splice(newIndex, 0, movedGroup);
    setConfigs(newConfigsList.map((g, idx) => ({ ...g, sortOrder: idx })));
  };
  
  const handleDefineAndAddTagToGroup = (tagName: string) => {
    if (!tagName.trim() || !selectedGroup) {
      toast({ title: "Error", description: "Tag name cannot be empty or no group selected.", variant: "destructive" });
      return;
    }
    const trimmedTagName = tagName.trim();
    
    if (selectedGroup.tags.some(t => t.name.toLowerCase() === trimmedTagName.toLowerCase())) {
        toast({ title: "Info", description: `Tag "${trimmedTagName}" already exists in this group.`, variant: "default" });
        setAddTagToGroupInputName('');
        return;
    }

    const newTagInGroup: TagInGroupConfig = {
      id: `tag_${trimmedTagName.toLowerCase().replace(/\s+/g, '_')}_${generateId()}`,
      name: trimmedTagName,
      border_color: 'hsl(var(--border) / 0.3)',
    };

    setConfigs(prevConfigs =>
      prevConfigs.map(group => {
        if (group.id === selectedGroupId) {
          return { ...group, tags: [...(group.tags || []), newTagInGroup] };
        }
        return group;
      })
    );
    setAddTagToGroupInputName('');
    handleStartEditTag(newTagInGroup, selectedGroupId!);
  };

  const handleStartEditTag = (tag: TagInGroupConfig, groupId: string) => {
    setEditingTag(tag);
    setEditingTagGroupId(groupId);
    setTagEdit_Name(tag.name);
    setTagEdit_Color(tag.color || '');
    setTagEdit_TextColor(tag.text_color || '');
    setTagEdit_BorderColor(tag.border_color || '');
    setTagEdit_HoverBgColor(tag.hover_bg_color || '');
    setTagEdit_HoverTextColor(tag.hover_text_color || '');
    setTagEdit_HoverBorderColor(tag.hover_border_color || '');
    setTagEdit_IconSvg(tag.icon_svg || '');
    setSelectedPaletteName('_custom_');
  };

  const handleApplyTagEdits = () => {
    if (!editingTag || !editingTagGroupId) return;
    const updatedTag: TagInGroupConfig = {
      ...editingTag,
      name: tagEdit_Name,
      color: tagEdit_Color || undefined,
      text_color: tagEdit_TextColor || undefined,
      border_color: tagEdit_BorderColor || undefined,
      hover_bg_color: tagEdit_HoverBgColor || undefined,
      hover_text_color: tagEdit_HoverTextColor || undefined,
      hover_border_color: tagEdit_HoverBorderColor || undefined,
      icon_svg: tagEdit_IconSvg || undefined,
    };

    setConfigs(prevConfigs =>
      prevConfigs.map(group => {
        if (group.id === editingTagGroupId) {
          return {
            ...group,
            tags: (group.tags || []).map(t => t.id === editingTag.id ? updatedTag : t)
          };
        }
        return group;
      })
    );
    setEditingTag(null);
    setEditingTagGroupId(null);
    toast({ title: "Tag Styles Updated", description: `Styles for "${updatedTag.name}" applied.` });
  };

  const handleCancelTagEdit = () => {
    setEditingTag(null);
    setEditingTagGroupId(null);
  };
  
  const applyPaletteToTagEditor = (paletteName: string) => {
    setSelectedPaletteName(paletteName);
    if (paletteName === '_custom_') {
      return;
    }
    const palette = TAG_PALETTES.find(p => p.name === paletteName);
    if (palette) {
      setTagEdit_Color(palette.base.background || '');
      setTagEdit_TextColor(palette.base.text || '');
      setTagEdit_BorderColor(palette.base.border || '');
      setTagEdit_HoverBgColor(palette.hover.background || '');
      setTagEdit_HoverTextColor(palette.hover.text || '');
      setTagEdit_HoverBorderColor(palette.hover.border || '');
    }
  };

  const handleRemoveTagFromSelectedGroup = (tagId: string) => {
    if (!selectedGroupId) return;
     setConfigs(prevConfigs =>
      prevConfigs.map(group => {
        if (group.id === selectedGroupId) {
          return { ...group, tags: (group.tags || []).filter(t => t.id !== tagId) };
        }
        return group;
      })
    );
  };

  const moveTagInGroup = (tagId: string, groupId: string, direction: 'up' | 'down') => {
    setConfigs(prevConfigs =>
      prevConfigs.map(group => {
        if (group.id === groupId) {
          const currentTags = group.tags || [];
          const tagIndex = currentTags.findIndex(t => t.id === tagId);
          if (tagIndex === -1) return group;

          const newTagOrder = [...currentTags];
          const newTagIndex = direction === 'up' ? tagIndex - 1 : tagIndex + 1;

          if (newTagIndex < 0 || newTagIndex >= newTagOrder.length) return group;

          [newTagOrder[tagIndex], newTagOrder[newTagIndex]] = [newTagOrder[newTagIndex], newTagOrder[tagIndex]];
          return { ...group, tags: newTagOrder };
        }
        return group;
      })
    );
  };

  const handleDragStartTag = (e: React.DragEvent<HTMLDivElement>, tag: TagInGroupConfig) => {
    setDraggingTagId(tag.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tag.id);
  };

  const handleDragOverTag = (e: React.DragEvent<HTMLDivElement>, targetTagId: string) => {
    e.preventDefault();
    if (draggingTagId && draggingTagId !== targetTagId) {
      dragOverTagIdRef.current = targetTagId;
    }
  };
  
  const handleDragLeaveTag = (e: React.DragEvent<HTMLDivElement>) => {
      dragOverTagIdRef.current = null;
  };

  const handleDropTag = (e: React.DragEvent<HTMLDivElement>, targetTagId: string) => {
    e.preventDefault();
    if (!draggingTagId || !selectedGroup) return;
    if (draggingTagId === targetTagId) return;

    const currentTags = selectedGroup.tags || [];
    const draggedIndex = currentTags.findIndex(t => t.id === draggingTagId);
    const targetIndex = currentTags.findIndex(t => t.id === targetTagId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newTags = [...currentTags];
    const [draggedItem] = newTags.splice(draggedIndex, 1);
    newTags.splice(targetIndex, 0, draggedItem);

    setConfigs(prevConfigs =>
      prevConfigs.map(group =>
        group.id === selectedGroupId ? { ...group, tags: newTags } : group
      )
    );
    setDraggingTagId(null);
    dragOverTagIdRef.current = null;
  };

  const handleDragEndTag = () => {
    setDraggingTagId(null);
    dragOverTagIdRef.current = null;
  };

  const handleSaveConfigs = async () => {
    setIsSaving(true);
    try {
      const configsToSave = configs.map((config, index) => ({
          ...config,
          sortOrder: index
      }));
      await onSave(configsToSave);
      // onOpenChange(false); Dialog is not closed from here anymore, parent does it on success.
    } catch (error) {
       toast({ title: "Error Saving Config (Dialog)", description: "An unexpected error occurred while trying to save.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportGroup = (groupToImport: CategoryTagGroupConfig) => {
      const newGroup: CategoryTagGroupConfig = {
        ...groupToImport,
        id: generateId(),
        sortOrder: configs.length,
        appliesToFiles: groupToImport.appliesToFiles || false,
        tags: (groupToImport.tags || []).map(t => ({...t, id: t.id || generateId()}))
      };
      setConfigs(prevConfigs => [...prevConfigs, newGroup]);
      setSelectedGroupId(newGroup.id);
      setIsImportGroupDialogOpen(false);
      toast({ title: "Group Imported", description: `Group "${newGroup.groupDisplayName}" has been imported as a copy.` });
  };

  const currentTagForPreview: TagInGroupConfig | undefined = editingTag ? {
    id: editingTag.id,
    name: tagEdit_Name,
    color: tagEdit_Color || undefined,
    text_color: tagEdit_TextColor || undefined,
    border_color: tagEdit_BorderColor || undefined,
    hover_bg_color: tagEdit_HoverBgColor || undefined,
    hover_text_color: tagEdit_HoverTextColor || undefined,
    hover_border_color: tagEdit_HoverBorderColor || undefined,
    icon_svg: tagEdit_IconSvg || undefined,
  } : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => {
        if (!openState && isSaving) {
            toast({title: "Info", description: "Saving in progress, please wait.", variant: "default"});
            return; 
        }
        if (!openState) { 
            setEditingTag(null);
            setCurrentEditingCategoryNameForDialog(null); 
            setIsGroupModalOpen(false);
        }
        onOpenChange(openState);
    }}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Configure Tags for Category: "{categoryName}"</DialogTitle>
          <DialogDescription>
            Define groups of tags, their styles, and if they apply to resource files.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-x-6 p-6 overflow-hidden">
          {/* Left Column: Group Management */}
          <div className="md:col-span-3 flex flex-col border-r pr-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-3 text-primary">Tag Groups</h3>
            <div className="mb-3 space-y-2">
              <Button onClick={handleOpenAddGroupModal} size="sm" className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Group
              </Button>
              <Button onClick={() => setIsImportGroupDialogOpen(true)} size="sm" variant="outline" className="w-full mt-1">
                <CopyPlus className="mr-2 h-4 w-4" /> Import Existing Group
              </Button>
            </div>
            
            <ScrollArea className="flex-grow">
              <ul className="space-y-1 pr-1">
                {configs.map((group, index) => (
                  <li
                    key={group.id}
                    className={cn(
                      "p-2 rounded-md flex items-center justify-between cursor-pointer hover:bg-muted/50 group/grouplist-item",
                      selectedGroupId === group.id && "bg-muted font-semibold",
                    )}
                    onClick={() => {
                        setSelectedGroupId(group.id); 
                        setEditingTag(null); 
                    }}
                  >
                    <span className="truncate flex-grow mr-1 flex items-center" title={group.groupDisplayName}>
                        {group.groupDisplayName}
                    </span>
                    <div className="flex items-center shrink-0 ml-2 opacity-0 group-hover/grouplist-item:opacity-100 focus-within:opacity-100">
                       <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleOpenEditGroupModal(group);}} title="Edit Group Details"><Edit2 className="h-3.5 w-3.5 text-blue-500" /></Button>
                       <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveGroup(group.id, 'up');}} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveGroup(group.id, 'down');}} disabled={index === configs.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id);}}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </li>
                ))}
                 {configs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No tag groups defined yet.</p>}
              </ul>
            </ScrollArea>
          </div>

          {/* Right Column: Tag Management for Selected Group */}
          <div className="md:col-span-9 flex flex-col overflow-hidden">
             {selectedGroup ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                        <h3 className="text-lg font-semibold text-primary">Manage Tags for "{selectedGroup.groupDisplayName}"</h3>
                        {selectedGroup.appliesToFiles && <Badge variant="secondary" className="ml-2 text-xs"><FileCheck2 className="h-3 w-3 mr-1"/>Applies to files</Badge>}
                    </div>
                </div>
                <div className="mb-3 flex items-center gap-2">
                    <Input
                        type="text"
                        placeholder="Enter tag name to add..."
                        value={addTagToGroupInputName}
                        onChange={(e) => setAddTagToGroupInputName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleDefineAndAddTagToGroup(addTagToGroupInputName); }
                        }}
                        className="h-9 text-sm flex-grow"
                    />
                    <Button onClick={() => handleDefineAndAddTagToGroup(addTagToGroupInputName)} size="sm" className="h-9" disabled={!addTagToGroupInputName.trim()} >
                        <TagIconLucide className="mr-2 h-4 w-4"/> Add & Edit Tag
                    </Button>
                </div>

                <h4 className="text-sm font-medium mb-1.5 text-foreground/80 mt-2">Selected & Ordered Tags:</h4>
                <ScrollArea className="border rounded-md p-2 bg-background/30 min-h-[150px] max-h-[200px] mb-4">
                    {(selectedGroup.tags || []).length > 0 ? (selectedGroup.tags || []).map((tag, index) => (
                        <div
                          key={tag.id}
                          className={cn(
                            "flex items-center justify-between py-1 hover:bg-muted/30 px-1 rounded-sm group/tagitem cursor-grab",
                            draggingTagId === tag.id && "opacity-50 bg-primary/20",
                            dragOverTagIdRef.current === tag.id && draggingTagId !== tag.id && "border-t-2 border-accent"
                          )}
                          draggable="true"
                          onDragStart={(e) => handleDragStartTag(e, tag)}
                          onDragOver={(e) => handleDragOverTag(e, tag.id)}
                          onDragLeave={handleDragLeaveTag}
                          onDrop={(e) => handleDropTag(e, tag.id)}
                          onDragEnd={handleDragEndTag}
                          title={`Drag to reorder: ${tag.name}`}
                        >
                            <GripVertical className="h-4 w-4 text-muted-foreground mr-1 opacity-50 group-hover/tagitem:opacity-100" />
                            <TagBadge tag={tag} className="mr-auto" />
                            <div className="flex items-center shrink-0 opacity-0 group-hover/tagitem:opacity-100 focus-within:opacity-100">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleStartEditTag(tag, selectedGroup.id)} title="Edit Tag Styles">
                                    <Palette className="h-3.5 w-3.5 text-blue-500"/>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveTagInGroup(tag.id, selectedGroup.id, 'up')} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveTagInGroup(tag.id, selectedGroup.id, 'down')} disabled={index === (selectedGroup.tags || []).length - 1}><ChevronDown className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveTagFromSelectedGroup(tag.id)}><Trash2 className="h-3.5 w-3.5 text-destructive/70 hover:text-destructive" /></Button>
                            </div>
                        </div>
                        )) : <p className="text-xs text-muted-foreground text-center py-2">No tags added to this group. Type a tag name above and click "Add".</p>}
                </ScrollArea>

                {editingTag && currentTagForPreview && (
                    <ScrollArea className="flex-grow border-t border-border/50 pt-4 mt-2">
                        <div className="p-1 space-y-3">
                            <h4 className="text-md font-semibold text-accent">Edit Styles for: {currentTagForPreview.name}</h4>
                             <div>
                                <Label htmlFor="tagNameEdit" className="text-xs">Tag Name (Display Only)</Label>
                                <Input id="tagNameEdit" value={tagEdit_Name} onChange={e => setTagEdit_Name(e.target.value)} disabled className="h-8 text-sm"/>
                            </div>
                            <div>
                                <Label htmlFor="tagPaletteSelect" className="text-xs">Apply Palette</Label>
                                <Select value={selectedPaletteName} onValueChange={applyPaletteToTagEditor}>
                                <SelectTrigger id="tagPaletteSelect" className="h-8 text-sm"><SelectValue placeholder="Select a palette..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_custom_">Custom Colors</SelectItem>
                                    {TAG_PALETTES.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                                </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div><Label className="text-xs">Base BG</Label><Input type="color" value={tagEdit_Color} onChange={e => setTagEdit_Color(e.target.value)} className="h-8 p-0.5" /><Input type="text" value={tagEdit_Color} onChange={e => setTagEdit_Color(e.target.value)} placeholder="#RRGGBB" className="mt-1 h-7 text-xs"/></div>
                                <div><Label className="text-xs">Base Text</Label><Input type="color" value={tagEdit_TextColor} onChange={e => setTagEdit_TextColor(e.target.value)} className="h-8 p-0.5"/><Input type="text" value={tagEdit_TextColor} onChange={e => setTagEdit_TextColor(e.target.value)} placeholder="#RRGGBB" className="mt-1 h-7 text-xs"/></div>
                                <div><Label className="text-xs">Base Border</Label><Input type="color" value={tagEdit_BorderColor} onChange={e => setTagEdit_BorderColor(e.target.value)} className="h-8 p-0.5" /><Input type="text" value={tagEdit_BorderColor} onChange={e => setTagEdit_BorderColor(e.target.value)} placeholder="#RRGGBB" className="mt-1 h-7 text-xs"/></div>
                                <div><Label className="text-xs">Hover BG</Label><Input type="color" value={tagEdit_HoverBgColor} onChange={e => setTagEdit_HoverBgColor(e.target.value)} className="h-8 p-0.5"/><Input type="text" value={tagEdit_HoverBgColor} onChange={e => setTagEdit_HoverBgColor(e.target.value)} placeholder="#RRGGBB" className="mt-1 h-7 text-xs"/></div>
                                <div><Label className="text-xs">Hover Text</Label><Input type="color" value={tagEdit_HoverTextColor} onChange={e => setTagEdit_HoverTextColor(e.target.value)} className="h-8 p-0.5"/><Input type="text" value={tagEdit_HoverTextColor} onChange={e => setTagEdit_HoverTextColor(e.target.value)} placeholder="#RRGGBB" className="mt-1 h-7 text-xs"/></div>
                                <div><Label className="text-xs">Hover Border</Label><Input type="color" value={tagEdit_HoverBorderColor} onChange={e => setTagEdit_HoverBorderColor(e.target.value)} className="h-8 p-0.5"/><Input type="text" value={tagEdit_HoverBorderColor} onChange={e => setTagEdit_HoverBorderColor(e.target.value)} placeholder="#RRGGBB" className="mt-1 h-7 text-xs"/></div>
                            </div>
                            <div>
                                <Label htmlFor="tagIconSvg" className="text-xs">Icon SVG (optional)</Label>
                                <Textarea id="tagIconSvg" value={tagEdit_IconSvg} onChange={e => setTagEdit_IconSvg(e.target.value)} placeholder='<svg>...</svg>' rows={2} className="text-xs"/>
                            </div>
                            <div className="mt-2 space-y-1">
                                <Label className="text-xs">Preview (Hover over it):</Label>
                                <div className="flex items-center gap-3 p-2 border rounded-md bg-muted/30">
                                  <TagBadge tag={currentTagForPreview} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-3">
                                <Button variant="outline" onClick={handleCancelTagEdit} size="sm">Cancel Style Edit</Button>
                                <Button onClick={handleApplyTagEdits} size="sm">Apply Styles to Tag</Button>
                            </div>
                        </div>
                    </ScrollArea>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select or create a group to manage its tags.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSaveConfigs} disabled={isSaving} className="button-primary-glow">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Add/Edit Group Modal */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{groupModalMode === 'edit' ? 'Edit Tag Group' : 'Add New Tag Group'}</DialogTitle>
            <DialogDescription>
              {groupModalMode === 'edit' ? `Update details for this group.` : 'Enter the name for the new group and specify if its tags can be applied to files.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="groupModalNameInput">Group Name</Label>
              <Input
                id="groupModalNameInput"
                value={groupModalNameInput}
                onChange={(e) => setGroupModalNameInput(e.target.value)}
                placeholder="e.g., File Types, Compatibility"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="groupModalAppliesToFilesInput"
                checked={groupModalAppliesToFilesInput}
                onCheckedChange={(checked) => setGroupModalAppliesToFilesInput(Boolean(checked))}
              />
              <Label htmlFor="groupModalAppliesToFilesInput" className="text-sm font-normal">
                Tags in this group can be applied to files
              </Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveGroupFromModal}>
                {groupModalMode === 'edit' ? 'Update Group' : 'Add Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {isImportGroupDialogOpen && (
        <ImportTagGroupDialog
          isOpen={isImportGroupDialogOpen}
          onOpenChange={setIsImportGroupDialogOpen}
          projectId={projectId}
          onImportGroup={handleImportGroup}
        />
      )}
    </Dialog>
  );
}
    
