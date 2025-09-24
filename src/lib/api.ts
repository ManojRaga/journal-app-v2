import { invoke } from '@tauri-apps/api/core';
import type { JournalEntry, ChatMessage } from './store';

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
  message: string;
  userId: string;
}

export interface ChatResponse {
  answer: string;
  sources: { content: string }[];
  query: string;
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
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    // Map camelCase to snake_case expected by Rust
    return await invoke('chat_with_ai', { request: { message: request.message, user_id: request.userId } });
  },

  async streamMessage(request: ChatRequest): Promise<void> {
    // For streaming responses, we'll use events
    return await invoke('stream_chat_with_ai', { request });
  },
};

// System API
export const systemApi = {
  async initializeDatabase(): Promise<void> {
    return await invoke('initialize_database');
  },

  async getSystemInfo(): Promise<any> {
    return await invoke('get_system_info');
  },

  async loadLlmModel(modelPath: string): Promise<void> {
    return await invoke('load_llm_model', { modelPath });
  },
};