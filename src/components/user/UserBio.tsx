'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface UserBioProps {
  bio: string;
}

export function UserBio({ bio }: UserBioProps) {
  if (!bio) return null;

  return (
    <Card className="bg-card/80 backdrop-blur-lg border-border/40 shadow-lg"> {/* Removed h-full */}
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-lg font-semibold text-primary flex items-center">
            <Info className="w-5 h-5 mr-2"/>
            About Me
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed break-words">
          {bio}
        </p>
      </CardContent>
    </Card>
  );
}
