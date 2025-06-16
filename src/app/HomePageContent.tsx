
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { GameWithDetails } from './page'; 
import { GameCard } from '@/components/game/GameCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ListFilter, Gamepad2 } from 'lucide-react';

type SortOption = 'popularity' | 'name_asc' | 'name_desc' | 'created_desc' | 'created_asc' | 'updated_desc' | 'default';

const calculateGameSearchScore = (game: GameWithDetails, query: string): number => {
  if (!query) return 0;
  const lowerQuery = query.toLowerCase();
  let score = 0;

  // Name scoring (highest priority)
  if (game.name.toLowerCase().includes(lowerQuery)) {
    score += 10;
    if (game.name.toLowerCase().startsWith(lowerQuery)) score += 5; // Boost for starting match
    if (game.name.toLowerCase() === lowerQuery) score += 10; // Major boost for exact match
  }

  // Description scoring
  if (game.description.toLowerCase().includes(lowerQuery)) {
    score += 3;
  }

  // Tags scoring
  if (game.tags) {
    game.tags.forEach(tag => {
      if (tag.name.toLowerCase().includes(lowerQuery)) {
        score += 1;
      }
    });
  }
  return score;
};

export function HomePageContent({ initialGames }: { initialGames: GameWithDetails[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // Debounce search input

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const filteredAndSortedGames = useMemo(() => {
    let gamesToProcess = [...initialGames];

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      gamesToProcess = gamesToProcess
        .map(game => ({
          ...game,
          searchScore: calculateGameSearchScore(game, debouncedSearchQuery),
        }))
        .filter(game => game.searchScore && game.searchScore > 0) // Ensure positive score
        .sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0)); // Sort by score descending
    }

    // Apply sorting unless already sorted by search relevance
    if (!debouncedSearchQuery.trim() || sortBy !== 'default') {
        switch (sortBy) {
        case 'popularity':
            gamesToProcess.sort((a, b) => b.stats.totalDownloads - a.stats.totalDownloads);
            break;
        case 'name_asc':
            gamesToProcess.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name_desc':
            gamesToProcess.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'created_desc': // Latest Added
            gamesToProcess.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            break;
        case 'created_asc': // Oldest Added
            gamesToProcess.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
            break;
        case 'updated_desc': // Recently Updated
            gamesToProcess.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
            break;
        case 'default':
            // If no search and default sort, sort by popularity
            if (!debouncedSearchQuery.trim()) {
                gamesToProcess.sort((a, b) => b.stats.totalDownloads - a.stats.totalDownloads);
            }
            // If there was a search, it's already sorted by relevance (searchScore)
            break;
        }
    }
    
    return gamesToProcess;
  }, [initialGames, debouncedSearchQuery, sortBy]);

  return (
    <div className="space-y-12">
      <section className="text-center py-10">
        <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-6xl lg:text-7xl drop-shadow-lg">
          Welcome to <span className="animate-pulse">PinkStar</span>
        </h1>
        <p className="mt-6 text-xl leading-8 text-foreground/80 max-w-2xl mx-auto">
          Discover, download, and enhance your favorite games with our curated collection of resources.
        </p>
      </section>

      <div className="mb-8 p-4 border rounded-lg bg-card shadow-md sticky top-16 z-40 backdrop-blur-sm bg-background/80">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
          <div className="relative flex-grow w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search games..."
              className="pl-10 w-full text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-full sm:w-auto min-w-[200px]"> {/* Increased min-width */}
              <ListFilter className="w-4 h-4 mr-2 opacity-70" />
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Relevance / Default</SelectItem>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
              <SelectItem value="created_desc">Latest Added</SelectItem>
              <SelectItem value="created_asc">Oldest Added</SelectItem>
              <SelectItem value="updated_desc">Recently Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <section>
        <h2 className="text-4xl font-semibold mb-8 pb-3 border-b-2 border-primary/30 text-center flex items-center justify-center">
            <Gamepad2 className="w-9 h-9 mr-3 text-primary" /> Available Games
        </h2>
        {filteredAndSortedGames.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAndSortedGames.map((game) => (
              <GameCard 
                key={game.id} 
                game={game} 
                categories={game.categories} 
                stats={game.stats} 
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-10 text-lg">
            {debouncedSearchQuery.trim() ? `No games found for "${debouncedSearchQuery}".` : "No games available at the moment. Check back soon!"}
          </p>
        )}
      </section>
    </div>
  );
}
