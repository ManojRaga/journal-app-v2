import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Types
export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  mood?: string;
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  sources?: string[];
}

interface AppState {
  userId: string | null;
  // UI State
  theme: 'light' | 'dark';
  currentPage: 'timeline' | 'editor' | 'reader' | 'chat' | 'search' | 'settings';

  // Journal State
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  isLoading: boolean;

  // Chat State
  chatMessages: ChatMessage[];
  isChatLoading: boolean;

  // Search State
  searchQuery: string;
  searchResults: JournalEntry[];

  // Actions
  initializeApp: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setUserId: (userId: string | null) => void;
  setCurrentPage: (page: 'timeline' | 'editor' | 'reader' | 'chat' | 'search' | 'settings') => void;

  // Journal Actions
  setEntries: (entries: JournalEntry[]) => void;
  addEntry: (entry: JournalEntry) => void;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteEntry: (id: string) => void;
  setCurrentEntry: (entry: JournalEntry | null) => void;
  setIsLoading: (loading: boolean) => void;

  // Chat Actions
  addChatMessage: (message: ChatMessage) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  setIsChatLoading: (loading: boolean) => void;

  // Search Actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: JournalEntry[]) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial State
      userId: null,
      theme: 'light',
      currentPage: 'timeline',

      entries: [],
      currentEntry: null,
      isLoading: false,

      chatMessages: [],
      isChatLoading: false,

      searchQuery: '',
      searchResults: [],

      // UI Actions
      initializeApp: () => {
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem('journal-app-theme') as 'light' | 'dark' | null;
        if (savedTheme) {
          set({ theme: savedTheme });
        }

        const savedUserId = localStorage.getItem('journal-app-user-id');
        if (savedUserId) {
          set({ userId: savedUserId });
        }
      },
      setTheme: (theme) => {
        localStorage.setItem('journal-app-theme', theme);
        set({ theme });
      },
      setUserId: (userId) => {
        if (userId) {
          localStorage.setItem('journal-app-user-id', userId);
        } else {
          localStorage.removeItem('journal-app-user-id');
        }
        set({ userId });
      },
      setCurrentPage: (currentPage) => set({ currentPage }),

      // Journal Actions
      setEntries: (entries) => set({ entries }),
      addEntry: (entry) => set((state) => ({
        entries: [entry, ...state.entries]
      })),
      updateEntry: (id, updates) => set((state) => ({
        entries: state.entries.map(entry =>
          entry.id === id ? { ...entry, ...updates } : entry
        ),
        currentEntry: state.currentEntry?.id === id
          ? { ...state.currentEntry, ...updates }
          : state.currentEntry
      })),
      deleteEntry: (id) => set((state) => ({
        entries: state.entries.filter(entry => entry.id !== id),
        currentEntry: state.currentEntry?.id === id ? null : state.currentEntry
      })),
      setCurrentEntry: (entry) => set({ currentEntry: entry }),
      setIsLoading: (isLoading) => set({ isLoading }),

      // Chat Actions
      addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, message]
      })),
      setChatMessages: (chatMessages) => set({ chatMessages }),
      setIsChatLoading: (isChatLoading) => set({ isChatLoading }),

      // Search Actions
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearchResults: (searchResults) => set({ searchResults }),
    }),
    {
      name: 'journal-app-store',
    }
  )
);