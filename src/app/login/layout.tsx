
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PinkStar - Mock Login',
  description: 'Mock login page for PinkStar.',
};

export default function MockLoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This layout provides its own full-screen styling,
  // so it does not include the global Header or Footer from RootLayout.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4">
      {children}
    </div>
  );
}
