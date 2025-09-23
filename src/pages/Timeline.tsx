import React, { useEffect } from 'react';
import { Plus, Clock, Heart, Tag } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { journalApi } from '../lib/api';
import { EntryCard } from '../components/EntryCard';
import { motion } from 'framer-motion';

export function Timeline() {
  const { entries, setEntries, isLoading, setIsLoading, setCurrentPage } = useAppStore();

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const entriesData = await journalApi.getEntries();
      setEntries(entriesData);
    } catch (error) {
      console.error('Failed to load entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewEntry = () => {
    setCurrentPage('editor');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Journal Timeline
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
          <button
            onClick={handleNewEntry}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <BookIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Start your journaling journey
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Create your first entry to begin reflecting and tracking your thoughts.
            </p>
            <button
              onClick={handleNewEntry}
              className="mt-6 btn-primary flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Write your first entry</span>
            </button>
          </motion.div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {entries.map((entry, index) => (
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
        )}
      </div>
    </div>
  );
}

// Book icon component
function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}