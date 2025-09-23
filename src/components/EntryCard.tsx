import React from 'react';
import { format } from 'date-fns';
import { Clock, Heart, Tag, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { JournalEntry } from '../lib/store';
import { useAppStore } from '../lib/store';
import { journalApi } from '../lib/api';
import clsx from 'clsx';

interface EntryCardProps {
  entry: JournalEntry;
}

const moodEmojis: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  excited: '🤩',
  anxious: '😰',
  calm: '😌',
  grateful: '🙏',
  frustrated: '😤',
  content: '😌',
  overwhelmed: '😵',
};

export function EntryCard({ entry }: EntryCardProps) {
  const { setCurrentEntry, setCurrentPage, entries, setEntries } = useAppStore();
  const [showMenu, setShowMenu] = React.useState(false);

  const handleEdit = () => {
    setCurrentEntry(entry);
    setCurrentPage('editor');
    setShowMenu(false);
  };

  const handleDelete = async () => {
    try {
      const confirmed = await confirm('Are you sure you want to delete this entry?');
      if (confirmed) {
        await journalApi.deleteEntry(entry.id);
        const updatedEntries = entries.filter(e => e.id !== entry.id);
        setEntries(updatedEntries);
      }
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
    setShowMenu(false);
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="entry-card group relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {entry.title}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(entry.createdAt), 'MMM d, yyyy')}</span>
            </div>
            {entry.mood && (
              <div className="flex items-center space-x-1">
                <span>{moodEmojis[entry.mood] || '😊'}</span>
                <span className="capitalize">{entry.mood}</span>
              </div>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1">
                <button
                  onClick={handleEdit}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          {truncateContent(entry.body)}
        </p>
      </div>

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex items-center space-x-2 mb-4">
          <Tag className="h-4 w-4 text-gray-400" />
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>
          {entry.createdAt !== entry.updatedAt && 'Updated '}
          {format(new Date(entry.updatedAt), 'h:mm a')}
        </span>
        <button
          onClick={handleEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-primary-600 dark:hover:text-primary-400"
        >
          Read more →
        </button>
      </div>

      {/* Click overlay for card interaction */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={handleEdit}
      />
    </div>
  );
}