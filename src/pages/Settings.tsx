import React, { useState } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Download, Upload, Database, Shield, Bell } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const settingsSections = [
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data & Export', icon: Database },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'about', label: 'About', icon: SettingsIcon },
];

export function Settings() {
  const { theme, setTheme } = useAppStore();
  const [activeSection, setActiveSection] = useState('appearance');
  const [notifications, setNotifications] = useState({
    dailyReminder: true,
    weeklyReview: false,
    exportComplete: true,
  });
  const [exportFormat, setExportFormat] = useState('json');

  const renderAppearance = () => (
    <motion.div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            value: 'light',
            label: 'Light Mode',
            description: 'Bright and uplifting for daytime reflections',
            icon: Sun,
            gradient: 'from-white via-blue-50 to-white',
          },
          {
            value: 'dark',
            label: 'Dark Mode',
            description: 'Nighttime calm with deep contrast',
            icon: Moon,
            gradient: 'from-slate-900 via-gray-900 to-black',
          },
          {
            value: 'system',
            label: 'System',
            description: 'Follow your device preference automatically',
            icon: SettingsIcon,
            gradient: 'from-gray-100 via-gray-50 to-gray-200',
          },
        ].map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;
          return (
            <motion.button
              key={option.value}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setTheme(option.value as 'light' | 'dark')}
              className={clsx(
                'relative overflow-hidden rounded-3xl border backdrop-blur-xl text-left transition-all duration-500',
                isActive
                  ? 'border-primary-500/50 shadow-xl shadow-primary-500/20'
                  : 'border-white/70 dark:border-white/10 hover:border-primary-400/40 hover:shadow-lg'
              )}
            >
              <div className={clsx('absolute inset-0 bg-gradient-to-br opacity-90', option.gradient)} />
              <div className="relative space-y-4 p-6">
                <div className={clsx('inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 shadow-lg', isActive ? 'text-primary-600' : 'text-gray-500')}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={clsx('text-lg font-semibold', isActive ? 'text-primary-700' : 'text-gray-800 dark:text-gray-100')}>
                    {option.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300/80">{option.description}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Reminder Notifications</h3>
        <div className="space-y-4">
          {[
            { key: 'dailyReminder', label: 'Daily writing reminder', description: 'Get reminded to write every day.' },
            { key: 'weeklyReview', label: 'Weekly review prompt', description: 'Get gentle prompts for weekly reflection.' },
            { key: 'exportComplete', label: 'Export completion', description: 'Know when exports finish processing.' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-gray-950/50">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{item.description}</div>
              </div>
              <button
                onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
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

  const renderData = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl dark:border-white/10 dark:bg-gray-950/60">
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Export Data</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="block w-full rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400 dark:border-white/10 dark:bg-gray-900/60 dark:text-white"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="txt">Plain Text</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <button onClick={() => alert('Data export initiated.')} className="btn-primary">
            <span className="relative z-10 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export all entries
            </span>
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl dark:border-white/10 dark:bg-gray-950/60">
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Import Data</h3>
        <button onClick={() => alert('Import feature coming soon.')} className="btn-secondary">
          <span className="relative flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import entries
          </span>
        </button>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Import journals from JSON or CSV files.</p>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl dark:border-white/10 dark:bg-gray-950/60">
        <div className="flex items-start space-x-3">
          <Shield className="mt-1 h-5 w-5 text-green-500" />
          <div>
            <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">Complete Privacy</h3>
            <p className="mt-2 text-sm text-green-700/80 dark:text-green-200/80">
              Everything lives on your device—entries, embeddings, and responses. Offline-first, privacy-first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl dark:border-white/10 dark:bg-gray-950/60">
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">About</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          AI Journal is crafted for deep reflection with complete privacy. Every insight is generated locally for a serene, private experience.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2">
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Version</span>
            <p>1.0.0 · Dev Build</p>
          </div>
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Platform</span>
            <p>Tauri Desktop (macOS)</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'appearance':
        return renderAppearance();
      case 'notifications':
        return renderNotifications();
      case 'data':
        return renderData();
      case 'privacy':
        return renderPrivacy();
      case 'about':
        return renderAbout();
      default:
        return renderAppearance();
    }
  };

  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-primary-50/20 to-amber-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-black" />
      <div className="absolute inset-0 opacity-30 dark:opacity-20">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-primary-200/60 blur-3xl" />
        <div className="absolute -bottom-24 right-[-10%] h-96 w-96 rounded-full bg-amber-200/50 blur-3xl" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-white/70 px-8 py-6 backdrop-blur-xl dark:border-white/10">
          <div className="flex items-center space-x-3">
            <div className="rounded-2xl bg-gradient-to-br from-primary-500 to-amber-400 p-3 shadow-lg shadow-primary-500/30">
              <SettingsIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Settings</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Shape your journaling sanctuary</p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 overflow-y-auto border-r border-white/60 bg-white/70 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/50">
            <nav className="space-y-2">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <motion.button
                    key={section.id}
                    whileHover={{ x: 6 }}
                    onClick={() => setActiveSection(section.id)}
                    className={clsx(
                      'relative flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300',
                      isActive
                        ? 'bg-white text-primary-700 shadow-md shadow-primary-500/10 dark:bg-primary-900/30 dark:text-primary-200'
                        : 'text-gray-600 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-800/70'
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {section.label}
                  </motion.button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: [0.21, 1, 0.21, 1] }}
                  className="space-y-8"
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}