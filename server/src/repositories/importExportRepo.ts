/**
 * importExportRepo.ts — 导入导出数据访问层（ARCH §10 / §6.2.11）
 *
 * 职责：
 * - 导出查询：全量/单牌组的复习记录（reviewLogRepo 无 getAll/getByDeck 全量方法）
 * - 导入幂等查询：按名查牌组、按 deckId+front 查卡片（R10 同名追加非重复）
 * - 导入写入：含 SM-2 全字段插卡片（cardRepo.insert 只插 5 字段）、
 *   指定 reviewed_at 插复习记录（reviewLogRepo.insert 用 datetime('now') 默认）
 *
 * 注意：导入写入方法不自行开事务，由 service 层 runInTransaction 包裹
 */

import { getDb } from '../db/connection.js';
import type { ReviewLog, Deck, Card } from '../types/index.js';

export const importExportRepo = {
  // ===== 导出查询 =====

  /** 获取全部复习记录（导出全量用，按时间正序） */
  getReviewLogsAll(): ReviewLog[] {
    return getDb()
      .prepare('SELECT * FROM review_logs ORDER BY reviewed_at ASC')
      .all() as ReviewLog[];
  },

  /** 获取单牌组的全部复习记录（导出单牌组用，按时间正序） */
  getReviewLogsByDeck(deckId: number): ReviewLog[] {
    return getDb()
      .prepare('SELECT * FROM review_logs WHERE deck_id = ? ORDER BY reviewed_at ASC')
      .all(deckId) as ReviewLog[];
  },

  // ===== 导入幂等查询（R10：同名牌组追加非重复卡片）=====

  /** 按名查牌组（幂等检测：同名则合并） */
  getDeckByName(name: string): Deck | null {
    const row = getDb()
      .prepare('SELECT * FROM decks WHERE name = ?')
      .get(name) as Deck | undefined;
    return row ?? null;
  },

  /** 按 deckId + front 查卡片（幂等检测：同 front 则跳过） */
  getCardByDeckAndFront(deckId: number, front: string): Card | null {
    const row = getDb()
      .prepare('SELECT * FROM cards WHERE deck_id = ? AND front = ?')
      .get(deckId, front) as Card | undefined;
    return row ?? null;
  },

  // ===== 导入写入（在 service 层 runInTransaction 内调用）=====

  /**
   * 插入卡片（含 SM-2 状态全字段，导入恢复进度用）
   * source_note 固定 NULL（V1.0 notes 表未实现，导入卡片无源笔记关联）
   */
  insertCardWithState(params: {
    deckId: number;
    front: string;
    back: string;
    tags: string; // JSON 字符串 '["a","b"]'
    ease_factor: number;
    interval: number;
    repetitions: number;
    next_review: string; // DB 格式 YYYY-MM-DD HH:MM:SS
    last_reviewed: string | null; // DB 格式或 null
  }): number {
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO cards
         (deck_id, front, back, source_note, tags, ease_factor, interval, repetitions, next_review, last_reviewed)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        params.deckId,
        params.front,
        params.back,
        params.tags,
        params.ease_factor,
        params.interval,
        params.repetitions,
        params.next_review,
        params.last_reviewed
      );
    return Number(result.lastInsertRowid);
  },

  /**
   * 插入复习记录（指定 reviewed_at，导入恢复历史用）
   * 与 reviewLogRepo.insert 不同：后者用 datetime('now') 默认，本方法显式指定日期
   */
  insertReviewLogWithDate(params: {
    cardId: number;
    deckId: number;
    result: string;
    reviewedAt: string; // DB 格式 YYYY-MM-DD HH:MM:SS
  }): number {
    const db = getDb();
    const result = db
      .prepare(
        'INSERT INTO review_logs (card_id, deck_id, result, reviewed_at) VALUES (?, ?, ?, ?)'
      )
      .run(params.cardId, params.deckId, params.result, params.reviewedAt);
    return Number(result.lastInsertRowid);
  },
};
