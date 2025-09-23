import React from 'react';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Edit } from 'lucide-react';

export function Reader() {
  const { currentEntry, setCurrentPage } = useAppStore();

  if (!currentEntry) {
    setCurrentPage('timeline');
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentPage('timeline')}
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{currentEntry.title}</h1>
          </div>
          <button
            onClick={() => setCurrentPage('editor')}
            className="btn-primary flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="prose dark:prose-invert max-w-none text-lg leading-relaxed">
            <p className="whitespace-pre-wrap">{currentEntry.body}</p>
          </div>
        </div>
      </div>
    </div>
  );
}


