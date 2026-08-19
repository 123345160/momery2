/**
 * api/search.ts — 全局搜索（FRONTEND §6.3.9）
 */

import client from './client';

export type SearchCategory = 'all' | 'decks' | 'notes' | 'cards';

export interface SearchResult {
  keyword: string;
  decks: {
    id: number;
    name: string;
    description: string;
    cardCount: number;
  }[];
  cards: {
    id: number;
    deckId: number | null;
    deckName: string | null;
    front: string;
    back: string;
  }[];
  notes: {
    id: number;
    folderId: number | null;
    folderName: string | null;
    title: string;
    snippet: string;
  }[];
}

export const searchApi = {
  search: (q: string, category: SearchCategory = 'all', limit = 20) =>
    client.get('/search', { params: { q, category, limit } }) as unknown as Promise<SearchResult>,
};
