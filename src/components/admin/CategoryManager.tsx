
"use client";

import type { Category, ItemType, CategoryFormData, Tag, CategoryTagGroupConfig } from '@/lib/types';
import { useState, useTransition, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Save, ChevronUp, ChevronDown, Loader2, TagsIcon, FileCheck2, Info, FolderArchive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveCategoryAction, deleteCategoryAction, updateCategoryOrderInMemoryAction } from '@/app/admin/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { CategoryTagConfigDialog } from './CategoryTagConfigDialog';


interface CategoryManagerProps {
  projectId: string;
  projectItemType: ItemType;
  initialCategories: Category[];
}

const categoryFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").optional().or(z.literal('')),
  description: z.string().optional(),
  sortOrder: z.coerce.number().int().min(-1).optional(),
});


export function CategoryManager({ projectId, projectItemType, initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories.sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
  const [isSavePending, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isOrderPending, startOrderTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategoryForForm, setEditingCategoryForForm] = useState<Category | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);

  const [isTagConfigOpen, setIsTagConfigOpen] = useState(false);
  const [categoryForTagConfig, setCategoryForTagConfig] = useState<Category | null>(null);
  
  useEffect(() => {
    setCategories(initialCategories.sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
  }, [initialCategories]);

  const form = useForm<z.infer<typeof categoryFormSchema>>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', slug: '', description: '', sortOrder: -1 },
  });

  const handleEditCategoryDetails = (category: Category) => {
    setEditingCategoryForForm(category);
    form.reset({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      sortOrder: category.sortOrder,
    });
    setIsCategoryFormOpen(true);
  };

  const handleAddNewCategory = () => {
    setEditingCategoryForForm(null);
    form.reset({ name: '', slug: '', description: '', sortOrder: -1 });
    setIsCategoryFormOpen(true);
  };

  const onSubmitCategoryDetails = async (data: z.infer<typeof categoryFormSchema>) => {
    startSaveTransition(async () => {
      const existingTagConfigs = editingCategoryForForm?.tagGroupConfigs || [];
      
      const categoryData: CategoryFormData = {
        name: data.name,
        description: data.description,
        parentItemId: projectId,
        slug: data.slug?.trim() === '' ? undefined : data.slug,
        sortOrder: data.sortOrder === undefined || data.sortOrder < 0 ? -1 : data.sortOrder,
        tagGroupConfigs: existingTagConfigs, 
      };

      try {
        const result = await saveCategoryAction(editingCategoryForForm?.id, categoryData, !editingCategoryForForm, projectItemType);
        if (result.success && result.data?.category) {
          toast({ title: editingCategoryForForm ? "Category Updated" : "Category Created", description: `"${result.data.category.name}" basic details saved.` });
          
          const updatedCategory = result.data.category;
          if (editingCategoryForForm) {
            setCategories(cats => cats.map(c => c.id === updatedCategory.id ? updatedCategory : c).sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
          } else {
            setCategories(cats => [...cats, updatedCategory].sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
          }
          setIsCategoryFormOpen(false);
        } else {
          toast({ title: "Error Saving Category", description: result.error || "Failed to save category.", variant: "destructive" });
        }
      } catch (error: any) {
        toast({ title: "Error Saving Category", description: error.message || "An unexpected error occurred.", variant: "destructive" });
      }
    });
  };

  const openDeleteDialog = (category: { id: string; name: string }) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!categoryToDelete) return;
    startDeleteTransition(async () => {
      try {
        const result = await deleteCategoryAction(categoryToDelete.id, projectId);
        if (result.success) {
          toast({ title: "Category Deleted", description: `Category "${categoryToDelete.name}" has been successfully deleted.` });
          setCategories(cats => cats.filter(c => c.id !== categoryToDelete.id));
        } else {
          toast({ title: "Error Deleting Category", description: result.error || "Failed to delete category.", variant: "destructive" });
        }
      } catch (error: any) {
        toast({ title: "Client Error During Deletion", description: error.message || "An unexpected error occurred.", variant: "destructive" });
      } finally {
        setIsDeleteDialogOpen(false);
        setCategoryToDelete(null);
      }
    });
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const categoryToMove = newCategories[index];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= newCategories.length) return;

    newCategories[index] = newCategories[swapIndex];
    newCategories[swapIndex] = categoryToMove;
    setCategories(newCategories);
  };

  const handleSaveOrder = async () => {
    startOrderTransition(async () => {
        const orderedIds = categories.map(c => c.id);
        try {
            const result = await updateCategoryOrderInMemoryAction(projectId, orderedIds);
            if (result.success) {
                toast({ title: "Category Order Saved", description: "The new order of categories has been saved." });
                router.refresh();
            } else {
                toast({ title: "Error Saving Order", description: result.error || "Failed to save category order.", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error Saving Order", description: error.message || "An unexpected error occurred while saving order.", variant: "destructive" });
        }
    });
  };

  const handleOpenTagConfig = (category: Category) => {
    setCategoryForTagConfig(category);
    setIsTagConfigOpen(true);
  };

  const handleSaveTagConfig = async (updatedConfigsFromDialog: CategoryTagGroupConfig[]) => {
    if (!categoryForTagConfig) return;
    
    // Ensure we are using a fresh copy of the configurations from the dialog.
    // Create new objects to avoid any potential stale references.
    const cleanUpdatedConfigs = updatedConfigsFromDialog.map(uc => ({
        ...uc,
        tags: (uc.tags || []).map(t => ({...t})) // Ensure tags are also new objects
    }));

    startSaveTransition(async () => {
        const categoryData: CategoryFormData = {
            name: categoryForTagConfig.name,
            description: categoryForTagConfig.description, // This is the text part of the description
            parentItemId: categoryForTagConfig.parentItemId,
            slug: categoryForTagConfig.slug,
            sortOrder: categoryForTagConfig.sortOrder,
            tagGroupConfigs: cleanUpdatedConfigs, // Pass the cleaned, updated configurations
        };
        try {
            const result = await saveCategoryAction(categoryForTagConfig.id, categoryData, false, projectItemType);
            if (result.success && result.data?.category) {
                toast({ title: "Tag Configuration Saved", description: `Configuration for "${result.data.category.name}" updated.` });
                const updatedCategory = result.data.category;
                setCategories(cats => cats.map(c => c.id === updatedCategory.id ? updatedCategory : c).sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
                setIsTagConfigOpen(false); 
                setCategoryForTagConfig(null);
            } else {
                toast({ title: "Error Saving Tag Configuration", description: result.error || "Failed to save.", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error Saving Tag Configuration", description: error.message || "An unexpected error occurred.", variant: "destructive" });
        }
    });
  };

  return (
    <>
    <Card className="mt-8 bg-card/80 backdrop-blur-sm shadow-lg" id="categories">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Manage Project Categories</CardTitle>
            <CardDescription>Define categories for this project. Use arrows to reorder. Configure resource tags per category.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveOrder} size="sm" variant="outline" disabled={isOrderPending || categories.length <=1}>
                {isOrderPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Save Order
            </Button>
            <Button onClick={handleAddNewCategory} size="sm" className="button-primary-glow">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {categories.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Tag Groups Info</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category, index) => {
                const totalTagGroupsCount = category.tagGroupConfigs?.length || 0;
                const fileApplicableGroupsCount = category.tagGroupConfigs?.filter(g => g.appliesToFiles).length || 0;
                return (
                <TableRow key={category.id}>
                  <TableCell className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCategory(index, 'up')} disabled={index === 0 || isOrderPending}>
                        <ChevronUp className="h-4 w-4" />
                    </Button>
                     <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCategory(index, 'down')} disabled={index === categories.length - 1 || isOrderPending}>
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{category.slug}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{category.description || '-'}</TableCell>
                  <TableCell className="text-xs">
                     {totalTagGroupsCount > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-muted-foreground flex items-center" title={`Total ${totalTagGroupsCount} tag groups defined for this category`}>
                           <FolderArchive className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70" />
                           Total: {totalTagGroupsCount} groups
                        </span>
                        <span className="text-primary/90 flex items-center mt-0.5" title={`${fileApplicableGroupsCount} groups are configured to be applicable to files`}>
                            <FileCheck2 className="h-3.5 w-3.5 mr-1.5" /> 
                            {fileApplicableGroupsCount} for files
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/70 italic">No tag groups</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenTagConfig(category)} title="Configure Category Resource Tags" className="h-8 w-8" disabled={isDeleting || isSavePending}>
                      <TagsIcon className="h-4 w-4 text-muted-foreground hover:text-accent" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditCategoryDetails(category)} title="Edit Category Details" className="h-8 w-8" disabled={isDeleting || isSavePending}>
                      <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog({ id: category.id, name: category.name })} title="Delete Category" className="h-8 w-8" disabled={isDeleting || isSavePending}>
                       <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-4">No categories defined for this project yet. Click "Add New Category" to start.</p>
        )}
      </CardContent>

      <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCategoryForForm ? 'Edit Category Details' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {editingCategoryForForm ? `Update basic details for ${editingCategoryForForm.name}.` : 'Create a new category for this project.'} Tag configurations are managed separately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmitCategoryDetails)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="catName">Name</Label>
              <Input id="catName" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="catSlug">Slug</Label>
              <Input id="catSlug" {...form.register('slug')} placeholder="Dejar en blanco para autogenerar" />
              {form.formState.errors.slug && <p className="text-xs text-destructive mt-1">{form.formState.errors.slug.message}</p>}
            </div>
            <div>
              <Label htmlFor="catDescription">Description (Text Only)</Label>
              <Textarea id="catDescription" {...form.register('description')} />
            </div>
             <div>
              <Label htmlFor="catSortOrder">Sort Order (optional, -1 for auto)</Label>
              <Input id="catSortOrder" type="number" {...form.register('sortOrder')} />
               {form.formState.errors.sortOrder && <p className="text-xs text-destructive mt-1">{form.formState.errors.sortOrder.message}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSavePending}>
                {isSavePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCategoryForForm ? 'Save Changes' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category
              "{categoryToDelete?.name || 'this category'}" and all its associated resources and tag configurations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isTagConfigOpen && categoryForTagConfig && (
        <CategoryTagConfigDialog
          isOpen={isTagConfigOpen}
          onOpenChange={(open) => {
            setIsTagConfigOpen(open);
            if (!open) setCategoryForTagConfig(null); 
          }}
          categoryName={categoryForTagConfig.name}
          initialConfigs={categoryForTagConfig.tagGroupConfigs || []}
          projectId={projectId}
          onSave={handleSaveTagConfig} 
        />
      )}
    </>
  );
}
    
  
