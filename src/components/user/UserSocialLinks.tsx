'use client';

import type { Author as UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Github, Twitter, Linkedin, Globe, MessageCircle, Link as LinkIcon } from 'lucide-react'; 

interface UserSocialLinksProps {
  socialLinks: NonNullable<UserProfile['socialLinks']>;
}

const socialIconMap: { [key: string]: React.ElementType } = {
  github: Github,
  twitter: Twitter,
  linkedin: Linkedin,
  website: Globe,
  discord: MessageCircle, 
};

const socialNameMap: { [key: string]: string } = {
    github: 'GitHub',
    twitter: 'Twitter',
    linkedin: 'LinkedIn',
    website: 'Website',
    discord: 'Discord',
}

export function UserSocialLinks({ socialLinks }: UserSocialLinksProps) {
  const links = Object.entries(socialLinks)
    .filter(([, url]) => url)
    .map(([key, url]) => ({
      key,
      url: url as string,
      Icon: socialIconMap[key] || LinkIcon,
      name: socialNameMap[key] || key.charAt(0).toUpperCase() + key.slice(1),
    }));

  if (links.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/80 backdrop-blur-lg border-border/40 shadow-lg"> {/* Removed h-full */}
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-lg font-semibold text-primary flex items-center">
            <LinkIcon className="w-5 h-5 mr-2"/>
            Connect
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {links.map(({ key, url, Icon, name }) => (
          <Button key={key} variant="outline" asChild className="w-full justify-start hover:border-primary/70 hover:bg-primary/10 group">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Icon className="w-4 h-4 mr-2 text-muted-foreground group-hover:text-primary transition-colors" /> 
              <span className="text-muted-foreground group-hover:text-primary transition-colors">{name}</span>
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
