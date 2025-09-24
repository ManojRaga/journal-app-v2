import React from 'react';
import { BookOpen, MessageCircle, Search, Settings, PenSquare } from 'lucide-react';
import { useAppStore } from '../lib/store';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const navigation = [
  { name: 'Timeline', icon: BookOpen, page: 'timeline' as const },
  { name: 'New Entry', icon: PenSquare, page: 'editor' as const },
  { name: 'Chat', icon: MessageCircle, page: 'chat' as const },
  { name: 'Search', icon: Search, page: 'search' as const },
  { name: 'Settings', icon: Settings, page: 'settings' as const },
];

export function Sidebar() {
  const { currentPage, setCurrentPage, setCurrentEntry } = useAppStore();

  return (
    <div className="relative w-68 bg-white/90 dark:bg-gray-950/70 border-r border-white/60 dark:border-white/10 shadow-xl backdrop-blur-2xl flex flex-col">
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute -top-12 -left-10 h-24 w-24 rounded-full bg-primary-200 blur-3xl" />
        <div className="absolute bottom-0 right-4 h-32 w-32 rounded-full bg-amber-200 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative p-6 border-b border-white/70 dark:border-white/10">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
          AI Journal
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your private reflection space
        </p>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 p-4 space-y-2">
        {navigation.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentPage === item.page;

          return (
            <motion.button
              key={item.name}
              layout
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (item.page === 'editor') {
                  setCurrentEntry(null);
                }
                setCurrentPage(item.page);
              }}
              className={clsx(
                'relative w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300',
                isActive
                  ? 'bg-white shadow-lg shadow-primary-500/10 text-primary-700 dark:text-primary-200 dark:bg-primary-900/30'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 hover:shadow'
              )}
              style={{
                boxShadow: isActive ? '0 25px 45px -20px rgba(59,130,246,0.35)' : undefined,
              }}
            >
              <Icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl border border-primary-500/40 dark:border-primary-300/30"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative p-4 border-t border-white/60 dark:border-white/10">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
          Crafted for mindful reflection
        </p>
      </div>
    </div>
  );
}