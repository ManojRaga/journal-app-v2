import React, { useState, useEffect } from 'react';
import { Save, X, Hash, Heart } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { journalApi } from '../lib/api';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';

const moods = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'sad', label: 'Sad', emoji: '😢' },
  { value: 'excited', label: 'Excited', emoji: '🤩' },
  { value: 'calm', label: 'Calm', emoji: '😌' },
  { value: 'anxious', label: 'Anxious', emoji: '😰' },
  { value: 'grateful', label: 'Grateful', emoji: '🙏' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😤' },
  { value: 'content', label: 'Content', emoji: '😌' },
];

export function Editor() {
  const { currentEntry, setCurrentEntry, setCurrentPage, entries, setEntries, addEntry, updateEntry } = useAppStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!currentEntry;
  const isButtonDisabled = isSaving || !title.trim() || !body.trim();

  useEffect(() => {
    if (currentEntry) {
      setTitle(currentEntry.title);
      setBody(currentEntry.body);
      setMood(currentEntry.mood || '');
      setTags(currentEntry.tags || []);
    } else {
      // Clear form for new entry
      setTitle('');
      setBody('');
      setMood('');
      setTags([]);
    }
  }, [currentEntry]);

  const handleSave = async () => {
    console.log('=== SAVE BUTTON CLICKED ===');
    console.log('Title:', title);
    console.log('Body:', body);
    console.log('Button disabled:', isButtonDisabled);

    if (!title.trim() || !body.trim()) {
      console.log('Missing title or body');
      console.log('Missing title or body - please fill in both title and content');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Setting saving state to true');

      if (isEditing && currentEntry) {
        console.log('Updating existing entry:', currentEntry.id);
        // Update existing entry
        const updatedEntry = await journalApi.updateEntry({
          id: currentEntry.id,
          title: title.trim(),
          body: body.trim(),
          mood: mood || undefined,
          tags: tags.length > 0 ? tags : undefined,
        });

        if (updatedEntry) {
          updateEntry(currentEntry.id, updatedEntry);
          console.log('Entry updated successfully!');
        } else {
          throw new Error('Failed to update entry');
        }
      } else {
        console.log('Creating new entry');
        // Create new entry
        const createRequest = {
          title: title.trim(),
          body: body.trim(),
          mood: mood || undefined,
          tags: tags.length > 0 ? tags : undefined,
        };

        console.log('Create request:', createRequest);
        const newEntry = await journalApi.createEntry(createRequest);
        console.log('New entry created:', newEntry);
        addEntry(newEntry);
        console.log('Entry saved successfully!');
      }

      // Navigate back to timeline
      setCurrentEntry(null);
      setCurrentPage('timeline');
    } catch (error) {
      console.error('Save error:', error);
      console.error('Failed to save entry:', error);
    } finally {
      setIsSaving(false);
      console.log('Setting saving state to false');
    }
  };

  const handleCancel = () => {
    setCurrentEntry(null);
    setCurrentPage('timeline');
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Entry' : 'New Entry'}
          </h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              className="btn-secondary flex items-center space-x-2"
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button clicked! Debug:', {
                  disabled: isButtonDisabled,
                  title: title.length,
                  body: body.length,
                  isSaving
                });
                handleSave();
              }}
              className="btn-primary flex items-center space-x-2"
              disabled={isButtonDisabled}
              style={{ zIndex: 10000 }}
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Title */}
          <div>
            <input
              type="text"
              placeholder="Entry title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white resize-none"
              autoFocus
            />
          </div>

          {/* Mood and Tags Row */}
          <div className="flex flex-wrap gap-6">
            {/* Mood Selector */}
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Heart className="inline h-4 w-4 mr-1" />
                Mood
              </label>
              <div className="flex flex-wrap gap-2">
                {moods.map((moodOption) => (
                  <button
                    key={moodOption.value}
                    onClick={() => setMood(mood === moodOption.value ? '' : moodOption.value)}
                    className={clsx(
                      'flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors duration-200',
                      mood === moodOption.value
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500 dark:ring-primary-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    )}
                  >
                    <span>{moodOption.emoji}</span>
                    <span>{moodOption.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Hash className="inline h-4 w-4 mr-1" />
                Tags
              </label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyPress}
                    className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-md transition-colors duration-200"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-primary-500 hover:text-primary-700 dark:hover:text-primary-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Editor */}
          <div>
            <AutoResizeTextarea
              placeholder="Start writing your thoughts..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {/* Removed debug button */}
        </div>
      </div>
    </div>
  );
}

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full bg-transparent border-none outline-none resize-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white text-lg leading-relaxed"
      style={{ fontFamily: 'Merriweather, serif', overflow: 'hidden' }}
      rows={1}
    />
  );
}