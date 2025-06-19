
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { ResourceFile, Tag, ChangelogEntry, DynamicAvailableFilterTags, DynamicTagGroup, TagInGroupConfig } from '@/lib/types';
import { FILE_CHANNELS } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { TagBadge } from '@/components/shared/TagBadge';
import { Download, Filter, Info, Tags as TagsIconLucide, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/utils';
import { incrementResourceDownloadCountAction } from '@/app/actions/resourceActions';
import { useToast } from '@/hooks/use-toast';

interface ResourceFilesTabContentProps {
  files: ResourceFile[];
  allChangelogEntries?: ChangelogEntry[]; // This might be redundant if changelogNotes are on file objects
  resourceId: string; // ID del recurso padre
  dynamicAvailableFileTagGroups: DynamicAvailableFilterTags;
}

const CLEAR_FILTER_VALUE = "_ANY_";

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line text-popover-foreground">
      {text.split('\\n').map((line, index) => {
        // Basic list item handling (simplified)
        if (line.match(/^(\s*-\s+)/) || line.match(/^(\s*\*\s+)/)) {
          return <li key={index} className="ml-4 list-disc">{line.replace(/^(\s*[-\*]\s+)/, '')}</li>;
        }
        // Basic bold and italic
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        line = line.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
        
        return <p key={index} className="mb-1 last:mb-0" dangerouslySetInnerHTML={{ __html: line }} />;
      })}
    </div>
  );
};

export function ResourceFilesTabContent({ files, resourceId, dynamicAvailableFileTagGroups }: ResourceFilesTabContentProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>(undefined);
  const [selectedFileTagFilters, setSelectedFileTagFilters] = useState<Record<string, string | undefined>>({});
  const { toast } = useToast();

  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [selectedFileForModal, setSelectedFileForModal] = useState<ResourceFile | null>(null);


  const allAvailableChannelsForFilter = useMemo(() => {
    const uniqueChannelIdsInFiles = new Set<string>();
    files.forEach(file => {
      if (file.channel?.id) {
        uniqueChannelIdsInFiles.add(file.channel.id);
      }
    });
    return FILE_CHANNELS.filter(definedChannel => uniqueChannelIdsInFiles.has(definedChannel.id));
  }, [files]);

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const channelMatch = !selectedChannelId || (file.channel && file.channel.id === selectedChannelId);
      
      const fileTagMatch = Object.entries(selectedFileTagFilters).every(([groupId, selectedTagId]) => {
        if (!selectedTagId) return true;
        const fileTagsForGroup = file.selectedFileTags?.[groupId];
        return fileTagsForGroup?.includes(selectedTagId) ?? false;
      });

      return channelMatch && fileTagMatch;
    }).sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()); // Ensure chronological order
  }, [files, selectedChannelId, selectedFileTagFilters]);
  
  const hasActiveFilters = selectedChannelId || Object.values(selectedFileTagFilters).some(v => v !== undefined);

  const handleClearFilters = () => {
    setSelectedChannelId(undefined);
    const clearedFileTagFilters: Record<string, string | undefined> = {};
    dynamicAvailableFileTagGroups.forEach(group => {
      clearedFileTagFilters[group.id] = undefined;
    });
    setSelectedFileTagFilters(clearedFileTagFilters);
  };

  const getChannelSpecificClasses = (channel?: Tag | null) => {
    if (!channel || !channel.name) return { bubble: 'bg-muted text-muted-foreground border-border/50', border: 'border-border/30', text: 'text-muted-foreground' };
    
    return {
        bubble: `border`,
        border: channel.border_color || channel.color || 'border-border/30',
        text: channel.text_color || 'text-muted-foreground'
    };
  };

  const handleOpenChangelogModal = (file: ResourceFile) => {
    setSelectedFileForModal(file);
    setIsChangelogModalOpen(true);
  };

  const handleFileDownloadClick = async (fileId: string, fileUrl: string, fileNameFromData?: string) => {
    if (!resourceId) {
      console.error("Resource ID is missing, cannot increment download count.");
      toast({ title: "Error", description: "Resource identifier is missing.", variant: "destructive" });
      return;
    }
    
    try {
      const result = await incrementResourceDownloadCountAction(resourceId, fileId);

      if (result.success) {
        toast({ title: "Success", description: "Download count updated. Starting download..." });
        
        const link = document.createElement('a');
        link.href = fileUrl;
        const downloadFileName = fileNameFromData || fileUrl.substring(fileUrl.lastIndexOf('/') + 1).split('?')[0] || `download-${fileId}`;
        link.setAttribute('download', downloadFileName); 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } else {
        console.error("Error incrementing download count (action result):", result.error);
        toast({ title: "Error", description: result.error || "Could not update file download count.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Client-side error calling incrementResourceDownloadCountAction:", error);
      toast({ title: "Network Error", description: `Could not connect to update download count: ${error.message}. Please check your connection.`, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {(allAvailableChannelsForFilter.length > 0 || dynamicAvailableFileTagGroups.length > 0) && (
        <div className="p-4 border rounded-md bg-card-foreground/5 shadow-sm space-y-3 sm:flex sm:flex-row sm:items-center sm:gap-4 sm:flex-wrap">
          <div className="flex items-center text-sm font-medium text-muted-foreground shrink-0">
            <Filter className="w-4 h-4 mr-2 text-primary" />
            Filter files by:
          </div>
          {allAvailableChannelsForFilter.length > 0 && (
             <div className="flex-none">
              <Select
                value={selectedChannelId || CLEAR_FILTER_VALUE}
                onValueChange={(value) => setSelectedChannelId(value === CLEAR_FILTER_VALUE ? undefined : value)}
              >
                <SelectTrigger className="w-auto h-9 text-xs rounded-md min-w-[130px]">
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLEAR_FILTER_VALUE} className="text-xs">All Channels</SelectItem>
                  {allAvailableChannelsForFilter.map(cChannel => (
                    <SelectItem key={cChannel.id} value={cChannel.id} className="text-xs">{cChannel.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {dynamicAvailableFileTagGroups.map(group => (
            group.tags && group.tags.length > 0 && (
                <div key={group.id} className="flex-none">
                <Select
                    value={selectedFileTagFilters[group.id] || CLEAR_FILTER_VALUE}
                    onValueChange={(value) => {
                    setSelectedFileTagFilters(prev => ({
                        ...prev,
                        [group.id]: value === CLEAR_FILTER_VALUE ? undefined : value,
                    }));
                    }}
                >
                    <SelectTrigger className="w-auto h-9 text-xs rounded-md min-w-[130px]">
                    <SelectValue placeholder={`All ${group.displayName}`} />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value={CLEAR_FILTER_VALUE} className="text-xs">All {group.displayName}</SelectItem>
                    {group.tags.map(tag => (
                        <SelectItem key={tag.id} value={tag.id} className="text-xs">{tag.name}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>
            )
          ))}
           {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs h-9 text-muted-foreground hover:text-primary"
            >
              Clear Filters
            </Button>
           )}
        </div>
      )}

      {filteredFiles.length > 0 ? (
        <ul className="space-y-4">
          {filteredFiles.map(file => {
            const channelClasses = getChannelSpecificClasses(file.channel);
            const fileDate = file.updatedAt || file.createdAt; // Use updated_at (set at creation) or fallback to createdAt
            const fileDateFormatted = fileDate ? formatTimeAgo(fileDate) : 'N/A';

            return (
            <li
                key={file.id}
                className={cn(
                    "p-4 border rounded-md bg-card-foreground/10 hover:bg-card-foreground/15 transition-colors shadow-sm",
                    "border-l-4",
                    channelClasses.border // Apply channel-specific border color
                )}
                style={{ borderColor: channelClasses.border }} // Ensure dynamic border color is applied
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div className="flex-grow">
                  <div className="flex items-center mb-1">
                    {file.channel && (
                       <TagBadge
                          tag={file.channel}
                          className={cn("mr-2 text-xs whitespace-nowrap px-2 py-0.5")}
                        />
                    )}
                    <p className="font-medium text-foreground">{file.name}</p>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2 ml-1 space-x-3 flex items-center">
                    <span>Version: {file.versionName}</span>
                    {file.size && <span>Size: {file.size}</span>}
                    <span className="flex items-center">
                        <CalendarDays className="w-3 h-3 mr-1 text-accent/80"/> {fileDateFormatted}
                    </span>
                  </div>
                  
                  {file.fileDisplayTags && file.fileDisplayTags.length > 0 && (
                    <div className="mt-2 mb-2 ml-1">
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <TagsIconLucide className="w-3 h-3 text-muted-foreground mr-0.5"/>
                            {file.fileDisplayTags.map(fTag => <TagBadge key={fTag.id} tag={fTag} className="text-[10px] px-1.5 py-0.5" />)}
                        </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0 self-start sm:self-center mt-2 sm:mt-0 flex items-center gap-2">
                  {file.changelogNotes && (
                     <Dialog open={isChangelogModalOpen && selectedFileForModal?.id === file.id} onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setSelectedFileForModal(null);
                        }
                        setIsChangelogModalOpen(isOpen);
                     }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9 border-accent/50 hover:bg-accent/10" onClick={() => handleOpenChangelogModal(file)} title="View Changelog/Info">
                          <Info className="w-4 h-4 text-accent" />
                        </Button>
                      </DialogTrigger>
                       {selectedFileForModal?.id === file.id && (
                        <DialogContent className="sm:max-w-lg bg-popover text-popover-foreground">
                            <DialogHeader>
                            <DialogTitle className="text-primary">Notes for: {selectedFileForModal.name} (v{selectedFileForModal.versionName})</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Uploaded {selectedFileForModal.updatedAt ? formatTimeAgo(selectedFileForModal.updatedAt) : 'N/A'}
                            </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                                <SimpleMarkdown text={selectedFileForModal.changelogNotes || "No specific notes for this version."} />
                            </div>
                        </DialogContent>
                        )}
                    </Dialog>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="button-outline-glow h-9"
                    onClick={() => handleFileDownloadClick(file.id, file.url, file.name)}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                </div>
              </div>
            </li>
          )})}
        </ul>
      ) : (
        <p className="text-muted-foreground p-4 text-center">
          {files.length > 0 ? "No files match the selected filters." : "No files available for this resource."}
        </p>
      )}
    </div>
  );
}
