/**
 * 复习 API 模块（FRONTEND §6.3.3）
 * 对应后端：GET /api/decks/:deckId/due、POST /api/cards/:id/review、GET /api/decks/:deckId/review-progress
 */

import client from './client';
import type { Card, ReviewProgress, ReviewResult } from '@/types';

/** GET /api/decks/:deckId/due — 当前牌组到期卡片队列 */
export function getDueCards(deckId: number): Promise<Card[]> {
  return client.get(`/decks/${deckId}/due`) as unknown as Promise<Card[]>;
}

/** POST /api/cards/:id/review — 提交复习评分（forgot/hard/good/easy） */
export function submitReview(cardId: number, result: ReviewResult): Promise<Card> {
  return client.post(`/cards/${cardId}/review`, { result }) as unknown as Promise<Card>;
}

/** GET /api/decks/:deckId/review-progress — 牌组复习进度统计 */
export function getReviewProgress(deckId: number): Promise<ReviewProgress> {
  return client.get(`/decks/${deckId}/review-progress`) as unknown as Promise<ReviewProgress>;
}
