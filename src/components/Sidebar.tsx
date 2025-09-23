import React from 'react';
import {
  BookOpen,
  MessageCircle,
  Search,
  Settings,
  PenSquare,
  Moon,
  Sun
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import clsx from 'clsx';

const navigation = [
  { name: 'Timeline', icon: BookOpen, page: 'timeline' as const },
  { name: 'New Entry', icon: PenSquare, page: 'editor' as const },
  { name: 'Chat', icon: MessageCircle, page: 'chat' as const },
  { name: 'Search', icon: Search, page: 'search' as const },
  { name: 'Settings', icon: Settings, page: 'settings' as const },
];

export function Sidebar() {
  const { currentPage, setCurrentPage, theme, setTheme, setCurrentEntry } = useAppStore();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          AI Journal
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your private reflection space
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.page;

          return (
            <button
              key={item.name}
              onClick={() => {
                if (item.page === 'editor') {
                  setCurrentEntry(null);
                }
                setCurrentPage(item.page);
              }}
              className={clsx(
                'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                isActive
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors duration-200"
        >
          {theme === 'light' ? (
            <>
              <Moon className="mr-3 h-5 w-5" />
              Dark Mode
            </>
          ) : (
            <>
              <Sun className="mr-3 h-5 w-5" />
              Light Mode
            </>
          )}
        </button>
      </div>
    </div>
  );
}