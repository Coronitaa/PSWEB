
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

const validUsertagsForLogin = ['@admin', '@mod', '@user'];

interface MockUser {
  id: string;
  usertag: string;
  name: string;
  role: UserAppRole;
  avatarUrl?: string;
  bannerUrl?: string; 
}

export function AuthForm() {
  const [usertagInput, setUsertagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const normalizedInput = usertagInput.startsWith('@') ? usertagInput.toLowerCase() : `@${usertagInput.toLowerCase()}`;
    let mockUserToStore: MockUser | null = null;

    if (normalizedInput === '@admin') {
      mockUserToStore = {
        id: 'mock-admin-id',
        usertag: '@admin',
        name: 'Administrator',
        role: 'admin',
        avatarUrl: `https://placehold.co/128x128/E91E63/FFFFFF?text=A`,
        bannerUrl: `https://placehold.co/1200x300/1a1a1a/E91E63?text=Admin+Banner`
      };
    } else if (normalizedInput === '@mod') {
      mockUserToStore = {
        id: 'mock-mod-id',
        usertag: '@mod',
        name: 'Moderator',
        role: 'mod',
        avatarUrl: `https://placehold.co/128x128/2196F3/FFFFFF?text=M`,
        bannerUrl: `https://placehold.co/1200x300/1a1a1a/2196F3?text=Mod+Banner`
      };
    } else if (normalizedInput === '@user') {
      mockUserToStore = {
        id: 'mock-user-id',
        usertag: '@user',
        name: 'Regular User',
        role: 'usuario',
        avatarUrl: `https://placehold.co/128x128/4CAF50/FFFFFF?text=U`,
        bannerUrl: `https://placehold.co/1200x300/1a1a1a/4CAF50?text=User+Banner`
      };
    }

    if (mockUserToStore) {
      localStorage.setItem('mockUser', JSON.stringify(mockUserToStore));
      toast({ title: "Login Successful", description: `Welcome ${mockUserToStore.name}!` });
      window.dispatchEvent(new StorageEvent('storage', { key: 'mockUser', newValue: JSON.stringify(mockUserToStore) }));
      
      setTimeout(() => {
        if (mockUserToStore?.role === 'admin' || mockUserToStore?.role === 'mod') {
            router.push('/admin');
        } else {
            router.push('/');
        }
      }, 100);

    } else {
      toast({ title: "Login Error", description: "Invalid usertag. Try @admin, @mod, or @user.", variant: "destructive" });
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
