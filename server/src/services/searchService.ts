/**
 * searchService.ts — 全局搜索业务逻辑层（ARCH §6.2）
 * GET /api/search?q=&category=decks|notes|cards|all
 * 跨牌组（name/description）、卡片（front/back/tags）与笔记（title/content）的关键词检索
 */

import { getDb } from '../db/connection.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type { SearchResult, SearchCategory } from '../types/index.js';

const MAX_LIMIT = 50;

export const searchService = {
  /**
   * 全局搜索
   * @param q 关键词（必填）
   * @param category all | decks | notes | cards
   * @param limit 每类上限
   */
  search(q: string, category: SearchCategory = 'all', limit = 20): SearchResult {
    const kw = q?.trim();
    if (!kw) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '搜索关键词不能为空', 400);
    }
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    const like = `%${kw}%`;
    const db = getDb();

    const decks: SearchResult['decks'] = [];
    if (category === 'all' || category === 'decks') {
      const rows = db
        .prepare(
          `SELECT d.id, d.name, d.description,
                  (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) AS card_count
           FROM decks d
           WHERE d.name LIKE ? OR d.description LIKE ?
           ORDER BY d.id DESC LIMIT ?`,
        )
        .all(like, like, limit) as any[];
      for (const r of rows) {
        decks.push({
          id: r.id,
          name: r.name,
          description: r.description ?? '',
          cardCount: r.card_count ?? 0,
        });
      }
    }

    const cards: SearchResult['cards'] = [];
    if (category === 'all' || category === 'cards') {
      const rows = db
        .prepare(
          `SELECT c.id, c.deck_id, c.front, c.back, d.name AS deck_name
           FROM cards c LEFT JOIN decks d ON c.deck_id = d.id
           WHERE c.front LIKE ? OR c.back LIKE ? OR c.tags LIKE ?
           ORDER BY c.id DESC LIMIT ?`,
        )
        .all(like, like, like, limit) as any[];
      for (const r of rows) {
        cards.push({
          id: r.id,
          deckId: r.deck_id,
          deckName: r.deck_name,
          front: r.front,
          back: r.back,
        });
      }
    }

    const notes: SearchResult['notes'] = [];
    if (category === 'all' || category === 'notes') {
      const rows = db
        .prepare(
          `SELECT n.id, n.folder_id, n.title, n.content, f.name AS folder_name
           FROM notes n LEFT JOIN folders f ON n.folder_id = f.id
           WHERE n.title LIKE ? OR n.content LIKE ?
           ORDER BY n.id DESC LIMIT ?`,
        )
        .all(like, like, limit) as any[];
      for (const r of rows) {
        notes.push({
          id: r.id,
          folderId: r.folder_id,
          folderName: r.folder_name,
          title: r.title,
          snippet: (r.content ?? '').slice(0, 100),
        });
      }
    }

    return { keyword: kw, decks, cards, notes };
  },
};
