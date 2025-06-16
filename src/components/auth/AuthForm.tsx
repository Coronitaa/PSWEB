
"use client";

import React, { useState, useEffect }
from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AtSign, LogIn, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { UserAppRole } from '@/lib/types';

const validUsertags = ['@admin', '@user', '@mod'];

interface MockUser {
  id: string;
  usertag: string;
  name: string;
  role: UserAppRole;
  avatarUrl?: string;
}

export function AuthForm() {
  const [usertagInput, setUsertagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [hostname, setHostname] = useState('');

  useEffect(() => {
    // Ensure this runs only on the client
    if (typeof window !== 'undefined') {
      setHostname(window.location.hostname);
    }
  }, []);

  const setCookie = (name: string, value: string, days: number) => {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }

    let cookieString = name + "=" + (value || "")  + expires + "; path=/";

    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // For deployed (HTTPS) environments
      cookieString += "; SameSite=None; Secure; Partitioned";
    } else {
      // For localhost (HTTP or HTTPS)
      cookieString += "; SameSite=Lax";
      // If localhost is running on HTTPS, you could also add Secure here,
      // but SameSite=Lax usually works well without it on localhost.
      // if (typeof window !== 'undefined' && window.location.protocol === "https:") {
      //   cookieString += "; Secure";
      // }
    }
    document.cookie = cookieString;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const normalizedInput = usertagInput.startsWith('@') ? usertagInput : `@${usertagInput}`;
    let role: UserAppRole = 'usuario';
    let userId: string = 'mock-user-id';
    let userName: string = 'User';

    if (normalizedInput.toLowerCase() === '@admin') {
      role = 'admin';
      userId = 'mock-admin-id';
      userName = 'Administrator';
    } else if (normalizedInput.toLowerCase() === '@mod') {
      role = 'mod';
      userId = 'mock-mod-id';
      userName = 'Moderator';
    } else if (normalizedInput.toLowerCase() === '@user') {
      role = 'usuario';
      userId = 'mock-user-id';
      userName = 'User';
    }


    if (validUsertags.includes(normalizedInput.toLowerCase())) {
      const mockUser: MockUser = {
        id: userId,
        usertag: normalizedInput.toLowerCase(),
        name: userName,
        role: role,
        avatarUrl: `https://placehold.co/128x128/${role === 'admin' ? 'E91E63' : role === 'mod' ? '2196F3' : '4CAF50'}/FFFFFF?text=${userName.substring(0,1).toUpperCase()}`
      };
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      setCookie('mockUser', JSON.stringify(mockUser), 1);

      toast({ title: "Login Successful", description: `Welcome ${mockUser.name}!` });
      
      window.dispatchEvent(new Event('storage'));
      
      setTimeout(() => {
        router.push('/');
      }, 50);

    } else {
      toast({ title: "Login Error", description: "Invalid usertag. Try @admin, @mod, or @user.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-lg border-border/50">
      <CardHeader className="text-center p-6 pb-4">
        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full border-2 border-primary shadow-inner">
          <LogIn className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-3xl font-bold text-primary">Mock Login</CardTitle>
        <CardDescription className="text-muted-foreground">Enter @admin, @mod, or @user to continue.</CardDescription>
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
        <p className="text-xs text-muted-foreground">This is a mock login system.</p>
      </CardFooter>
    </Card>
  );
}
