import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; 
import { Button } from '@/components/ui/button';
import { Package, LayoutGrid, Users, Settings, BarChart3 } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the PinkStar management panel.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Manage Projects"
          description="Create, edit, and delete games, web projects, apps, and art/music entries."
          icon={Package}
          linkHref="/admin/projects"
          linkText="Go to Projects"
        />
        <DashboardCard
          title="Content Categories"
          description="Organize resources by defining and managing categories for each project."
          icon={LayoutGrid}
          linkHref="/admin/projects" 
          linkText="Manage Categories"
          disabled
        />
        <DashboardCard
          title="User Management"
          description="View and manage user accounts, roles, and permissions."
          icon={Users}
          linkHref="#"
          linkText="Manage Users"
          disabled
        />
        <DashboardCard
          title="Site Analytics"
          description="View statistics and reports on site usage and content performance."
          icon={BarChart3}
          linkHref="#"
          linkText="View Analytics"
          disabled
        />
        <DashboardCard
          title="Site Settings"
          description="Configure global site settings, themes, and integrations."
          icon={Settings}
          linkHref="#"
          linkText="Configure Settings"
          disabled
        />
      </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  linkHref: string;
  linkText: string;
  disabled?: boolean;
}

function DashboardCard({ title, description, icon: Icon, linkHref, linkText, disabled }: DashboardCardProps) {
  return (
    // GlareHover removed
    <Card className="h-full bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-primary/20 transition-shadow flex flex-col border-border/30 hover:border-primary/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
        <Icon className="h-6 w-6 text-primary" />
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      </CardContent>
      <CardFooter>
        <Button asChild variant={disabled ? "outline" : "default"} className={disabled ? "cursor-not-allowed opacity-50" : "button-primary-glow"} disabled={disabled}>
          <Link href={disabled ? "#" : linkHref}>{linkText}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
