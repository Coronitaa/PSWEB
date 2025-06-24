
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from '@/app/actions/clientWrappers';
import { Loader2, Save, Github, Twitter, Globe, Linkedin, MessageCircle } from 'lucide-react';

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name cannot exceed 50 characters."),
  bio: z.string().max(500, "Bio cannot exceed 500 characters.").optional(),
  avatarUrl: z.string().url("Must be a valid URL for avatar.").optional().or(z.literal('')),
  bannerUrl: z.string().url("Must be a valid URL for banner.").optional().or(z.literal('')),
  socialLinks: z.object({
    github: z.string().url().optional().or(z.literal('')),
    twitter: z.string().url().optional().or(z.literal('')),
    website: z.string().url().optional().or(z.literal('')),
    linkedin: z.string().url().optional().or(z.literal('')),
    discord: z.string().url().optional().or(z.literal('')),
  }).optional(),
});

interface EditProfileModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

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
        ...data,
        bio: data.bio || undefined,
        avatarUrl: data.avatarUrl || undefined,
        bannerUrl: data.bannerUrl || undefined,
        socialLinks: data.socialLinks,
      };
      
      const result = await updateProfile(formData);

      if (result.success) {
        toast({ title: "Profile Updated", description: "Your changes have been saved." });
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
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Your Profile</DialogTitle>
          <DialogDescription>
            Update your public information. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto pr-2 -mr-2 py-2">
          <div>
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" {...form.register('bio')} rows={4} placeholder="Tell us a little about yourself..."/>
            {form.formState.errors.bio && <p className="text-xs text-destructive mt-1">{form.formState.errors.bio.message}</p>}
          </div>
          <div>
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input id="avatarUrl" {...form.register('avatarUrl')} placeholder="https://..."/>
            {form.formState.errors.avatarUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.avatarUrl.message}</p>}
          </div>
          <div>
            <Label htmlFor="bannerUrl">Banner URL</Label>
            <Input id="bannerUrl" {...form.register('bannerUrl')} placeholder="https://..."/>
            {form.formState.errors.bannerUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.bannerUrl.message}</p>}
          </div>
          
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-medium">Social Links</h4>
            <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input {...form.register('socialLinks.github')} placeholder="GitHub URL" className="pl-9"/>
            </div>
            <div className="relative">
                <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input {...form.register('socialLinks.twitter')} placeholder="Twitter/X URL" className="pl-9"/>
            </div>
            <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input {...form.register('socialLinks.website')} placeholder="Website URL" className="pl-9"/>
            </div>
             <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input {...form.register('socialLinks.linkedin')} placeholder="LinkedIn URL" className="pl-9"/>
            </div>
             <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input {...form.register('socialLinks.discord')} placeholder="Discord Invite URL" className="pl-9"/>
            </div>
          </div>
        </form>
        <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
