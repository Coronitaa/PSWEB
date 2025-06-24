
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import type { Author as UserProfile, ProfileUpdateFormData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from '@/app/actions/clientWrappers';
import { Loader2, Save, Github, Twitter, Globe, Linkedin, MessageCircle, User, ImageIcon, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name cannot exceed 50 characters."),
  bio: z.string().max(500, "Bio cannot exceed 500 characters.").optional(),
  avatarUrl: z.string().url("Must be a valid URL for avatar.").optional().or(z.literal('')),
  bannerUrl: z.string().url("Must be a valid URL for banner.").optional().or(z.literal('')),
  socialLinks: z.object({
    github: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
    twitter: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
    website: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
    linkedin: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
    discord: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
  }).optional(),
});

interface EditProfileModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImagePreview = ({ watchUrl, alt, fallbackText, className }: { watchUrl?: string; alt: string; fallbackText: string; className?: string }) => {
    const [isValidImage, setIsValidImage] = useState(false);

    useEffect(() => {
        if (watchUrl) {
            const img = new window.Image();
            img.src = watchUrl;
            img.onload = () => setIsValidImage(true);
            img.onerror = () => setIsValidImage(false);
        } else {
            setIsValidImage(false);
        }
    }, [watchUrl]);

    return (
        <div className={cn("relative mt-2 flex items-center justify-center rounded-md border border-dashed bg-muted/50 text-muted-foreground", className)}>
            {isValidImage && watchUrl ? (
                <Image src={watchUrl} alt={alt} fill style={{ objectFit: 'cover' }} className="rounded-md" />
            ) : (
                <span className="p-4 text-xs text-center">{fallbackText}</span>
            )}
        </div>
    );
};


export function EditProfileModal({ profile, isOpen, onOpenChange }: EditProfileModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile.name || '',
      bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '',
      bannerUrl: profile.bannerUrl || '',
      socialLinks: {
        github: profile.socialLinks?.github || '',
        twitter: profile.socialLinks?.twitter || '',
        website: profile.socialLinks?.website || '',
        linkedin: profile.socialLinks?.linkedin || '',
        discord: profile.socialLinks?.discord || '',
      }
    },
  });

  const watchedAvatarUrl = useWatch({ control: form.control, name: 'avatarUrl' });
  const watchedBannerUrl = useWatch({ control: form.control, name: 'bannerUrl' });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: profile.name || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
        bannerUrl: profile.bannerUrl || '',
        socialLinks: {
            github: profile.socialLinks?.github || '',
            twitter: profile.socialLinks?.twitter || '',
            website: profile.socialLinks?.website || '',
            linkedin: profile.socialLinks?.linkedin || '',
            discord: profile.socialLinks?.discord || '',
        }
      });
    }
  }, [isOpen, profile, form]);

  const onSubmit = async (data: z.infer<typeof profileFormSchema>) => {
    setIsSubmitting(true);
    try {
      const formData: ProfileUpdateFormData = {
        name: data.name,
        bio: data.bio || undefined,
        avatarUrl: data.avatarUrl || undefined,
        bannerUrl: data.bannerUrl || undefined,
        socialLinks: data.socialLinks,
      };
      
      const result = await updateProfile(formData);

      if (result.success && result.data?.profile) {
        toast({ title: "Profile Updated", description: "Your changes have been saved." });
        
        // Sync with localStorage for the header to pick up changes
        localStorage.setItem('mockUser', JSON.stringify(result.data.profile));
        window.dispatchEvent(new StorageEvent('storage', { 
            key: 'mockUser', 
            newValue: JSON.stringify(result.data.profile) 
        }));

        onOpenChange(false);
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error || "Failed to update profile.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b shrink-0">
          <DialogTitle className="text-xl">Edit Your Profile</DialogTitle>
          <DialogDescription>
            Update your public information. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow contents">
            <Tabs defaultValue="general" className="flex-grow flex flex-col overflow-hidden">
                <div className="px-6 pt-4 shrink-0">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                        <TabsTrigger value="general"><User className="w-4 h-4 mr-2" />General</TabsTrigger>
                        <TabsTrigger value="images"><ImageIcon className="w-4 h-4 mr-2" />Images</TabsTrigger>
                        <TabsTrigger value="links"><LinkIcon className="w-4 h-4 mr-2" />Links</TabsTrigger>
                    </TabsList>
                </div>
                <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4">
                    <TabsContent value="general" className="space-y-4 m-0">
                        <div>
                            <Label htmlFor="name">Display Name</Label>
                            <Input id="name" {...form.register('name')} disabled={isSubmitting}/>
                            {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea id="bio" {...form.register('bio')} rows={6} placeholder="Tell us a little about yourself..." disabled={isSubmitting}/>
                            {form.formState.errors.bio && <p className="text-xs text-destructive mt-1">{form.formState.errors.bio.message}</p>}
                        </div>
                    </TabsContent>
                    <TabsContent value="images" className="space-y-4 m-0">
                         <div>
                            <Label htmlFor="avatarUrl">Avatar URL</Label>
                            <Input id="avatarUrl" {...form.register('avatarUrl')} placeholder="https://..." disabled={isSubmitting}/>
                            {form.formState.errors.avatarUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.avatarUrl.message}</p>}
                            <ImagePreview watchUrl={watchedAvatarUrl} alt="Avatar Preview" fallbackText="Avatar Preview" className="w-24 h-24 rounded-full"/>
                        </div>
                        <div>
                            <Label htmlFor="bannerUrl">Banner URL</Label>
                            <Input id="bannerUrl" {...form.register('bannerUrl')} placeholder="https://..." disabled={isSubmitting}/>
                            {form.formState.errors.bannerUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.bannerUrl.message}</p>}
                            <ImagePreview watchUrl={watchedBannerUrl} alt="Banner Preview" fallbackText="Banner Preview" className="w-full aspect-[16/9]"/>
                        </div>
                    </TabsContent>
                    <TabsContent value="links" className="space-y-3 m-0">
                        <div className="relative">
                            <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...form.register('socialLinks.github')} placeholder="GitHub URL" className="pl-9" disabled={isSubmitting}/>
                            {form.formState.errors.socialLinks?.github && <p className="text-xs text-destructive mt-1">{form.formState.errors.socialLinks.github.message}</p>}
                        </div>
                        <div className="relative">
                            <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...form.register('socialLinks.twitter')} placeholder="Twitter/X URL" className="pl-9" disabled={isSubmitting}/>
                            {form.formState.errors.socialLinks?.twitter && <p className="text-xs text-destructive mt-1">{form.formState.errors.socialLinks.twitter.message}</p>}
                        </div>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...form.register('socialLinks.website')} placeholder="Website URL" className="pl-9" disabled={isSubmitting}/>
                             {form.formState.errors.socialLinks?.website && <p className="text-xs text-destructive mt-1">{form.formState.errors.socialLinks.website.message}</p>}
                        </div>
                         <div className="relative">
                            <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...form.register('socialLinks.linkedin')} placeholder="LinkedIn URL" className="pl-9" disabled={isSubmitting}/>
                            {form.formState.errors.socialLinks?.linkedin && <p className="text-xs text-destructive mt-1">{form.formState.errors.socialLinks.linkedin.message}</p>}
                        </div>
                         <div className="relative">
                            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input {...form.register('socialLinks.discord')} placeholder="Discord Invite URL" className="pl-9" disabled={isSubmitting}/>
                             {form.formState.errors.socialLinks?.discord && <p className="text-xs text-destructive mt-1">{form.formState.errors.socialLinks.discord.message}</p>}
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
            <DialogFooter className="p-6 pt-4 border-t shrink-0">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="button-primary-glow">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                Save Changes
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
