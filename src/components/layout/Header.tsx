"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Code, TabletSmartphone, Music, LogIn, UserPlus, LogOut, UserCircle, Cog, Loader2, Shield, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import type { UserAppRole, ItemType } from '@/lib/types';
import { UploadMenu } from './UploadMenu';

interface MockUser {
  id: string;
  usertag: string;
  name: string;
  role: UserAppRole;
  avatarUrl?: string;
  bannerUrl?: string;
}

export function Header() {
  const [mockUser, setMockUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const pathContext = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    let itemType: ItemType | undefined = undefined;
    let projectSlug: string | undefined = undefined;
    let categorySlug: string | undefined = undefined;

    if (parts.length >= 1) {
      if (['games', 'web', 'apps', 'art-music'].includes(parts[0])) {
        if (parts[0] === 'games') itemType = 'game';
        else if (parts[0] === 'web') itemType = 'web';
        else if (parts[0] === 'apps') itemType = 'app';
        else if (parts[0] === 'art-music') itemType = 'art-music';
      }
    }

    if (itemType && parts.length >= 2) {
      projectSlug = parts[1];
    }
    
    if (itemType && projectSlug && parts.length >= 3 && parts[2] !== 'resources') {
      categorySlug = parts[2];
    }

    return { itemType, projectSlug, categorySlug };
  }, [pathname]);

  const loadMockUser = useCallback(() => {
    setIsLoading(true);
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && typeof parsedUser.id === 'string' && typeof parsedUser.usertag === 'string' && parsedUser.usertag.startsWith('@')) {
          setMockUser(parsedUser);
        } else {
          localStorage.removeItem('mockUser'); 
          setMockUser(null);
        }
      } catch (e) {
        console.error("Failed to parse mockUser from localStorage", e);
        localStorage.removeItem('mockUser');
        setMockUser(null);
      }
    } else {
      setMockUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadMockUser();
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'mockUser' || event.key === null) { 
        loadMockUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadMockUser]);

  const handleLogout = () => {
    localStorage.removeItem('mockUser');
    window.dispatchEvent(new StorageEvent('storage', { key: 'mockUser', oldValue: JSON.stringify(mockUser), newValue: null }));
    toast({ title: "Logout Successful", description: "You have been logged out." });
    setTimeout(() => {
        router.push('/login'); 
    }, 50);
  };

  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="items-center space-x-3 lg:space-x-4 hidden md:flex">
              <div className="h-4 w-16 bg-muted/50 rounded-md animate-pulse" />
              <div className="h-4 w-12 bg-muted/50 rounded-md animate-pulse" />
              <div className="h-4 w-12 bg-muted/50 rounded-md animate-pulse" />
              <div className="h-4 w-20 bg-muted/50 rounded-md animate-pulse" />
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-6">
          {/* Left-aligned group */}
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="items-center space-x-3 lg:space-x-4 hidden md:flex">
              <Link draggable="false" href="/games" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors flex items-center">
                <Gamepad2 className="mr-1.5" /> Games
              </Link>
              <Link draggable="false" href="/web" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors flex items-center">
                <Code className="mr-1.5" /> Web
              </Link>
              <Link draggable="false" href="/apps" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors flex items-center">
                <TabletSmartphone className="mr-1.5" /> Apps
              </Link>
              <Link draggable="false" href="/art-music" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors flex items-center">
                <Music className="mr-1.5" /> Art & Music
              </Link>
            </nav>
          </div>

          {/* Right-aligned group */}
          <div className="flex items-center space-x-2">
            {mockUser ? (
              <>
                <Button variant="outline" size="sm" className="button-outline-glow hidden sm:flex" onClick={() => setIsUploadMenuOpen(true)}>
                    <UploadCloud className="mr-2 h-4 w-4" /> Upload
                </Button>
                <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setIsUploadMenuOpen(true)}>
                    <UploadCloud className="h-5 w-5" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild draggable="false">
                    <Button
                      variant="ghost"
                      className="relative h-16 w-16 rounded-full p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                      <Avatar className="h-14 w-14 border-2 border-primary/50">
                        <AvatarImage src={mockUser.avatarUrl || undefined} alt={mockUser.name} />
                        <AvatarFallback>{mockUser.name ? mockUser.name.substring(0, 1).toUpperCase() : <UserCircle className="w-6 h-6"/>}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 mt-2.5" align="end" forceMount>
                    {mockUser.bannerUrl && (
                      <div className="relative h-16 w-full mb-2 overflow-hidden rounded-t-md">
                        <Image
                          src={mockUser.bannerUrl}
                          alt={`${mockUser.name}'s banner`}
                          fill
                          style={{objectFit: 'cover'}}
                          priority
                        />
                      </div>
                    )}
                    <DropdownMenuLabel className="font-normal pt-1">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none text-foreground">{mockUser.name}</p>
                        {mockUser.usertag && <p className="text-xs leading-none text-muted-foreground">{mockUser.usertag}</p>}
                        {mockUser.role && (
                          <Badge variant={mockUser.role === 'admin' ? 'destructive' : mockUser.role === 'mod' ? 'default' : 'secondary'} className="capitalize w-fit mt-1 text-xs">
                            {mockUser.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                            {mockUser.role}
                          </Badge>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(mockUser.role === 'admin' || mockUser.role === 'mod') && (
                        <DropdownMenuItem asChild draggable="false">
                          <Link href="/admin" className="flex items-center cursor-pointer">
                            <Cog className="mr-2 h-4 w-4" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild draggable="false">
                        <Link href={`/users/${mockUser.usertag.substring(1)}`} className="flex items-center cursor-pointer">
                          <UserCircle className="mr-2 h-4 w-4" />
                          My Profile
                        </Link>
                      </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center cursor-pointer" draggable="false">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex" draggable="false">
                  <Link href="/login"><LogIn className="mr-2 h-4 w-4" /> Login</Link>
                </Button>
                <Button asChild variant="ghost" size="icon" className="sm:hidden rounded-full h-9 w-9" draggable="false">
                    <Link href="/login" aria-label="Login"><LogIn className="h-5 w-5"/></Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      {mockUser && (
        <UploadMenu
          isOpen={isUploadMenuOpen}
          onOpenChange={setIsUploadMenuOpen}
        />
      )}
    </>
  );
}