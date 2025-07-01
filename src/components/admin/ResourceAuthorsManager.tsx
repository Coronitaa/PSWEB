
"use client";

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import type { Author, ResourceAuthor, UserAppRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Crown, UserPlus, Trash2, Edit, Save, Search, X, Check, UserCircle } from 'lucide-react';
import { searchUsers, addAuthor, removeAuthor, updateAuthorRole, transferOwnership } from '@/app/actions/clientWrappers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

interface ResourceAuthorsManagerProps {
  resourceId: string;
  initialAuthors: ResourceAuthor[];
  onAuthorsUpdate: (updatedAuthors: ResourceAuthor[]) => void;
}

interface MockUser {
    id: string;
    role: UserAppRole;
}

export function ResourceAuthorsManager({ resourceId, initialAuthors, onAuthorsUpdate }: ResourceAuthorsManagerProps) {
  const [authors, setAuthors] = useState<ResourceAuthor[]>(initialAuthors);
  const [isProcessing, startProcessingTransition] = useTransition();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Author[]>([]);
  const [isSearching, startSearchingTransition] = useTransition();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [editingAuthor, setEditingAuthor] = useState<ResourceAuthor | null>(null);
  const [roleDescriptionInput, setRoleDescriptionInput] = useState('');
  
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<ResourceAuthor | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserAppRole>('usuario');

  useEffect(() => {
    const storedUser = localStorage.getItem('mockUser');
    if(storedUser) {
        const user: MockUser = JSON.parse(storedUser);
        setCurrentUserId(user.id);
        setCurrentUserRole(user.role);
    }
  }, []);

  useEffect(() => {
    setAuthors(initialAuthors);
  }, [initialAuthors]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    startSearchingTransition(async () => {
      const result = await searchUsers(searchQuery);
      if (result.success && result.data) {
        setSearchResults(result.data.filter(user => !authors.some(a => a.id === user.id)));
      } else {
        setSearchResults([]);
      }
    });
  }, [searchQuery, authors]);

  const handleAuthorsUpdate = (updatedAuthors: ResourceAuthor[]) => {
    setAuthors(updatedAuthors);
    onAuthorsUpdate(updatedAuthors);
  };

  const handleAddAuthor = (user: Author) => {
    startProcessingTransition(async () => {
        const result = await addAuthor(resourceId, user.id);
        if (result.success && result.data) {
            handleAuthorsUpdate(result.data.authors);
            toast({ title: 'Author Added', description: `${user.name} is now a collaborator.` });
            setSearchQuery('');
            setSearchResults([]);
            setIsPopoverOpen(false);
        } else {
            toast({ title: 'Error', description: result.error || 'Failed to add author.', variant: 'destructive' });
        }
    });
  };
  
  const handleRemoveAuthor = (authorId: string) => {
    startProcessingTransition(async () => {
        const result = await removeAuthor(resourceId, authorId);
        if (result.success && result.data) {
            handleAuthorsUpdate(result.data.authors);
            toast({ title: 'Author Removed' });
        } else {
            toast({ title: 'Error', description: result.error || 'Failed to remove author.', variant: 'destructive' });
        }
    });
  };
  
  const handleStartEditRole = (author: ResourceAuthor) => {
      setEditingAuthor(author);
      setRoleDescriptionInput(author.roleDescription || '');
  };

  const handleSaveRole = () => {
    if (!editingAuthor) return;
    startProcessingTransition(async () => {
        const result = await updateAuthorRole(resourceId, editingAuthor.id, roleDescriptionInput);
        if (result.success && result.data) {
            handleAuthorsUpdate(result.data.authors);
            toast({ title: 'Role Updated' });
            setEditingAuthor(null);
        } else {
            toast({ title: 'Error', description: result.error || 'Failed to update role.', variant: 'destructive' });
        }
    });
  };

  const handleOpenTransferDialog = (author: ResourceAuthor) => {
      setTransferTarget(author);
      setIsTransferDialogOpen(true);
  }

  const handleConfirmTransfer = () => {
    if (!transferTarget) return;
    startProcessingTransition(async () => {
        const result = await transferOwnership(resourceId, transferTarget.id);
        if (result.success && result.data) {
            handleAuthorsUpdate(result.data.authors);
            toast({ title: 'Ownership Transferred', description: `${transferTarget.name} is now the creator.` });
            setIsTransferDialogOpen(false);
            setTransferTarget(null);
        } else {
            toast({ title: 'Error', description: result.error || 'Failed to transfer ownership.', variant: 'destructive' });
        }
    });
  };

  const creator = useMemo(() => authors.find(a => a.isCreator), [authors]);
  const collaborators = useMemo(() => authors.filter(a => !a.isCreator), [authors]);
  const canManage = useMemo(() => currentUserRole === 'admin' || currentUserRole === 'mod' || (creator && creator.id === currentUserId), [currentUserRole, currentUserId, creator]);

  return (
    <div className="space-y-4">
        {canManage && (
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search for users by @usertag to add..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <ScrollArea className="max-h-60">
                        {isSearching ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.avatarUrl || undefined} />
                                            <AvatarFallback><UserCircle className="w-4 h-4"/></AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">{user.name}</p>
                                            <p className="text-xs text-muted-foreground">{user.usertag}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={() => handleAddAuthor(user)} disabled={isProcessing}>
                                        <UserPlus className="h-4 w-4 mr-1"/> Add
                                    </Button>
                                </div>
                            ))
                        ) : searchQuery.length >= 2 ? (
                            <p className="p-4 text-center text-sm text-muted-foreground">No users found.</p>
                        ) : null}
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        )}
        <div className="space-y-3">
            {authors.map((author) => (
                <div key={author.id} className={cn("p-3 border rounded-md bg-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3", author.isCreator && "border-amber-400/50 bg-amber-400/5")}>
                     <div className="flex items-center gap-3 flex-grow">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={author.avatarUrl || undefined} />
                            <AvatarFallback><UserCircle className="w-6 h-6"/></AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold">{author.name}</p>
                                {author.isCreator && <Crown className="h-4 w-4 text-amber-500 fill-amber-400" />}
                            </div>
                            {editingAuthor?.id === author.id ? (
                                <div className="flex items-center gap-1 mt-1">
                                    <Input
                                        value={roleDescriptionInput}
                                        onChange={(e) => setRoleDescriptionInput(e.target.value)}
                                        className="h-8 text-xs"
                                        placeholder="e.g. Collaborator"
                                    />
                                    <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSaveRole} disabled={isProcessing}><Check className="w-4 h-4" /></Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingAuthor(null)}><X className="w-4 h-4" /></Button>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">{author.roleDescription || (author.isCreator ? 'Creator of this resource' : 'Collaborator')}</p>
                            )}
                        </div>
                    </div>
                    {canManage && (
                        <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
                            {!author.isCreator && (
                                <>
                                    <Button variant="ghost" size="sm" onClick={() => handleStartEditRole(author)} disabled={isProcessing}><Edit className="h-4 w-4 mr-1"/>Role</Button>
                                    <Separator orientation="vertical" className="h-6" />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={isProcessing}><Trash2 className="h-4 w-4 mr-1"/>Remove</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Remove {author.name}?</AlertDialogTitle>
                                                <AlertDialogDescription>Are you sure you want to remove this author? They will no longer be associated with this resource.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleRemoveAuthor(author.id)}>Remove</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                            {author.isCreator && collaborators.length > 0 && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" disabled={isProcessing}>Transfer Ownership</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Transfer Resource Ownership</DialogTitle>
                                            <DialogDescription>Select a new creator for this resource. This action is irreversible.</DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4 space-y-2">
                                            {collaborators.map(collab => (
                                                <Button key={collab.id} variant="outline" className="w-full justify-start h-auto" onClick={() => handleOpenTransferDialog(collab)}>
                                                     <Avatar className="h-8 w-8 mr-2"><AvatarImage src={collab.avatarUrl || undefined} /><AvatarFallback><UserCircle className="w-4 h-4"/></AvatarFallback></Avatar>
                                                     <div>
                                                        <p className="text-sm font-medium">{collab.name}</p>
                                                        <p className="text-xs text-muted-foreground text-left">{collab.usertag}</p>
                                                     </div>
                                                </Button>
                                            ))}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>

        {transferTarget && (
            <AlertDialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Transfer ownership to {transferTarget.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to make <span className="font-bold">{transferTarget.name}</span> the new creator of this resource.
                             You will become a regular author and lose all creator privileges, including the ability to edit this resource and manage authors. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setTransferTarget(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmTransfer} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
                            {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}
                            Yes, transfer ownership
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
    </div>
  );
}
    