/**
 * reviewLogRepo.ts — review_logs 表数据访问层（DB §6.3.5）
 * 追加写入表，无 UPDATE 操作
 */

import { getDb } from '../db/connection.js';
import type { ReviewLog, ReviewLogInsertDTO, CalendarDay, StatsByResult } from '../types/index.js';

export const reviewLogRepo = {
  /** 插入复习记录 */
  insert(dto: ReviewLogInsertDTO): number {
    const db = getDb();
    const result = db
      .prepare('INSERT INTO review_logs (card_id, deck_id, result) VALUES (?, ?, ?)')
      .run(dto.cardId, dto.deckId, dto.result);
    return Number(result.lastInsertRowid);
  },

  /** 查卡片的复习历史 */
  getByCard(cardId: number): ReviewLog[] {
    return getDb()
      .prepare('SELECT * FROM review_logs WHERE card_id = ? ORDER BY reviewed_at DESC')
      .all(cardId) as ReviewLog[];
  },

  /** 按牌组和时间范围查 */
  getByDeckInRange(deckId: number, from: string, to: string): ReviewLog[] {
    return getDb()
      .prepare(
        'SELECT * FROM review_logs WHERE deck_id = ? AND reviewed_at BETWEEN ? AND ? ORDER BY reviewed_at DESC'
      )
      .all(deckId, from, to) as ReviewLog[];
  },

  /** 日历热力图：按日期分组统计复习卡片数 */
  getDailyCounts(year: number, month: number): CalendarDay[] {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-31 23:59:59`;

    return getDb()
      .prepare(
        `SELECT DATE(reviewed_at) as date, COUNT(DISTINCT card_id) as count
         FROM review_logs
         WHERE reviewed_at BETWEEN ? AND ?
         GROUP BY DATE(reviewed_at)
         ORDER BY date`
      )
      .all(from, to) as CalendarDay[];
  },

  /** 按评分统计正确率 */
  countByResult(deckId: number): StatsByResult {
    const rows = getDb()
      .prepare(
        `SELECT result, COUNT(*) as cnt
         FROM review_logs
         WHERE deck_id = ?
         GROUP BY result`
      )
      .all(deckId) as { result: string; cnt: number }[];

    const stats: StatsByResult = { forgot: 0, hard: 0, good: 0, easy: 0 };
    for (const row of rows) {
      switch (row.result) {
        case 'forgot': stats.forgot = row.cnt; break;
        case 'hard': stats.hard = row.cnt; break;
        case 'good': stats.good = row.cnt; break;
        case 'easy': stats.easy = row.cnt; break;
      }
    }
    return stats;
  },
};
