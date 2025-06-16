
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { createSupabaseClient } from '@/lib/supabase/client'; // For potential server-side session access

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PinkStar - Game Resources',
  description: 'Discover and download resources for your favorite games.',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({
  children,
}: RootLayoutProps) {
  // For true SSR with auth, you'd use Supabase SSR helpers here
  // For now, client-side auth in Header is the primary driver of UI updates
  // const supabase = createSupabaseClient(); 
  // const { data: { session } } = await supabase.auth.getSession();
  // The session would then be passed down or put in a context

  // This check is more for AuthLayout's specific background.
  // The actual hiding/showing of Header/Footer is now implicitly handled
  // by AuthLayout not including them.
  // const isAuthPage = currentUrl.startsWith('/auth'); 

  return (
    <html lang="en" className="dark">
      <body className={cn(
        geistSans.variable,
        geistMono.variable,
        "antialiased flex flex-col min-h-screen"
        // Conditional background for auth pages will be handled by AuthLayout itself
      )}>
        <Header /> {/* Header is always rendered; its content changes based on auth state */}
        <main className={cn(
          "flex-grow",
          // Apply container styles only if NOT an auth page,
          // AuthLayout will handle its own full-page centering.
          // This check relies on AuthLayout being a distinct layout.
          // A more robust way might involve a context or URL check if nesting complex layouts.
          // For now, assuming AuthLayout is top-level for auth routes.
          "container mx-auto max-w-screen-2xl px-4 py-8" // Default container for non-auth
        )}>
          {children}
        </main>
        <Footer /> {/* Footer is always rendered; its content might change based on auth state if needed */}
        <Toaster />
      </body>
    </html>
  );
}

    