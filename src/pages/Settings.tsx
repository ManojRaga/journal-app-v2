import React, { useState } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Download, Upload, Database, Shield, Bell, Palette, Type, Globe } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export function Settings() {
  const { theme, setTheme } = useAppStore();
  const [activeSection, setActiveSection] = useState('appearance');
  const [notifications, setNotifications] = useState({
    dailyReminder: true,
    weeklyReview: false,
    exportComplete: true,
  });
  const [exportFormat, setExportFormat] = useState('json');
  const [fontSize, setFontSize] = useState('medium');
  const [language, setLanguage] = useState('en');

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data & Export', icon: Database },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'general', label: 'General', icon: SettingsIcon },
  ];

  const handleExportData = async () => {
    try {
      // This would typically call a Tauri command to export data
      console.log(`Exporting data in ${exportFormat} format...`);
      // For now, we'll just show a success message
      alert('Data export initiated. This feature will be implemented with the backend.');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleImportData = () => {
    // This would open a file dialog to import data
    console.log('Opening import dialog...');
    alert('Import feature will be implemented with the backend.');
  };

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'system', label: 'System', icon: SettingsIcon },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value as any)}
              className={clsx(
                'flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200',
                theme === option.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <option.icon className={clsx(
                'h-6 w-6 mb-2',
                theme === option.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'
              )} />
              <span className={clsx(
                'text-sm font-medium',
                theme === option.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
              )}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Font Size</h3>
        <div className="space-y-2">
          {[
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
          ].map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="radio"
                name="fontSize"
                value={option.value}
                checked={fontSize === option.value}
                onChange={(e) => setFontSize(e.target.value)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Reminder Notifications</h3>
        <div className="space-y-4">
          {[
            { key: 'dailyReminder', label: 'Daily writing reminder', description: 'Get reminded to write in your journal every day' },
            { key: 'weeklyReview', label: 'Weekly review prompt', description: 'Weekly prompts to reflect on your entries' },
            { key: 'exportComplete', label: 'Export completion', description: 'Notify when data export is complete' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{item.description}</div>
              </div>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                className={clsx(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  notifications[item.key as keyof typeof notifications] ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                )}
              >
                <span
                  className={clsx(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    notifications[item.key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDataSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Export Data</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Export Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="txt">Plain Text</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <button
            onClick={handleExportData}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export All Entries</span>
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Import Data</h3>
        <button
          onClick={handleImportData}
          className="btn-secondary flex items-center space-x-2"
        >
          <Upload className="h-4 w-4" />
          <span>Import Entries</span>
        </button>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Import journal entries from a JSON or CSV file
        </p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Database className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Data Storage
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>All your journal entries are stored locally on your device. Your data never leaves your computer unless you explicitly export it.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Privacy & Security</h3>
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  Complete Privacy
                </h3>
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <ul className="list-disc list-inside space-y-1">
                    <li>All data is stored locally on your device</li>
                    <li>AI processing happens offline using local models</li>
                    <li>No data is sent to external servers</li>
                    <li>No analytics or tracking</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">AI Model Information</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>• Local LLM model runs entirely on your device</p>
              <p>• No internet connection required for AI features</p>
              <p>• Your conversations and entries remain private</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Language & Region</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ja">日本語</option>
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">About</h3>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>Build:</strong> Development</p>
          <p><strong>Platform:</strong> Desktop (Tauri)</p>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'appearance':
        return renderAppearanceSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'data':
        return renderDataSettings();
      case 'privacy':
        return renderPrivacySettings();
      case 'general':
        return renderGeneralSettings();
      default:
        return renderAppearanceSettings();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Customize your journal experience
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Settings Navigation */}
        <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={clsx(
                  'flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                  activeSection === section.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <section.icon className="h-5 w-5 mr-3" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}