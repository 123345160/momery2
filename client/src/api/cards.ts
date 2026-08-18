/**
 * 卡片 API 模块（FRONTEND §6.3.2）
 * 对应后端：GET /api/decks/:deckId/cards、POST/PUT/DELETE /api/cards/:id
 */

import client from './client';
import type { Card, CardQueryParams, CreateCardDto, UpdateCardDto } from '@/types';

/** GET /api/decks/:deckId/cards — 牌组内卡片列表 */
export function getCards(deckId: number, params?: CardQueryParams): Promise<Card[]> {
  return client.get(`/decks/${deckId}/cards`, { params }) as unknown as Promise<Card[]>;
}

/** POST /api/decks/:deckId/cards — 创建单张卡片 */
export function createCard(deckId: number, data: CreateCardDto): Promise<Card> {
  return client.post(`/decks/${deckId}/cards`, data) as unknown as Promise<Card>;
}

/** POST /api/decks/:deckId/cards/batch — 批量创建卡片 */
export function createCardBatch(deckId: number, data: CreateCardDto[]): Promise<Card[]> {
  return client.post(`/decks/${deckId}/cards/batch`, { cards: data }) as unknown as Promise<Card[]>;
}

/** PUT /api/cards/:id — 更新卡片 */
export function updateCard(id: number, data: UpdateCardDto): Promise<Card> {
  return client.put(`/cards/${id}`, data) as unknown as Promise<Card>;
}

/** DELETE /api/cards/:id — 删除卡片 */
export function deleteCard(id: number): Promise<void> {
  return client.delete(`/cards/${id}`) as unknown as Promise<void>;
}
