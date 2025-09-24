import { Sidebar } from './Sidebar';
import { Timeline } from '../pages/Timeline';
import { Editor } from '../pages/Editor';
import { Reader } from '../pages/Reader';
import { Chat } from '../pages/Chat';
import { Search } from '../pages/Search';
import { Settings } from '../pages/Settings';
import { useAppStore } from '../lib/store';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

export function Layout() {
  const { theme, currentPage } = useAppStore();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'timeline':
        return <Timeline />;
      case 'editor':
        return <Editor />;
      case 'reader':
        return <Reader />;
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

  const transitionVariants = {
    initial: { opacity: 0, y: 24, scale: 0.98 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.45,
        ease: [0.21, 1, 0.21, 1],
      },
    },
    exit: {
      opacity: 0,
      y: -24,
      scale: 0.98,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  return (
    <div
      className={clsx(
        'min-h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-black',
        theme === 'dark' ? 'dark' : ''
      )}
    >
      <Sidebar />
      <main className="relative flex-1 px-8 py-10 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-40">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-200 dark:bg-primary-900/40 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-12 w-80 h-80 bg-amber-100 dark:bg-amber-500/20 blur-3xl rounded-full" />
        </div>
        <div className="relative h-full rounded-3xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-gray-950/70 shadow-[0_35px_120px_-45px_rgba(0,0,0,0.45)] backdrop-blur-2xl p-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              variants={transitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full overflow-hidden"
            >
              {renderCurrentPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}