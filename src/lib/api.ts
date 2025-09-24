import { invoke } from '@tauri-apps/api/core';
import type { JournalEntry } from './store';
import { useAppStore } from './store';

// Tauri command wrappers for type safety

export interface CreateEntryRequest {
  title: string;
  body: string;
  mood?: string;
  tags?: string[];
}

export interface UpdateEntryRequest {
  id: string;
  title?: string;
  body?: string;
  mood?: string;
  tags?: string[];
}

export interface SearchRequest {
  query: string;
  limit?: number;
}

export interface ChatRequest {
  user_id: string;
  message: string;
  conversation_id?: string;
}

export interface ChatResponse {
  answer: string;
  sources: any[];
  conversation_id: string;
}

// Journal API
export const journalApi = {
  async createEntry(entry: CreateEntryRequest): Promise<JournalEntry> {
    return await invoke('create_entry', { request: entry });
  },

  async getEntries(): Promise<JournalEntry[]> {
    return await invoke('get_entries');
  },

  async getEntry(id: string): Promise<JournalEntry | null> {
    return await invoke('get_entry', { id });
  },

  async updateEntry(request: UpdateEntryRequest): Promise<JournalEntry | null> {
    return await invoke('update_entry', { request });
  },

  async deleteEntry(id: string): Promise<boolean> {
    return await invoke('delete_entry', { id });
  },

  async searchEntries(request: SearchRequest): Promise<JournalEntry[]> {
    return await invoke('search_entries', { request });
  },
};

// AI Chat API
export const chatApi = {
  async sendMessage(message: string): Promise<ChatResponse> {
    const userId = useAppStore.getState().userId;
    if (!userId) {
      throw new Error('User not initialized');
    }
    
    const response = await invoke<ChatResponse>('chat_with_ai', {
      request: {
        user_id: userId,
        message,
        conversation_id: null,
      },
    });
    
    return response;
  },
};

// System API
export const systemApi = {
  async initializeDatabase(): Promise<string> {
    const userId = await invoke<string>('initialize_database');
    const { setUserId } = useAppStore.getState();
    setUserId(userId);
    return userId;
  },

  async getSystemInfo(): Promise<any> {
    return await invoke('get_system_info');
  },

  async loadLlmModel(modelPath: string): Promise<void> {
    return await invoke('load_llm_model', { modelPath });
  },
};