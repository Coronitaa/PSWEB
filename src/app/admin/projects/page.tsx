
import Link from 'next/link';
import { getAllItemsWithDetails } from '@/lib/data';
import type { ItemType, GenericListItem, ItemWithDetails, ProjectStatus } from '@/lib/types';
import { ITEM_TYPES_CONST, ITEM_TYPE_NAMES, PROJECT_STATUS_NAMES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Eye } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

function groupItemsByType(items: ItemWithDetails[]): Record<ItemType, ItemWithDetails[]> {
  const grouped: Record<ItemType, ItemWithDetails[]> = {} as any;
  ITEM_TYPES_CONST.forEach(type => grouped[type] = []);
  items.forEach(item => {
    if (grouped[item.itemType]) {
      grouped[item.itemType].push(item);
    } else {
      // Should not happen if ITEM_TYPES_CONST is comprehensive
      console.warn(`Item with unknown type encountered: ${item.itemType}`);
      // grouped[item.itemType] = [item]; // Optionally handle unknown types
    }
  });
  return grouped;
}

function getStatusBadgeVariant(status: ProjectStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case 'published':
      return 'default'; 
    case 'draft':
      return 'secondary'; 
    case 'archived':
      return 'outline'; 
    default:
      return 'secondary';
  }
}


export default async function AdminProjectsPage() {
  const allItems = await getAllItemsWithDetails(); // Fetches all items for admin view
  const groupedItems = groupItemsByType(allItems);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Manage Projects</h1>
            <p className="text-muted-foreground">View, create, edit, or delete projects across all sections.</p>
        </div>
      </div>

      {ITEM_TYPES_CONST.map((itemType) => (
        <Card key={itemType} className="bg-card/80 backdrop-blur-sm shadow-lg border-border/30" id={itemType}>
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-foreground">{ITEM_TYPE_NAMES[itemType]}</CardTitle>
                <Button asChild size="sm" className="button-primary-glow">
                    <Link href={`/admin/projects/${itemType}/new/edit`}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New {ITEM_TYPE_NAMES[itemType].slice(0, -1)}
                    </Link>
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            {groupedItems[itemType] && groupedItems[itemType].length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Icon</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedItems[itemType].map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Image src={item.iconUrl} alt={item.name} width={40} height={40} className="rounded-md bg-muted object-cover" />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/admin/projects/${item.itemType}/${item.slug}/edit`} className="hover:text-primary transition-colors">
                            {item.name}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{item.description}</p>
                      </TableCell>
                      <TableCell>{item.authorDisplayName || <span className="text-muted-foreground/70 italic">N/A</span>}</TableCell>
                      <TableCell>{item.categories?.length || 0}</TableCell>
                      <TableCell>
                        <Badge 
                           variant={getStatusBadgeVariant(item.status)}
                           className={cn(
                            item.status === 'published' && 'bg-green-600/80 text-white hover:bg-green-600',
                            item.status === 'draft' && 'bg-yellow-500/80 text-black hover:bg-yellow-500',
                            item.status === 'archived' && 'bg-slate-500/80 text-white hover:bg-slate-500 border-slate-600'
                           )}
                        >
                            {PROJECT_STATUS_NAMES[item.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" asChild title="View Project" disabled={item.status === 'archived'}>
                            <Link href={item.status === 'archived' ? '#' : `/${item.itemType}s/${item.slug}`} target="_blank">
                                <Eye className="h-4 w-4 text-muted-foreground hover:text-primary"/>
                            </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Edit Project">
                          <Link href={`/admin/projects/${item.itemType}/${item.slug}/edit`}>
                            <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete Project (via Edit page)" asChild>
                           <Link href={`/admin/projects/${item.itemType}/${item.slug}/edit`}>
                            <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                           </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No {ITEM_TYPE_NAMES[itemType].toLowerCase()} found. <Link href={`/admin/projects/${itemType}/new/edit`} className="text-primary hover:underline">Create one now!</Link></p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export const dynamic = 'force-dynamic';
