import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Calendar, Tag, Heart, X } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { journalApi } from '../lib/api';
import { EntryCard } from '../components/EntryCard';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const moods = ['happy', 'sad', 'excited', 'calm', 'anxious', 'grateful', 'frustrated', 'content'];

export function Search() {
  const { searchQuery, setSearchQuery, searchResults, setSearchResults } = useAppStore();
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: '',
    mood: '',
    tags: [] as string[],
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await journalApi.searchEntries({
        query: searchQuery.trim(),
        limit: 50,
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setFilters({ dateRange: '', mood: '', tags: [] });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType as keyof typeof prev] === value ? '' : value
    }));
  };

  const handleTagFilter = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const filteredResults = searchResults.filter(entry => {
    if (filters.mood && entry.mood !== filters.mood) return false;
    if (filters.tags.length > 0 && !filters.tags.some(tag => entry.tags?.includes(tag))) return false;
    if (filters.dateRange) {
      const entryDate = new Date(entry.createdAt);
      const now = new Date();
      switch (filters.dateRange) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (entryDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (entryDate < monthAgo) return false;
          break;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          if (entryDate < yearAgo) return false;
          break;
      }
    }
    return true;
  });

  // Get unique tags from all entries for filter options
  const allTags = [...new Set(searchResults.flatMap(entry => entry.tags || []))];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Search Journal
            </h1>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'btn-secondary flex items-center space-x-2',
                showFilters && 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              )}
            >
              <SearchIcon className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search your journal entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date Range
                </label>
                <div className="flex space-x-2">
                  {[
                    { value: 'week', label: 'Past Week' },
                    { value: 'month', label: 'Past Month' },
                    { value: 'year', label: 'Past Year' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange('dateRange', option.value)}
                      className={clsx(
                        'px-3 py-1 rounded-full text-sm transition-colors duration-200',
                        filters.dateRange === option.value
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500 dark:ring-primary-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Heart className="inline h-4 w-4 mr-1" />
                  Mood
                </label>
                <div className="flex flex-wrap gap-2">
                  {moods.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => handleFilterChange('mood', mood)}
                      className={clsx(
                        'px-3 py-1 rounded-full text-sm capitalize transition-colors duration-200',
                        filters.mood === mood
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500 dark:ring-primary-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      )}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags Filter */}
              {allTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Tag className="inline h-4 w-4 mr-1" />
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagFilter(tag)}
                        className={clsx(
                          'px-3 py-1 rounded-full text-sm transition-colors duration-200',
                          filters.tags.includes(tag)
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500 dark:ring-primary-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : searchQuery.trim() === '' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <SearchIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                Search your journal
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Find specific entries, topics, or memories from your journal.
              </p>
            </motion.div>
          ) : filteredResults.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <SearchIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No results found
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Try adjusting your search terms or filters.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Found {filteredResults.length} {filteredResults.length === 1 ? 'entry' : 'entries'}
              </p>
              <div className="space-y-6">
                {filteredResults.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <EntryCard entry={entry} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}