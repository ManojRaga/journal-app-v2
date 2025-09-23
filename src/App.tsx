import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { useAppStore } from './lib/store';
import { systemApi } from './lib/api';
import { Loader } from 'lucide-react';
import "./App.css";

function App() {
  const { theme, initializeApp } = useAppStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Initialize the application
    const initializeApplication = async () => {
      try {
        // Initialize database
        await systemApi.initializeDatabase();

        // Initialize app store
        initializeApp();

        console.log('Application initialized successfully');
      } catch (error) {
        console.error('Failed to initialize application:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApplication();
  }, [initializeApp]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <Loader className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          </div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Initializing AI Journal
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Setting up your private journal database...
          </p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h2 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
              Initialization Failed
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              {initError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Layout />;
}

export default App;