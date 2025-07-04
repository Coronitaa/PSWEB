
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AtSign, LogIn, RefreshCw, UserCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { UserAppRole } from '@/lib/types';
import { fetchUserProfileByUsertag } from '@/app/actions/clientWrappers';
import type { Author } from '@/lib/types';

const validUsertagsForLogin = ['@admin', '@mod', '@user'];

interface MockUser extends Author {
  // MockUser can now fully extend the Author type
}

export function AuthForm() {
  const [usertagInput, setUsertagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const normalizedInput = usertagInput.startsWith('@') ? usertagInput.toLowerCase() : `@${usertagInput.toLowerCase()}`;
    
    // Check if it's a valid mock login tag
    if (!validUsertagsForLogin.includes(normalizedInput)) {
        toast({ title: "Login Error", description: "Invalid usertag. Try @admin, @mod, or @user.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    // Fetch the profile from the database
    const result = await fetchUserProfileByUsertag(normalizedInput);

    if (result.success && result.data?.profile) {
      const profile = result.data.profile;
      
      try {
          localStorage.setItem('mockUser', JSON.stringify(profile));
          window.dispatchEvent(new StorageEvent('storage', { key: 'mockUser', newValue: JSON.stringify(profile) }));
          toast({ title: "Login Successful", description: `Welcome ${profile.name}!` });
          
          setTimeout(() => {
            router.push('/');
          }, 100);

      } catch (e: any) {
          if (e.name === 'QuotaExceededError') {
              console.warn("Could not set mockUser in localStorage due to quota exceeded. This can happen if profile images are very large data URIs.");
              toast({ title: "Login Warning", description: "Logged in, but some profile data (like images) might not persist correctly due to size limits.", variant: "default" });
              // Attempt to save without images as a fallback
              const profileWithoutImages = { ...profile, avatarUrl: null, bannerUrl: null };
              localStorage.setItem('mockUser', JSON.stringify(profileWithoutImages));
              window.dispatchEvent(new StorageEvent('storage', { key: 'mockUser', newValue: JSON.stringify(profileWithoutImages) }));
               setTimeout(() => { router.push('/'); }, 100);
          } else {
              console.error("An error occurred during login storage:", e);
              toast({ title: "Login Error", description: "Could not save session data.", variant: "destructive" });
              setIsLoading(false);
          }
      }

    } else {
      toast({ title: "Login Error", description: result.error || "Could not find profile data for login.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-lg border-border/50">
      <CardHeader className="text-center p-6 pb-4">
        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full border-2 border-primary shadow-inner">
          <UserCircle className="w-10 h-10 text-primary" />
        </div>
        <CardTitle className="text-3xl font-bold text-primary">Mock Login</CardTitle>
        <CardDescription className="text-muted-foreground">Enter @admin, @mod, or @user to simulate login.</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-2 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="usertag" className="flex items-center"><AtSign className="w-4 h-4 mr-2 text-primary"/>Usertag</Label>
            <Input
              id="usertag"
              placeholder="@admin, @mod, or @user"
              value={usertagInput}
              onChange={(e) => setUsertagInput(e.target.value)}
              className={cn(false && "border-destructive focus-visible:ring-destructive")}
            />
          </div>
          <Button type="submit" className="w-full button-primary-glow text-base mt-2" disabled={isLoading} draggable="false">
            {isLoading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            Login
          </Button>
        </form>
      </CardContent>
      <CardFooter className="p-6 pt-2 flex flex-col items-center">
        <p className="text-xs text-muted-foreground">This is a simplified mock login for testing.</p>
      </CardFooter>
    </Card>
  );
}
