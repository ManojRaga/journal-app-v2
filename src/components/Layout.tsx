import React from 'react';
import { Sidebar } from './Sidebar';
import { useAppStore } from '../lib/store';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const theme = useAppStore((state) => state.theme);

  return (
    <div className={clsx('min-h-screen flex', theme === 'dark' ? 'dark' : '')}>
      <Sidebar />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {children}
      </main>
    </div>
  );
}