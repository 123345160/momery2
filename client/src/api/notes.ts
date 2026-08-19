/**
 * api/notes.ts — 笔记（FRONTEND §6.3.7）
 */

import client from './client';
import type { Note } from '@/types';

export interface CreateNoteDto {
  folderId?: number | null;
  title: string;
  content?: string;
  isToday?: number;
  tags?: string;
}

export interface UpdateNoteDto {
  folderId?: number | null;
  title?: string;
  content?: string;
  isToday?: number;
  tags?: string;
}

export interface ConvertResult {
  cards: { front: string; back: string }[];
  cardCount: number;
}

export const notesApi = {
  list: (folderId?: number | null) =>
    client.get('/notes', { params: { folderId: folderId ?? null } }) as unknown as Promise<Note[]>,
  today: () => client.get('/notes/today') as unknown as Promise<Note[]>,
  get: (id: number) => client.get(`/notes/${id}`) as unknown as Promise<Note>,
  create: (data: CreateNoteDto) =>
    client.post('/notes', data) as unknown as Promise<{ id: number }>,
  update: (id: number, data: UpdateNoteDto) =>
    client.put(`/notes/${id}`, data) as unknown as Promise<null>,
  remove: (id: number) => client.delete(`/notes/${id}`) as unknown as Promise<null>,
  extract: (id: number) =>
    client.get(`/notes/${id}/extract`) as unknown as Promise<ConvertResult>,
  convert: (id: number, deckId: number) =>
    client.post(`/notes/${id}/convert`, { deckId }) as unknown as Promise<ConvertResult>,
};
