
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { Loader2, Save, Github, Twitter, Globe, Linkedin, MessageCircle, User, ImageIcon, Link as LinkIcon, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvatarEditor } from './AvatarEditor';
import { BannerEditor } from './BannerEditor';
import { Separator } from '../ui/separator';

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name cannot exceed 50 characters."),
  bio: z.string().max(500, "Bio cannot exceed 500 characters.").optional(),
  avatarUrl: z.string().optional().or(z.literal('')),
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

const ImagePreview = ({ watchUrl, alt, fallbackText, className, isAvatar = false }: { watchUrl?: string; alt: string; fallbackText: string; className?: string, isAvatar?: boolean }) => {
    const isValidSrc = watchUrl && (watchUrl.startsWith('http') || watchUrl.startsWith('data:image'));
    return (
        <div className={cn("relative flex items-center justify-center border border-dashed bg-muted/50 text-muted-foreground", isAvatar ? "rounded-full" : "rounded-md", className)}>
            {isValidSrc ? (
                <Image src={watchUrl} alt={alt} fill style={{ objectFit: 'cover' }} className={cn(isAvatar ? "rounded-full" : "rounded-md")} />
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
  
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const [isBannerEditorOpen, setIsBannerEditorOpen] = useState(false);
  const [bannerImageToCrop, setBannerImageToCrop] = useState<string | null>(null);


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

  const isAvatarGif = useMemo(() => watchedAvatarUrl?.toLowerCase().endsWith('.gif') || false, [watchedAvatarUrl]);
  const isBannerGif = useMemo(() => watchedBannerUrl?.toLowerCase().endsWith('.gif') || false, [watchedBannerUrl]);

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
  
  const handleOpenAvatarEditor = () => {
    const url = form.getValues('avatarUrl');
    if (!url || !(url.startsWith('http') || url.startsWith('data:image'))) {
        toast({ title: "Invalid URL", description: "Please enter a valid image URL to edit the avatar.", variant: "destructive" });
        return;
    }
    if (isAvatarGif) return; // Prevent opening editor for GIFs
    setImageToCrop(url);
    setIsAvatarEditorOpen(true);
  };

  const handleAvatarSave = (croppedImage: string) => {
    form.setValue('avatarUrl', croppedImage, { shouldDirty: true });
    setIsAvatarEditorOpen(false);
  };

  const handleOpenBannerEditor = () => {
    const url = form.getValues('bannerUrl');
    if (!url || !(url.startsWith('http') || url.startsWith('data:image'))) {
        toast({ title: "Invalid URL", description: "Please enter a valid image URL to edit the banner.", variant: "destructive" });
        return;
    }
    if (isBannerGif) return; // Prevent opening editor for GIFs
    setBannerImageToCrop(url);
    setIsBannerEditorOpen(true);
  };

  const handleBannerSave = (croppedImage: string) => {
    form.setValue('bannerUrl', croppedImage, { shouldDirty: true });
    setIsBannerEditorOpen(false);
  };

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
        
        try {
          localStorage.setItem('mockUser', JSON.stringify(result.data.profile));
          window.dispatchEvent(new StorageEvent('storage', { 
              key: 'mockUser', 
              newValue: JSON.stringify(result.data.profile) 
          }));
        } catch (e: any) {
            if (e.name === 'QuotaExceededError') {
                console.warn("Could not update mockUser in localStorage due to quota exceeded. This is expected if a large data URI was used for an image.");
                toast({
                    title: "Profile Saved (with warning)",
                    description: "Your profile was saved, but new images might not show in the header due to browser storage limits. They will appear on your profile page and on next login.",
                    variant: "default",
                    duration: 8000
                });
                // Fallback: update localStorage without the large images so other info updates
                const profileWithoutImages = { ...result.data.profile, avatarUrl: null, bannerUrl: null };
                localStorage.setItem('mockUser', JSON.stringify(profileWithoutImages));
                window.dispatchEvent(new StorageEvent('storage', { 
                    key: 'mockUser', 
                    newValue: JSON.stringify(profileWithoutImages) 
                }));
            } else {
                console.error("An error occurred while updating localStorage:", e);
            }
        }

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
    <>
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
                      <TabsContent value="images" className="space-y-6 m-0">
                        <div>
                           <h3 className="text-base font-medium">Avatar</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mt-2">
                                <div className="md:col-span-1">
                                    <ImagePreview watchUrl={watchedAvatarUrl} alt="Avatar Preview" fallbackText="Avatar Preview" className="w-24 h-24 mx-auto" isAvatar={true} />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <Label htmlFor="avatarUrl" className="text-xs text-muted-foreground">Image URL or Data URI</Label>
                                    <div className="flex items-center gap-2">
                                        <Input id="avatarUrl" type="url" {...form.register('avatarUrl')} placeholder="https://..." disabled={isSubmitting}/>
                                        <Button type="button" variant="outline" size="icon" onClick={handleOpenAvatarEditor} disabled={isSubmitting || !watchedAvatarUrl || isAvatarGif} title="Edit Avatar">
                                            <Edit className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                    {isAvatarGif && (
                                        <p className="text-xs text-muted-foreground pt-1">
                                            Animated GIFs cannot be cropped and will be used as-is.
                                        </p>
                                    )}
                                    {form.formState.errors.avatarUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.avatarUrl.message}</p>}
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        <div>
                            <h3 className="text-base font-medium">Banner</h3>
                            <div className="space-y-2 mt-2">
                                <div>
                                    <Label htmlFor="bannerUrl" className="text-xs text-muted-foreground">Image URL or Data URI</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Input id="bannerUrl" type="url" {...form.register('bannerUrl')} placeholder="Banner image URL..." disabled={isSubmitting}/>
                                        <Button type="button" variant="outline" size="icon" onClick={handleOpenBannerEditor} disabled={isSubmitting || !watchedBannerUrl || isBannerGif} title="Edit Banner">
                                            <Edit className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                    {isBannerGif && (
                                        <p className="text-xs text-muted-foreground pt-1">
                                            Animated GIFs cannot be cropped and will be used as-is.
                                        </p>
                                    )}
                                    {form.formState.errors.bannerUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.bannerUrl.message}</p>}
                                </div>
                                <ImagePreview watchUrl={watchedBannerUrl} alt="Banner Preview" fallbackText="Banner Preview" className="w-full aspect-[4/1]"/>
                            </div>
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
      {imageToCrop && (
        <AvatarEditor
          isOpen={isAvatarEditorOpen}
          onOpenChange={setIsAvatarEditorOpen}
          imageSrc={imageToCrop}
          onSave={handleAvatarSave}
        />
      )}
      {bannerImageToCrop && (
        <BannerEditor
          isOpen={isBannerEditorOpen}
          onOpenChange={setIsBannerEditorOpen}
          imageSrc={bannerImageToCrop}
          onSave={handleBannerSave}
        />
      )}
    </>
  );
}

    
