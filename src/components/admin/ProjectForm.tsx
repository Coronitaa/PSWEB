
"use client";

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { GenericListItem, ItemType, Tag, ProjectFormData, ProjectStatus, SectionTagFormData } from '@/lib/types';
import { ITEM_TYPES_CONST, PROJECT_STATUSES_CONST, PROJECT_STATUS_NAMES, ITEM_TYPE_NAMES } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { saveProjectAction, deleteProjectAction, createSectionTagAction, updateSectionTagAction, deleteSectionTagAction } from '@/app/admin/actions';
import { useState, useTransition, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Save, Trash2, PlusCircle, Eye, Tags, Edit, XCircle } from 'lucide-react'; 
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area'; 

const projectFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").optional().or(z.literal('')),
  description: z.string().min(10, "Description must be at least 10 characters"),
  longDescription: z.string().optional(),
  bannerUrl: z.string().url("Must be a valid URL for banner image").optional().or(z.literal('')),
  iconUrl: z.string().url("Must be a valid URL for icon image").optional().or(z.literal('')),
  authorDisplayName: z.string().optional().or(z.literal('')),
  tagIds: z.array(z.string()).optional(), 
  projectUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  status: z.custom<ProjectStatus>((val) => PROJECT_STATUSES_CONST.includes(val as ProjectStatus), "Invalid project status"),
});


interface ProjectFormProps {
  initialData?: Partial<GenericListItem>;
  isNew: boolean;
  itemType: ItemType;
  availableSectionTags: Tag[]; 
}

export function ProjectForm({
  initialData,
  isNew,
  itemType,
  availableSectionTags: initialAvailableSectionTags, 
}: ProjectFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const [availableSectionTagsState, setAvailableSectionTagsState] = useState<Tag[]>(initialAvailableSectionTags);
  const [isManageTagsDialogOpen, setIsManageTagsDialogOpen] = useState(false);
  const [isTagActionPending, startTagActionTransition] = useTransition();
  const [editingTagForModal, setEditingTagForModal] = useState<Tag | null>(null);
  const [newTagNameInput, setNewTagNameInput] = useState('');
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);


  useEffect(() => {
    setAvailableSectionTagsState(initialAvailableSectionTags.sort((a,b) => a.name.localeCompare(b.name)));
  }, [initialAvailableSectionTags]);

  const defaultValues = useMemo(() => {
    return {
      name: initialData?.name || '',
      slug: initialData?.slug || '',
      description: initialData?.description || '',
      longDescription: initialData?.longDescription || '',
      bannerUrl: initialData?.bannerUrl || 'https://placehold.co/1200x400.png',
      iconUrl: initialData?.iconUrl || 'https://placehold.co/128x128.png',
      authorDisplayName: initialData?.authorDisplayName || '',
      tagIds: initialData?.tags?.map(t => t.id) || [], 
      projectUrl: initialData?.projectUrl || '',
      status: initialData?.status || 'draft',
    };
  }, [initialData]);

  const form = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [initialData, defaultValues, form]);


  const onSubmit = async (data: z.infer<typeof projectFormSchema>) => {
    startTransition(async () => {
      try {
        const formData: ProjectFormData = {
          ...data,
          itemType,
          slug: data.slug?.trim() === '' ? undefined : data.slug?.trim(),
          authorDisplayName: data.authorDisplayName?.trim() === '' ? undefined : data.authorDisplayName?.trim(),
          tagIds: data.tagIds || [], 
        };
        const result = await saveProjectAction(initialData?.id, formData, isNew);
        if (result.success && result.data?.project) {
          toast({ title: isNew ? "Project Created" : "Project Updated", description: `"${result.data.project.name}" has been saved.` });
          if (isNew) {
            router.push(`/admin/projects/${result.data.project.itemType}/${result.data.project.slug}/edit`);
          } else {
            router.refresh(); 
          }
        } else {
          toast({ title: "Error", description: result.error || "Failed to save project.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: (error as Error).message || "An unexpected error occurred.", variant: "destructive" });
      }
    });
  };

  const handleDeleteProject = async () => {
    if (!initialData?.id || isNew) return;
    startDeleteTransition(async () => {
      try {
        const result = await deleteProjectAction(initialData.id!);
        if (result.success) {
          toast({ title: "Project Deleted", description: `"${initialData.name}" has been deleted.` });
          router.push('/admin/projects');
          router.refresh();
        } else {
          toast({ title: "Error", description: result.error || "Failed to delete project.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: (error as Error).message || "An unexpected error occurred while deleting.", variant: "destructive" });
      }
    });
  };

  const handlePreview = () => {
    if (!isNew && initialData?.slug && initialData?.status === 'draft') {
      const basePath = itemType === 'art-music' ? 'art-music' : `${itemType}s`;
      setPreviewUrl(`/${basePath}/${initialData.slug}?preview=true`);
      setIsPreviewOpen(true);
    }
  };
  const isPreviewDisabled = isNew || !initialData?.slug || initialData?.status !== 'draft';

  // --- Section Tag Management Functions ---
  const handleCreateNewSectionTag = async () => {
    if (!newTagNameInput.trim()) {
      toast({ title: "Info", description: "Tag name cannot be empty.", variant: "default" });
      return;
    }
    startTagActionTransition(async () => {
      try {
        const result = await createSectionTagAction(itemType, newTagNameInput.trim());
        if (result.success && result.data) {
          toast({ title: "Tag Created", description: `Tag "${result.data.name}" added to the pool for ${ITEM_TYPE_NAMES[itemType]}.` });
          setAvailableSectionTagsState(prev => [...prev, result.data!].sort((a,b) => a.name.localeCompare(b.name)));
          const currentSelectedTagIds = form.getValues('tagIds') || [];
          form.setValue('tagIds', [...currentSelectedTagIds, result.data.id], { shouldDirty: true });
          setNewTagNameInput('');
        } else {
          toast({ title: "Error Creating Tag", description: result.error || "Failed to create tag.", variant: "destructive" });
        }
      } catch (e: any) {
        toast({ title: "Error", description: e.message || "Failed to create tag.", variant: "destructive" });
      }
    });
  };

  const handleOpenEditTagModal = (tag: Tag) => {
    setEditingTagForModal(tag);
    setNewTagNameInput(tag.name); 
  };

  const handleUpdateSectionTag = async () => {
    if (!editingTagForModal || !newTagNameInput.trim()) {
      toast({ title: "Info", description: "Tag or new name is missing.", variant: "default" });
      return;
    }
    startTagActionTransition(async () => {
      try {
        const result = await updateSectionTagAction(editingTagForModal.id, newTagNameInput.trim());
        if (result.success && result.data) {
          toast({ title: "Tag Updated", description: `Tag "${editingTagForModal.name}" updated to "${result.data.name}".` });
          setAvailableSectionTagsState(prev => 
            prev.map(t => t.id === result.data!.id ? result.data! : t).sort((a,b) => a.name.localeCompare(b.name))
          );
          setEditingTagForModal(null);
          setNewTagNameInput('');
        } else {
          toast({ title: "Error Updating Tag", description: result.error || "Failed to update tag.", variant: "destructive" });
        }
      } catch (e: any) {
        toast({ title: "Error", description: e.message || "Failed to update tag.", variant: "destructive" });
      }
    });
  };
  
  const handleOpenDeleteTagConfirm = (tag: Tag) => {
    setTagToDelete(tag);
  };

  const confirmDeleteSectionTag = async () => {
    if (!tagToDelete) return;
    startTagActionTransition(async () => {
        try {
            const result = await deleteSectionTagAction(tagToDelete.id);
            if (result.success) {
                toast({ title: "Tag Deleted", description: `Tag "${tagToDelete.name}" removed from the pool.` });
                setAvailableSectionTagsState(prev => prev.filter(t => t.id !== tagToDelete.id));
                const currentSelectedTagIds = form.getValues('tagIds') || [];
                if (currentSelectedTagIds.includes(tagToDelete.id)) {
                    form.setValue('tagIds', currentSelectedTagIds.filter(id => id !== tagToDelete.id), { shouldDirty: true });
                }
                setTagToDelete(null);
            } else {
                toast({ title: "Error Deleting Tag", description: result.error || "Failed to delete tag.", variant: "destructive" });
            }
        } catch (e: any) {
            toast({ title: "Error", description: e.message || "Failed to delete tag.", variant: "destructive" });
        }
    });
  };


  return (
    <>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card className="bg-card/80 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Fill in the information for this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="projectName">Name</Label>
              <Input id="projectName" {...form.register('name')} placeholder="My Awesome Project" />
              {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="projectSlug">Slug (URL-friendly identifier)</Label>
              <Input id="projectSlug" {...form.register('slug')} placeholder="Dejar en blanco para autogenerar" />
              {form.formState.errors.slug && <p className="text-xs text-destructive mt-1">{form.formState.errors.slug.message}</p>}
            </div>
          </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="authorDisplayName">Author/Creator Display Name (optional)</Label>
                <Input id="authorDisplayName" {...form.register('authorDisplayName')} placeholder="e.g., Microsoft, My Artist Name, etc." />
                {form.formState.errors.authorDisplayName && <p className="text-xs text-destructive mt-1">{form.formState.errors.authorDisplayName.message}</p>}
            </div>
            <div>
                <Label htmlFor="projectStatus">Project Status</Label>
                 <Controller
                    name="status"
                    control={form.control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <SelectTrigger id="projectStatus">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {PROJECT_STATUSES_CONST.map(statusVal => (
                                    <SelectItem key={statusVal} value={statusVal}>
                                        {PROJECT_STATUS_NAMES[statusVal]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                {form.formState.errors.status && <p className="text-xs text-destructive mt-1">{form.formState.errors.status.message}</p>}
            </div>
          </div>


          <div>
            <Label htmlFor="projectDescription">Short Description (for cards)</Label>
            <Textarea id="projectDescription" {...form.register('description')} placeholder="A brief summary of the project." />
            {form.formState.errors.description && <p className="text-xs text-destructive mt-1">{form.formState.errors.description.message}</p>}
          </div>

          <div>
            <Label htmlFor="projectLongDescription">Long Description (for project page, supports Markdown)</Label>
            <Textarea id="projectLongDescription" {...form.register('longDescription')} placeholder="Detailed information about the project..." rows={6} />
            {form.formState.errors.longDescription && <p className="text-xs text-destructive mt-1">{form.formState.errors.longDescription.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="bannerUrl">Banner Image URL</Label>
              <Input id="bannerUrl" {...form.register('bannerUrl')} placeholder="https://placehold.co/1200x400.png" />
              {form.formState.errors.bannerUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.bannerUrl.message}</p>}
            </div>
            <div>
              <Label htmlFor="iconUrl">Icon Image URL</Label>
              <Input id="iconUrl" {...form.register('iconUrl')} placeholder="https://placehold.co/128x128.png" />
              {form.formState.errors.iconUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.iconUrl.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="projectUrl">Project URL (External Link to live project/store/demo)</Label>
            <Input id="projectUrl" {...form.register('projectUrl')} placeholder="https://myproject.example.com" />
            {form.formState.errors.projectUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.projectUrl.message}</p>}
          </div>

          
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center"><Tags className="w-4 h-4 mr-2 text-primary" />Section Tags</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsManageTagsDialogOpen(true)}>
                    <Tags className="w-4 h-4 mr-1.5"/> Manage Section Tags
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Select tags that categorize this project within the '{ITEM_TYPE_NAMES[itemType]}' section.</p>
              <ScrollArea className="min-h-[6rem] max-h-[12rem] w-full rounded-md border p-3 bg-muted/30">
                {availableSectionTagsState.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {availableSectionTagsState.map(tag => (
                        <Controller
                        key={tag.id}
                        name="tagIds"
                        control={form.control}
                        render={({ field }) => {
                            const currentTagIds = field.value || [];
                            return (
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                id={`tag-${tag.id}`}
                                checked={currentTagIds.includes(tag.id)}
                                onCheckedChange={(checked) => {
                                    return checked
                                    ? field.onChange([...currentTagIds, tag.id])
                                    : field.onChange(currentTagIds.filter(id => id !== tag.id));
                                }}
                                />
                                <Label
                                htmlFor={`tag-${tag.id}`}
                                className="text-sm font-normal cursor-pointer"
                                >
                                {tag.name} 
                                </Label>
                            </div>
                            );
                        }}
                        />
                    ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">No section tags available for {ITEM_TYPE_NAMES[itemType]}. Add some via "Manage Section Tags".</p>
                )}
              </ScrollArea>
              {form.formState.errors.tagIds && <p className="text-xs text-destructive mt-1">{form.formState.errors.tagIds.message}</p>}
            </div>
          

        </CardContent>
        <CardFooter className="flex justify-between items-center border-t pt-6">
           <div className="flex gap-2">
            {!isNew && initialData?.id && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" type="button" disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the project
                            "{initialData.name}" and all its associated data (categories, resources, etc.).
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Yes, delete project
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
             {!isNew && (
                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" type="button" onClick={handlePreview} disabled={isPreviewDisabled}>
                            <Eye className="mr-2 h-4 w-4" /> Preview Draft
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col p-0">
                        <DialogHeader className="p-6 pb-2 border-b">
                            <DialogTitle>Project Preview: {initialData?.name}</DialogTitle>
                            <DialogDescription>
                                This is a live preview of your draft project. Unsaved changes are not reflected.
                                This content is not publicly listed but accessible via its direct URL.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-grow overflow-auto p-1">
                            {previewUrl ? (
                                <iframe src={previewUrl} className="w-full h-full border-0 rounded-md" title="Project Preview" />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-muted-foreground">Could not generate preview URL.</p>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="p-6 pt-4 border-t">
                            <Button type="button" variant="secondary" onClick={() => setIsPreviewOpen(false)}>
                                Close Preview
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
          </div>
          <Button type="submit" className="button-primary-glow" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" /> {isNew ? 'Create Project' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </form>

    {/* Dialog for Managing Section Tags */}
    <Dialog open={isManageTagsDialogOpen} onOpenChange={setIsManageTagsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Manage Section Tags for {ITEM_TYPE_NAMES[itemType]}</DialogTitle>
                <DialogDescription>
                    Add, edit, or remove tags from the available pool for this section.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                {/* Add/Edit Tag Form */}
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <Label htmlFor="newTagName" className="sr-only">Tag Name</Label>
                        <Input 
                            id="newTagName"
                            placeholder={editingTagForModal ? `Editing: ${editingTagForModal.name}` : "New tag name..."}
                            value={newTagNameInput}
                            onChange={(e) => setNewTagNameInput(e.target.value)}
                            disabled={isTagActionPending}
                        />
                    </div>
                    {editingTagForModal ? (
                        <Button onClick={handleUpdateSectionTag} disabled={isTagActionPending || !newTagNameInput.trim()}>
                            {isTagActionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Tag
                        </Button>
                    ) : (
                        <Button onClick={handleCreateNewSectionTag} disabled={isTagActionPending || !newTagNameInput.trim()}>
                            {isTagActionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Tag
                        </Button>
                    )}
                    {editingTagForModal && (
                        <Button variant="ghost" onClick={() => { setEditingTagForModal(null); setNewTagNameInput(''); }} disabled={isTagActionPending}>
                            Cancel Edit
                        </Button>
                    )}
                </div>

                {/* List of Existing Tags */}
                <ScrollArea className="min-h-[10rem] max-h-[20rem] border rounded-md p-2 bg-muted/20">
                    {availableSectionTagsState.length > 0 ? (
                        availableSectionTagsState.map(tag => (
                            <div key={tag.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/50 rounded">
                                <span className="text-sm">{tag.name}</span>
                                <div className="space-x-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditTagModal(tag)} disabled={isTagActionPending}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDeleteTagConfirm(tag)} disabled={isTagActionPending}>
                                                <XCircle className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        {tagToDelete && tagToDelete.id === tag.id && (
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Tag: "{tagToDelete.name}"?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will remove the tag from the pool for {ITEM_TYPE_NAMES[itemType]} and deselect it from all projects using it. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel onClick={() => setTagToDelete(null)}>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={confirmDeleteSectionTag} className="bg-destructive hover:bg-destructive/90" disabled={isTagActionPending}>
                                                        {isTagActionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Yes, Delete Tag
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        )}
                                    </AlertDialog>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">No tags defined for this section yet.</p>
                    )}
                </ScrollArea>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
    

