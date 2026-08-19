/**
 * 牌组 API 模块（FRONTEND §6.3.1）
 * 对应后端：GET/POST /api/decks、GET/PUT/DELETE /api/decks/:id
 */

import client from './client';
import type {
  CreateDeckDto,
  Deck,
  DeckListItem,
  DeckQueryParams,
  PaginatedResponse,
  UpdateDeckDto,
} from '@/types';

/** GET /api/decks — 牌组列表（含 card_count/due_count 聚合字段，分页响应） */
export function getDecks(params?: DeckQueryParams): Promise<PaginatedResponse<DeckListItem>> {
  return client.get('/decks', { params }) as unknown as Promise<PaginatedResponse<DeckListItem>>;
}

/** GET /api/decks/:id — 牌组详情 */
export function getDeck(id: number): Promise<DeckListItem> {
  return client.get(`/decks/${id}`) as unknown as Promise<DeckListItem>;
}

/** POST /api/decks — 创建牌组 */
export function createDeck(data: CreateDeckDto): Promise<Deck> {
  return client.post('/decks', data) as unknown as Promise<Deck>;
}

/** PUT /api/decks/:id — 更新牌组 */
export function updateDeck(id: number, data: UpdateDeckDto): Promise<Deck> {
  return client.put(`/decks/${id}`, data) as unknown as Promise<Deck>;
}

/** DELETE /api/decks/:id — 删除牌组 */
export function deleteDeck(id: number): Promise<void> {
  return client.delete(`/decks/${id}`) as unknown as Promise<void>;
}
