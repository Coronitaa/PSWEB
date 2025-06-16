
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import { Package, LayoutGrid, Users, Settings, Home, BarChart3, LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useCallback } from 'react';
import type { UserAppRole } from '@/lib/types';

interface MockUser {
  id: string; 
  usertag: string;
  name: string;
  role: UserAppRole; 
}

const sidebarNavItems = [
  { title: 'Dashboard', href: '/admin', icon: Home },
  { title: 'Projects', href: '/admin/projects', icon: Package },
  { title: 'Users', href: '/admin/users', icon: Users, disabled: true, adminOnly: true },
  { title: 'Analytics', href: '/admin/analytics', icon: BarChart3, disabled: true, adminOnly: true },
  { title: 'Settings', href: '/admin/settings', icon: Settings, disabled: true, adminOnly: true },
];


export function AdminSidebar() {
  const pathname = usePathname();
  const [mockUser, setMockUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserFromStorage = useCallback(() => {
    setIsLoading(true);
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && typeof parsedUser.id === 'string') {
          setMockUser(parsedUser);
        } else {
          // console.error("Parsed user from localStorage is missing 'id' property or is invalid for (auth)/layout AdminSidebar.");
          localStorage.removeItem('mockUser'); 
          setMockUser(null);
        }
      } catch (e) {
        console.error("Failed to parse mockUser from localStorage for (auth)/layout AdminSidebar", e);
        localStorage.removeItem('mockUser'); 
        setMockUser(null);
      }
    } else {
      setMockUser(null);
    }
    setIsLoading(false);
  }, []); 

  useEffect(() => {
    loadUserFromStorage(); 

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'mockUser' || event.key === null) { 
        loadUserFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadUserFromStorage]); 

  if (isLoading) {
    return (
        <aside className="sticky top-0 h-screen w-64 bg-background border-r border-border flex flex-col p-4 shadow-lg items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </aside>
    );
  }

  if (!mockUser || (mockUser.role !== 'admin' && mockUser.role !== 'mod')) {
     return (
        <aside className="sticky top-0 h-screen w-64 bg-background border-r border-border flex flex-col p-4 shadow-lg">
            <div className="p-2 mb-6"> <Logo /> </div>
            <div className="flex-grow space-y-1">
                <p className="text-muted-foreground text-sm p-2">Admin panel access restricted.</p>
                 <Button variant="outline" className="w-full justify-start text-sm mt-4" asChild>
                    <Link href="/"> <LogOut className="mr-2 h-4 w-4" /> Return to Home </Link>
                </Button>
            </div>
        </aside>
     );
  }

  return (
    <aside className="sticky top-0 h-screen w-64 bg-background border-r border-border flex flex-col p-4 shadow-lg">
      <div className="p-2 mb-6"> <Logo /> </div>
      <nav className="flex-grow space-y-1">
        {sidebarNavItems.map((item) => {
          if (item.adminOnly && mockUser?.role !== 'admin') {
            return null;
          }
          return (
            <Button
              key={item.title}
              variant={pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href)) ? 'default' : 'ghost'}
              className={cn(
                "w-full justify-start text-sm",
                (pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))) && "bg-primary text-primary-foreground hover:bg-primary/90",
                item.disabled && "cursor-not-allowed opacity-50"
              )}
              asChild
              disabled={item.disabled}
            >
              <Link href={item.disabled ? "#" : item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            </Button>
          );
        })}
      </nav>
      <div className="mt-auto">
        <Button variant="outline" className="w-full justify-start text-sm" asChild>
          <Link href="/"> <LogOut className="mr-2 h-4 w-4" /> Exit Admin </Link>
        </Button>
      </div>
    </aside>
  );
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 bg-muted/40">
        {children}
      </main>
    </div>
  );
}
