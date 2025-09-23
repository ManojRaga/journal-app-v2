import { Sidebar } from './Sidebar';
import { Timeline } from '../pages/Timeline';
import { Editor } from '../pages/Editor';
import { Chat } from '../pages/Chat';
import { Search } from '../pages/Search';
import { Settings } from '../pages/Settings';
import { useAppStore } from '../lib/store';
import clsx from 'clsx';

export function Layout() {
  const { theme, currentPage } = useAppStore();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'timeline':
        return <Timeline />;
      case 'editor':
        return <Editor />;
      case 'chat':
        return <Chat />;
      case 'search':
        return <Search />;
      case 'settings':
        return <Settings />;
      default:
        return <Timeline />;
    }
  };

  return (
    <div className={clsx('min-h-screen flex', theme === 'dark' ? 'dark' : '')}>
      <Sidebar />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {renderCurrentPage()}
      </main>
    </div>
  );
}