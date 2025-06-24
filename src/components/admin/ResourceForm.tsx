
"use client";

import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import type { Resource, ItemType, ResourceFormData, DynamicAvailableFilterTags, ProjectStatus, ResourceLinks, DynamicTagSelection, UserAppRole, FileChannelId, ResourceFileFormData, TagInGroupConfig, ResourceFile, Tag } from '@/lib/types';
import { PROJECT_STATUSES_CONST, PROJECT_STATUS_NAMES, FILE_CHANNELS } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { saveResource, deleteResource } from '@/app/actions/clientWrappers';
import { useState, useTransition, useEffect, useMemo } from 'react';
import { Loader2, Save, Trash2, Link as LinkIconLucide, PlusCircle, Image as ImageIcon, ListChecks, FileText, Info, ExternalLink, Sparkles, X, Check, Archive, FileUp, Tags, Edit2, GripVertical, CalendarDays, ChevronUp, ChevronDown } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { TagBadge } from '@/components/shared/TagBadge';
import { cn } from '@/lib/utils';
import { mapConfigToTagInterface, formatTimeAgo, getItemTypePlural } from '@/lib/utils';
import Image from 'next/image';
import { ImageGalleryCarousel } from '../shared/ImageGalleryCarousel';

const CLEAR_SELECTION_VALUE = "__CLEAR_SELECTION__";

const resourceFileSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "File name is required"),
  url: z.string().min(1, "File URL is required").url("File URL must be a valid URL"),
  versionName: z.string().min(1, "File version name is required (e.g., 1.0.0, Beta 1)"),
  size: z.string().optional(),
  channelId: z.string().nullable().optional(),
  changelogNotes: z.string().optional(),
  selectedFileTags: z.record(z.array(z.string())).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});


const resourceFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").optional().or(z.literal('')),
  version: z.string().min(1, "Overall resource version is required"),
  description: z.string().min(10, "Short description must be at least 10 characters"),
  detailedDescription: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL for main image").optional().or(z.literal('')),
  imageGallery: z.array(z.object({
    value: z.string().url({ message: "Please enter a valid URL." }).min(1, "URL cannot be empty.")
  })).optional(),
  requirements: z.string().optional(),
  status: z.custom<ProjectStatus>((val) => PROJECT_STATUSES_CONST.includes(val as ProjectStatus), "Invalid project status"),
  links: z.object({
    discord: z.string().url().optional().or(z.literal('')),
    wiki: z.string().url().optional().or(z.literal('')),
    issues: z.string().url().optional().or(z.literal('')),
    source: z.string().url().optional().or(z.literal('')),
    projectUrl: z.string().url().optional().or(z.literal('')),
  }).optional(),
  files: z.array(resourceFileSchema).min(0),
  selectedDynamicTags: z.record(z.array(z.string())).optional(),
});

type FormValues = z.infer<typeof resourceFormSchema>;

interface ResourceFormProps {
  initialData?: Resource;
  isNew: boolean;
  itemType: ItemType;
  projectSlug: string;
  categorySlug: string;
  parentItemId: string;
  categoryId: string;
  dynamicTagGroups: DynamicAvailableFilterTags;
  onSuccess?: () => void;
}

interface MockUserForRole {
  usertag: string;
  name: string;
  role: UserAppRole;
}

const ImagePreview = ({ watchUrl, alt, fallbackText, className }: { watchUrl?: string; alt: string; fallbackText: string; className?: string }) => {
    const [isValidImage, setIsValidImage] = useState(false);

    useEffect(() => {
        if (watchUrl && watchUrl.startsWith('http')) {
            const img = new window.Image();
            img.src = watchUrl;
            img.onload = () => setIsValidImage(true);
            img.onerror = () => setIsValidImage(false);
        } else {
            setIsValidImage(false);
        }
    }, [watchUrl]);

    return (
        <div className={cn("relative flex items-center justify-center rounded-md border border-dashed bg-muted/50 text-muted-foreground", className)}>
            {isValidImage && watchUrl ? (
                <Image src={watchUrl} alt={alt} fill style={{ objectFit: 'cover' }} className="rounded-md" />
            ) : (
                <span className="p-4 text-xs text-center">{fallbackText}</span>
            )}
        </div>
    );
};

export function ResourceForm({
  initialData,
  isNew,
  itemType,
  projectSlug,
  categorySlug,
  parentItemId,
  categoryId,
  dynamicTagGroups,
  onSuccess,
}: ResourceFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, startSavingTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [currentUserRole, setCurrentUserRole] = useState<UserAppRole>('usuario');
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);

  const [draggingImageIndex, setDraggingImageIndex] = useState<number | null>(null);

  const defaultNewFileModalValues: ResourceFileFormData = useMemo(() => ({
    name: 'New File',
    url: 'https://example.com/newfile.zip',
    versionName: '1.0.0',
    size: undefined,
    channelId: null,
    changelogNotes: '',
    selectedFileTags: {},
    id: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  }), []);

  const [currentFileModalData, setCurrentFileModalData] = useState<ResourceFileFormData>(defaultNewFileModalValues);


  useEffect(() => {
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser) {
      try {
        const user: MockUserForRole = JSON.parse(storedUser);
        setCurrentUserRole(user.role);
      } catch (e) { console.error("Failed to parse mockUser for role", e); }
    }
    setIsLoadingRole(false);
  }, []);

  const defaultValues = useMemo(() => {
    if (isNew) {
      return {
        name: '',
        slug: '',
        version: '1.0.0',
        description: '',
        detailedDescription: '',
        imageUrl: 'https://placehold.co/800x450.png',
        imageGallery: [],
        requirements: '',
        status: 'published' as ProjectStatus,
        links: { discord: '', wiki: '', issues: '', source: '', projectUrl: '' },
        files: [],
        selectedDynamicTags: {},
      };
    }

    const initialFilesFormData: ResourceFileFormData[] =
      initialData?.files
        ?.filter((file): file is ResourceFile => !!file && typeof file === 'object')
        .map((f): ResourceFileFormData => ({
            id: typeof f.id === 'string' ? f.id : undefined,
            name: typeof f.name === 'string' ? f.name : 'Default Name',
            url: typeof f.url === 'string' ? f.url : 'https://example.com/default.zip',
            versionName: typeof f.versionName === 'string' && f.versionName.length > 0 ? f.versionName : '1.0.0',
            size: (typeof f.size === 'string' && f.size.trim() !== '') ? f.size.trim() : undefined,
            channelId: typeof f.channelId === 'string' ? f.channelId : null,
            changelogNotes: typeof f.changelogNotes === 'string' ? f.changelogNotes : '',
            selectedFileTags: (f.selectedFileTags && typeof f.selectedFileTags === 'object' && !Array.isArray(f.selectedFileTags)) ? f.selectedFileTags : {},
            createdAt: typeof f.createdAt === 'string' ? f.createdAt : undefined,
            updatedAt: typeof f.updatedAt === 'string' ? f.updatedAt : undefined,
          })) || [];


    let initialResourceSelectedDynamicTags: DynamicTagSelection = {};
    if (initialData?.selectedDynamicTagsJson) {
      try {
        const parsed = JSON.parse(initialData.selectedDynamicTagsJson);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          initialResourceSelectedDynamicTags = parsed;
        }
      } catch (e) { console.error("Failed to parse selectedDynamicTagsJson for resource form", e); }
    }

    return {
      name: initialData?.name || '',
      slug: initialData?.slug || '',
      version: initialData?.version || '1.0.0',
      description: initialData?.description || '',
      detailedDescription: initialData?.detailedDescription || '',
      imageUrl: initialData?.imageUrl || 'https://placehold.co/800x450.png',
      imageGallery: initialData?.imageGallery?.map(url => ({ value: url })) || [],
      requirements: initialData?.requirements || '',
      status: initialData?.status || 'draft',
      links: {
        discord: initialData?.links?.discord || '',
        wiki: initialData?.links?.wiki || '',
        issues: initialData?.links?.issues || '',
        source: initialData?.links?.source || '',
        projectUrl: initialData?.links?.projectUrl || '',
      },
      files: initialFilesFormData,
      selectedDynamicTags: initialResourceSelectedDynamicTags,
    };
  }, [initialData, isNew]);


  const form = useForm<FormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const { fields: fileFields, append: appendFile, remove: removeFile, update: updateFile } = useFieldArray({
    control: form.control,
    name: "files",
  });

  const { fields: galleryFields, append: appendGalleryField, remove: removeGalleryField, move: moveGalleryField } = useFieldArray({
    control: form.control,
    name: "imageGallery",
  });

  const stringifiedDefaultValues = JSON.stringify(defaultValues);
  useEffect(() => {
    form.reset(defaultValues);
  }, [stringifiedDefaultValues, form]);

  const watchedImageUrl = useWatch({ control: form.control, name: 'imageUrl' });
  const watchedGallery = useWatch({ control: form.control, name: 'imageGallery' });

  const galleryImagesForPreview = useMemo(() => {
    return watchedGallery?.map(item => item.value).filter(url => url && url.startsWith('http')) || [];
  }, [watchedGallery]);


  const onSubmit = async (data: FormValues) => {
    if (data.status === 'published') {
      const totalSelectedTags = Object.values(data.selectedDynamicTags || {}).reduce((acc, tagsArray) => acc + (tagsArray?.length || 0), 0);
      if (totalSelectedTags < 2) {
        toast({ title: "Validation Error", description: "At least 2 tags must be selected to publish a resource.", variant: "destructive" });
        form.control.setError('selectedDynamicTags.root', { type: 'custom', message: 'Select at least 2 tags to publish.' });
        return;
      }
      if (data.files.length === 0) {
        toast({ title: "Validation Error", description: "At least one file version must be provided to publish.", variant: "destructive" });
        form.control.setError('files.root', { type: 'custom', message: 'Add at least one file version to publish.' });
        return;
      }
    }

    startSavingTransition(async () => {
      try {
        const resourceFormData: ResourceFormData = {
          ...data, 
          imageGallery: data.imageGallery?.map(item => item.value) || [],
          selectedDynamicTags: data.selectedDynamicTags || {},
          files: data.files.map(f => ({
            ...f,
            channelId: f.channelId === CLEAR_SELECTION_VALUE ? null : (f.channelId || null),
            size: (f.size && typeof f.size === 'string' && f.size.trim() !== '') ? f.size.trim() : undefined,
            selectedFileTags: f.selectedFileTags || {}
          }))
        };
        const result = await saveResource(initialData?.id, resourceFormData, isNew, parentItemId, categoryId, initialData?.authorId);
        if (result.success && result.data?.resource) {
          toast({ title: isNew ? "Resource Created" : "Resource Updated", description: `"${result.data.resource.name}" has been saved.` });
          if (onSuccess) onSuccess();
          else if (isNew && (result.data.resource.status === 'draft' || (currentUserRole !== 'admin' && currentUserRole !== 'mod'))) router.push(`/admin/projects/${itemType}/${projectSlug}/categories/${categorySlug}/resources/${result.data.resource.slug}/edit`);
          else if (isNew && result.data.resource.status === 'published') router.push(`/${getItemTypePlural(itemType)}/${projectSlug}/${categorySlug}/${result.data.resource.slug}`);
          else router.refresh();
        } else {
          toast({ title: "Error", description: result.error || "Failed to save resource.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: (error as Error).message || "An unexpected error occurred.", variant: "destructive" });
      }
    });
  };

  const handleDeleteResource = async () => {
    if (!initialData?.id || isNew) return;
    startDeleteTransition(async () => {
      try {
        const result = await deleteResource(initialData.id!);
        if (result.success) {
          toast({ title: "Resource Deleted", description: `"${initialData.name}" has been deleted.` });
          if (onSuccess) onSuccess();
          else { router.push(`/admin/projects/${itemType}/${projectSlug}/edit#categories`); router.refresh(); }
        } else {
          toast({ title: "Error", description: result.error || "Failed to delete resource.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: (error as Error).message || "An unexpected error occurred while deleting.", variant: "destructive" });
      }
    });
  };

  const openNewFileDialog = () => {
    setCurrentFileModalData({
        ...defaultNewFileModalValues,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
    });
    setEditingFileIndex(null);
    setIsFileModalOpen(true);
  };

  const openEditFileDialog = (index: number) => {
    const fileToEdit = form.getValues(`files.${index}`);
    setCurrentFileModalData({
      ...fileToEdit,
      size: (fileToEdit.size === null || fileToEdit.size?.trim() === '') ? undefined : fileToEdit.size,
      channelId: fileToEdit.channelId === null ? null : (fileToEdit.channelId || undefined),
      changelogNotes: fileToEdit.changelogNotes || '',
      selectedFileTags: fileToEdit.selectedFileTags || {},
      createdAt: fileToEdit.createdAt,
      updatedAt: fileToEdit.updatedAt,
    });
    setEditingFileIndex(index);
    setIsFileModalOpen(true);
  };

  const handleSaveFileFromDialog = () => {
    try {
        const fileDataToValidate = {
            ...currentFileModalData,
            name: currentFileModalData.name,
            url: currentFileModalData.url,
            versionName: currentFileModalData.versionName,
            size: currentFileModalData.size,
            channelId: currentFileModalData.channelId === CLEAR_SELECTION_VALUE ? null : (currentFileModalData.channelId),
            changelogNotes: currentFileModalData.changelogNotes,
            selectedFileTags: currentFileModalData.selectedFileTags || {},
        };
        resourceFileSchema.parse(fileDataToValidate);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            let errorMessages = "Please correct the following issues in the file details:\\n";
            error.errors.forEach(err => {
                const fieldPath = err.path.join('.') || 'File Data';
                errorMessages += `- ${fieldPath}: ${err.message}\\n`;
            });
            toast({ title: "File Validation Error", description: errorMessages, variant: "destructive", duration: 7000 });
        } else {
            toast({ title: "File Error", description: "An unknown validation error occurred with file data.", variant: "destructive" });
        }
        return;
    }

    const fileDataToSave: ResourceFileFormData = {
      ...currentFileModalData,
      size: (currentFileModalData.size && typeof currentFileModalData.size === 'string' && currentFileModalData.size.trim() !== '') ? currentFileModalData.size.trim() : undefined,
      channelId: currentFileModalData.channelId === CLEAR_SELECTION_VALUE ? null : (currentFileModalData.channelId || null),
      changelogNotes: currentFileModalData.changelogNotes || '',
      selectedFileTags: currentFileModalData.selectedFileTags || {},
    };


    if (editingFileIndex !== null) {
      updateFile(editingFileIndex, fileDataToSave);
    } else {
      appendFile(fileDataToSave);
    }
    setIsFileModalOpen(false);
    setEditingFileIndex(null);
  };

  const handleFileModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentFileModalData(prev => ({
        ...prev,
        [name]: (name === 'size' && value.trim() === '') ? undefined : value
    }));
  };

  const handleFileModalChannelChange = (value: string | null) => {
    setCurrentFileModalData(prev => ({ ...prev, channelId: value === CLEAR_SELECTION_VALUE ? null : value }));
  };

  const handleFileModalTagToggle = (groupId: string, tagId: string) => {
    setCurrentFileModalData(prev => {
        const currentGroupTags = prev.selectedFileTags?.[groupId] || [];
        const newGroupTags = currentGroupTags.includes(tagId)
                            ? currentGroupTags.filter(id => id !== tagId)
                            : [...currentGroupTags, tagId];
        return {
            ...prev,
            selectedFileTags: {
                ...(prev.selectedFileTags || {}),
                [groupId]: newGroupTags.length > 0 ? newGroupTags : undefined,
            }
        };
    });
  };

  const handleImageDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggingImageIndex(index);
  };
  const handleImageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
  };
  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggingImageIndex !== null && draggingImageIndex !== targetIndex) {
      moveGalleryField(draggingImageIndex, targetIndex);
    }
    setDraggingImageIndex(null);
  };
  const handleImageDragEnd = () => {
    setDraggingImageIndex(null);
  };


  const fileApplicableTagGroups = dynamicTagGroups.filter(group => group.appliesToFiles);

  return (
    <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.error("Form validation errors:", JSON.stringify(errors, null, 2)))}>
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-6 bg-card-foreground/5 rounded-lg">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="visuals">Visuals</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
        </TabsList>

        <Card className="bg-card/80 backdrop-blur-sm shadow-lg border-none">
          <CardContent className="p-0">
            <TabsContent value="general" className="p-6 space-y-6">
              <CardTitle className="text-xl mb-4">Basic Information</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="name">Resource Name</Label>
                  <Input id="name" {...form.register('name')} />
                  {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" {...form.register('slug')} placeholder="auto-generated" />
                  {form.formState.errors.slug && <p className="text-xs text-destructive mt-1">{form.formState.errors.slug.message}</p>}
                </div>
                <div>
                  <Label htmlFor="version">Overall Version</Label>
                  <Input id="version" {...form.register('version')} />
                  {form.formState.errors.version && <p className="text-xs text-destructive mt-1">{form.formState.errors.version.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="description">Short Description</Label>
                <Textarea id="description" {...form.register('description')} />
                {form.formState.errors.description && <p className="text-xs text-destructive mt-1">{form.formState.errors.description.message}</p>}
              </div>
              {(!isLoadingRole && (currentUserRole === 'admin' || currentUserRole === 'mod')) && (
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Controller
                    name="status"
                    control={form.control}
                    render={({ field }) => (
                    <Select
                        onValueChange={(value) => field.onChange(value as ProjectStatus)}
                        value={field.value || 'draft'}
                    >
                        <SelectTrigger id="status"><SelectValue placeholder="Select status..."/></SelectTrigger>
                        <SelectContent>{PROJECT_STATUSES_CONST.map(sVal => <SelectItem key={sVal} value={sVal}>{PROJECT_STATUS_NAMES[sVal]}</SelectItem>)}</SelectContent>
                    </Select>
                    )}
                  />
                  {form.formState.errors.status && <p className="text-xs text-destructive mt-1">{form.formState.errors.status.message}</p>}
                </div>
              )}
              {form.formState.errors.selectedDynamicTags?.root && <p className="text-sm text-destructive mt-2 bg-destructive/10 p-2 rounded-md flex items-center"><Info className="w-4 h-4 mr-2"/>{form.formState.errors.selectedDynamicTags.root.message}</p>}
              {form.formState.errors.files?.root && <p className="text-sm text-destructive mt-2 bg-destructive/10 p-2 rounded-md flex items-center"><Info className="w-4 h-4 mr-2"/>{form.formState.errors.files.root.message}</p>}
            </TabsContent>

            <TabsContent value="details" className="p-6 space-y-6">
              <CardTitle className="text-xl mb-4">Detailed Information</CardTitle>
              <div><Label htmlFor="detailedDescription">Detailed Description (Markdown)</Label><Textarea id="detailedDescription" {...form.register('detailedDescription')} rows={10} /></div>
              {form.formState.errors.detailedDescription && <p className="text-xs text-destructive mt-1">{form.formState.errors.detailedDescription.message}</p>}
              <div><Label htmlFor="requirements">Requirements (Markdown)</Label><Textarea id="requirements" {...form.register('requirements')} rows={5} /></div>
              {form.formState.errors.requirements && <p className="text-xs text-destructive mt-1">{form.formState.errors.requirements.message}</p>}
            </TabsContent>

            <TabsContent value="visuals" className="p-6 space-y-6">
              <CardTitle className="text-xl mb-4 flex items-center"><ImageIcon className="w-5 h-5 mr-2 text-primary" />Visuals</CardTitle>
              
              <div className="space-y-2">
                  <Label htmlFor="imageUrl">Main Image URL</Label>
                  <Input id="imageUrl" {...form.register('imageUrl')} />
                  <ImagePreview watchUrl={watchedImageUrl} alt="Main Image Preview" fallbackText="Main Image Preview" className="w-full max-w-lg aspect-video mt-2" />
                  {form.formState.errors.imageUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.imageUrl.message}</p>}
              </div>

              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="space-y-2">
                      <Label>Image Gallery URLs</Label>
                       <Card className="p-2 bg-background/30 border-dashed">
                        <div className="space-y-2">
                          {galleryFields.map((field, index) => (
                            <div 
                              key={field.id}
                              draggable="true"
                              onDragStart={(e) => handleImageDragStart(e, index)}
                              onDragOver={handleImageDragOver}
                              onDrop={(e) => handleImageDrop(e, index)}
                              onDragEnd={handleImageDragEnd}
                              className={cn(
                                "flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 group cursor-grab",
                                draggingImageIndex === index && "opacity-50 bg-primary/20"
                              )}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                              <Input {...form.register(`imageGallery.${index}.value`)} placeholder="https://..." className="h-8"/>
                              <div className="flex gap-0.5 shrink-0">
                                <Button type="button" size="icon" variant="ghost" onClick={() => moveGalleryField(index, index - 1)} disabled={index === 0} className="h-7 w-7"><ChevronUp className="h-4 w-4" /></Button>
                                <Button type="button" size="icon" variant="ghost" onClick={() => moveGalleryField(index, index + 1)} disabled={index === galleryFields.length - 1} className="h-7 w-7"><ChevronDown className="h-4 w-4" /></Button>
                                <Button type="button" size="icon" variant="ghost" className="text-destructive/70 hover:text-destructive h-7 w-7" onClick={() => removeGalleryField(index)}><X className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendGalleryField({ value: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Image
                        </Button>
                      </Card>
                       {form.formState.errors.imageGallery && <p className="text-xs text-destructive mt-1">{form.formState.errors.imageGallery.message}</p>}
                  </div>
                  <div className="space-y-2">
                      <Label className="text-muted-foreground">Gallery Preview</Label>
                      <div className="mt-1 rounded-lg border bg-background/30 min-h-[185px] p-2">
                          <ImageGalleryCarousel images={galleryImagesForPreview} />
                      </div>
                  </div>
              </div>
            </TabsContent>

            <TabsContent value="files" className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <CardTitle className="text-xl flex items-center"><Archive className="w-5 h-5 mr-2 text-primary" />File Versions</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={openNewFileDialog} className="button-outline-glow"><FileUp className="mr-2 h-4 w-4" />Add File Version</Button>
                </div>
                {form.formState.errors.files?.root && <p className="text-sm text-destructive mb-2 bg-destructive/10 p-2 rounded-md flex items-center shrink-0"><Info className="w-4 h-4 mr-2"/>{form.formState.errors.files.root.message}</p>}
                {form.formState.errors.files?.message && <p className="text-xs text-destructive mt-1 shrink-0">{form.formState.errors.files.message}</p>}
                
                {fileFields.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4 flex-grow flex items-center justify-center">
                        No file versions added. Click "Add File Version" to start.
                    </div>
                ) : (
                    <div className="flex-grow min-h-0 overflow-y-auto max-h-[calc(80vh-320px)] pr-3 space-y-3">
                        {fileFields.map((field, index) => {
                        const fileData = form.watch(`files.${index}`);
                        const channelInfo = FILE_CHANNELS.find(c => c.id === fileData.channelId);
                        const channelColorStyle = channelInfo ? { borderColor: channelInfo.borderColor || channelInfo.color } : { borderColor: 'hsl(var(--border))' };

                        let displayTags: Tag[] = [];
                        if (fileData.selectedFileTags) {
                                for (const groupId in fileData.selectedFileTags) {
                                    const tagIdsInGroup = fileData.selectedFileTags[groupId];
                                    const groupConfig = fileApplicableTagGroups.find(g => g.id === groupId);
                                    if (groupConfig && tagIdsInGroup) {
                                        tagIdsInGroup.forEach(tagId => {
                                            const tagConfig = (groupConfig.tags || []).find(t => t.id === tagId);
                                            if (tagConfig) displayTags.push(mapConfigToTagInterface(tagConfig, groupConfig.displayName.toLowerCase().replace(/\s+/g, '-')));
                                        });
                                    }
                                }
                        }

                        return (
                        <Card key={field.id} className="p-3 bg-muted/40 shadow-sm hover:shadow-md transition-shadow border-l-4" style={channelColorStyle}>
                            <div className="flex items-start justify-between">
                            <div className="flex-grow space-y-0.5">
                                <p className="font-semibold text-foreground text-sm">{fileData.name}</p>
                                <p className="text-xs text-muted-foreground">Version: {fileData.versionName} {channelInfo ? `(${channelInfo.name})` : ''}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-xs sm:max-w-sm md:max-w-md">URL: {fileData.url}</p>
                                {fileData.createdAt && (
                                    <p className="text-xs text-muted-foreground flex items-center">
                                        <CalendarDays className="w-3 h-3 mr-1 text-accent/80"/> Added: {formatTimeAgo(fileData.createdAt)}
                                    </p>
                                )}
                                {displayTags.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                                        <Tags className="w-3 h-3 text-muted-foreground/80 mr-0.5"/>
                                        {displayTags.slice(0, 6).map(tag => <TagBadge key={tag.id} tag={tag} className="text-[9px] px-1 py-0" />)}
                                        {displayTags.length > 6 && <span className="text-[9px] text-muted-foreground ml-1">+{displayTags.length - 6} more</span>}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-1.5 shrink-0 ml-2">
                                <Button type="button" variant="ghost" size="icon" onClick={() => openEditFileDialog(index)} className="h-7 w-7 text-blue-500 hover:text-blue-400" title="Edit File"><Edit2 className="h-4 w-4" /></Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)} className="h-7 w-7 text-destructive/70 hover:text-destructive" title="Remove File"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            </div>
                        </Card>
                        );})}
                    </div>
                )}
            </TabsContent>

            <TabsContent value="tags" className="p-6 space-y-6">
              <CardTitle className="text-xl mb-4 flex items-center"><Sparkles className="w-5 h-5 mr-2 text-primary" />Resource Tags</CardTitle>
              {form.formState.errors.selectedDynamicTags?.root && <p className="text-sm text-destructive mb-2 bg-destructive/10 p-2 rounded-md flex items-center"><Info className="w-4 h-4 mr-2"/>{form.formState.errors.selectedDynamicTags.root.message}</p>}
              {dynamicTagGroups.length > 0 ? (
                <div className="p-4 border rounded-md bg-muted/30 space-y-4">
                  {dynamicTagGroups.map(group => (
                    <div key={group.id}>
                      <Controller name={`selectedDynamicTags.${group.id}`} control={form.control} defaultValue={[]} render={({ field }) => {
                        const selectedTagIdsForGroup = field.value || [];
                        return (
                          <div>
                            <Label className="text-sm font-medium">{group.displayName}</Label>
                            <div className="mt-2 flex flex-wrap gap-2 items-center">
                              {group.tags.map(tag => {
                                const isSelected = selectedTagIdsForGroup.includes(tag.id);
                                return (
                                  <button type="button" key={tag.id} onClick={() => field.onChange(isSelected ? selectedTagIdsForGroup.filter(id => id !== tag.id) : [...selectedTagIdsForGroup, tag.id])} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full" aria-pressed={isSelected}>
                                    <TagBadge tag={tag} className={cn("cursor-pointer transition-all", isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background opacity-100 shadow-md scale-105 bg-primary text-primary-foreground pl-2' : 'opacity-70 hover:opacity-100 active:scale-95 hover:ring-1 hover:ring-primary/50')} >
                                      {isSelected && <Check className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
                                    </TagBadge>
                                  </button>
                                );
                              })}
                              {group.tags.length === 0 && <p className="text-xs text-muted-foreground">No tags configured for this group.</p>}
                            </div>
                          </div>
                        );
                      }} />
                    </div>
                  ))}
                </div>
              ) : (<p className="text-sm text-muted-foreground">No tag groups configured for this resource's category.</p>)}
            </TabsContent>

            <TabsContent value="links" className="p-6 space-y-6">
              <CardTitle className="text-xl mb-4 flex items-center"><LinkIconLucide className="w-5 h-5 mr-2 text-primary" />External Links</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label htmlFor="links.discord">Discord URL</Label><Input id="links.discord" {...form.register('links.discord')} />{form.formState.errors.links?.discord && <p className="text-xs text-destructive mt-1">{form.formState.errors.links.discord.message}</p>}</div>
                <div><Label htmlFor="links.wiki">Wiki/Guide URL</Label><Input id="links.wiki" {...form.register('links.wiki')} />{form.formState.errors.links?.wiki && <p className="text-xs text-destructive mt-1">{form.formState.errors.links.wiki.message}</p>}</div>
                <div><Label htmlFor="links.issues">Issue Tracker URL</Label><Input id="links.issues" {...form.register('links.issues')} />{form.formState.errors.links?.issues && <p className="text-xs text-destructive mt-1">{form.formState.errors.links.issues.message}</p>}</div>
                <div><Label htmlFor="links.source">Source Code URL</Label><Input id="links.source" {...form.register('links.source')} />{form.formState.errors.links?.source && <p className="text-xs text-destructive mt-1">{form.formState.errors.links.source.message}</p>}</div>
                <div><Label htmlFor="links.projectUrl">Main Project/Resource Site</Label><Input id="links.projectUrl" {...form.register('links.projectUrl')} />{form.formState.errors.links?.projectUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.links.projectUrl.message}</p>}</div>
              </div>
            </TabsContent>
          </CardContent>

          <CardFooter className="flex justify-between items-center border-t border-border/20 pt-6 p-6">
            <div>
              {(!isLoadingRole && !isNew && initialData?.id && (currentUserRole === 'admin' || currentUserRole === 'mod')) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="destructive" type="button" disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Trash2 className="mr-2 h-4 w-4" />Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete Resource: {initialData.name}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. All associated files and data will be lost.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteResource} className="bg-destructive hover:bg-destructive/90">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <Button type="submit" className="button-primary-glow" disabled={isSaving || isLoadingRole}>{(isSaving || isLoadingRole) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Save className="mr-2 h-4 w-4" />{isNew ? 'Create Resource' : 'Save Changes'}</Button>
          </CardFooter>
        </Card>
      </Tabs>

      <Dialog open={isFileModalOpen} onOpenChange={(open) => { if (!open) setEditingFileIndex(null); setIsFileModalOpen(open); }}>
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{editingFileIndex !== null ? `Edit File: ${currentFileModalData.name || 'File'}` : 'Add New File Version'}</DialogTitle>
            <DialogDescription>Fill in the details for this file version.</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="general" className="flex flex-col flex-grow overflow-hidden pt-4 px-6">
            <TabsList className="grid w-full grid-cols-2 mb-4 shrink-0">
              <TabsTrigger value="general">General Details</TabsTrigger>
              <TabsTrigger value="tags">File Tags</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="flex-grow overflow-y-auto -mx-1 px-1">
              <div className="space-y-4 py-1">
                <div><Label htmlFor="modalFileName">File Display Name</Label><Input id="modalFileName" name="name" value={currentFileModalData.name} onChange={handleFileModalInputChange} /></div>
                <div><Label htmlFor="modalFileUrl">File URL</Label><Input id="modalFileUrl" name="url" value={currentFileModalData.url} onChange={handleFileModalInputChange} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label htmlFor="modalFileVersionName">Version String</Label><Input id="modalFileVersionName" name="versionName" value={currentFileModalData.versionName} onChange={handleFileModalInputChange} /></div>
                  <div><Label htmlFor="modalFileSize">File Size (optional)</Label><Input id="modalFileSize" name="size" value={currentFileModalData.size || ''} onChange={handleFileModalInputChange} /></div>
                </div>
                <div>
                  <Label htmlFor="modalFileChannelId">Channel</Label>
                  <Select value={currentFileModalData.channelId || CLEAR_SELECTION_VALUE} onValueChange={handleFileModalChannelChange}>
                    <SelectTrigger id="modalFileChannelId"><SelectValue placeholder="Select channel..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CLEAR_SELECTION_VALUE}>None (Default)</SelectItem>
                      {FILE_CHANNELS.map(channel => <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="modalFileChangelogNotes">Changelog Notes (Markdown)</Label><Textarea id="modalFileChangelogNotes" name="changelogNotes" value={currentFileModalData.changelogNotes || ''} onChange={handleFileModalInputChange} rows={4}/></div>
              </div>
            </TabsContent>

            <TabsContent value="tags" className="flex-grow overflow-y-auto -mx-1 px-1">
               <div className="space-y-3 py-1">
                {fileApplicableTagGroups.length > 0 ? (
                  <>
                    <Label className="text-sm font-medium text-primary flex items-center mb-1">
                      <Tags className="w-4 h-4 mr-1.5"/>File Specific Tags
                    </Label>
                    <div className="space-y-3">
                      {fileApplicableTagGroups.map(group => (
                        <div key={group.id} className="p-3 border rounded-md bg-muted/20">
                          <Label className="text-xs font-medium text-muted-foreground">{group.displayName}</Label>
                          <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                            {group.tags.map(tag => {
                              const isSelected = currentFileModalData.selectedFileTags?.[group.id]?.includes(tag.id);
                              return (
                                <button type="button" key={tag.id} onClick={() => handleFileModalTagToggle(group.id, tag.id)} className="focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-full" aria-pressed={!!isSelected}>
                                  <TagBadge tag={tag} className={cn("cursor-pointer transition-all text-[10px] px-2 py-0.5", isSelected ? 'ring-1 ring-primary ring-offset-background opacity-100 shadow-sm scale-105 bg-primary/20 border-primary/70 text-primary hover:bg-primary/30' : 'opacity-70 hover:opacity-100 active:scale-95 hover:ring-1 hover:ring-primary/30')}>
                                    {isSelected && <Check className="w-3 h-3 mr-1 shrink-0" />}
                                  </TagBadge>
                                </button>
                              );
                            })}
                            {group.tags.length === 0 && <p className="text-xs text-muted-foreground">No tags available in this group.</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No file-specific tag groups configured for this resource's category.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="p-6 pt-4 border-t mt-auto shrink-0">
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSaveFileFromDialog} className="button-primary-glow">Save File Details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
