/**
 * statsRepo.ts — 统计数据访问层（DB §7.4）
 *
 * 职责：
 * - 全局聚合查询：总卡片数 / 已掌握 / 今日待复习 / 连续学习天数 / 全量正确率
 * - 与 reviewLogRepo.countByResult(deckId) 不同：本文件 countByResultAll 为全量统计
 *
 * 纯 SQL 操作，不包含业务判断；streakDays 的 JS 倒推逻辑在 repo 内（属于数据计算）
 */

import { getDb } from '../db/connection.js';
import type { StatsByResult, CalendarDay, TimelineItem } from '../types/index.js';

export const statsRepo = {
  /** 总卡片数（DB §7.4） */
  countTotal(): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) as cnt FROM cards')
      .get() as { cnt: number };
    return row.cnt;
  },

  /** 已掌握卡片数（R11 口径：repetitions >= 3 且 interval >= 30240 分钟 = 21 天） */
  countMastered(): number {
    const row = getDb()
      .prepare(
        'SELECT COUNT(*) as cnt FROM cards WHERE repetitions >= 3 AND interval >= 30240'
      )
      .get() as { cnt: number };
    return row.cnt;
  },

  /** 今日待复习数（next_review <= datetime('now')） */
  countDueToday(): number {
    const row = getDb()
      .prepare("SELECT COUNT(*) as cnt FROM cards WHERE next_review <= datetime('now')")
      .get() as { cnt: number };
    return row.cnt;
  },

  /**
   * 连续学习天数（DB §7.4）
   * 逻辑：review_logs 按日期分组去重，从今天（UTC）倒推连续有记录的日期数
   * - 今天有复习记录 → streak >= 1
   * - 今天无记录 → streak = 0（严格口径，激励每日复习）
   */
  getStreakDays(): number {
    const dates = getDb()
      .prepare(
        "SELECT DISTINCT DATE(reviewed_at) as d FROM review_logs ORDER BY d DESC"
      )
      .all() as { d: string }[];

    if (dates.length === 0) return 0;

    // 今天（UTC）日期字符串
    const now = new Date();
    const todayStr =
      now.getUTCFullYear() +
      '-' +
      String(now.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getUTCDate()).padStart(2, '0');

    let streak = 0;
    let expected = todayStr;

    for (const { d } of dates) {
      if (d === expected) {
        streak++;
        // expected 前移一天
        const dt = new Date(expected + 'T00:00:00Z');
        dt.setUTCDate(dt.getUTCDate() - 1);
        expected =
          dt.getUTCFullYear() +
          '-' +
          String(dt.getUTCMonth() + 1).padStart(2, '0') +
          '-' +
          String(dt.getUTCDate()).padStart(2, '0');
      } else if (d < expected) {
        // 日期断链，结束
        break;
      }
      // d > expected：跳过未来异常日期（不应出现，防御性处理）
    }

    return streak;
  },

  /** 全量按评分统计（用于计算总正确率，不带 deckId） */
  countByResultAll(): StatsByResult {
    const rows = getDb()
      .prepare('SELECT result, COUNT(*) as cnt FROM review_logs GROUP BY result')
      .all() as { result: string; cnt: number }[];

    const stats: StatsByResult = { forgot: 0, hard: 0, good: 0, easy: 0 };
    for (const row of rows) {
      switch (row.result) {
        case 'forgot':
          stats.forgot = row.cnt;
          break;
        case 'hard':
          stats.hard = row.cnt;
          break;
        case 'good':
          stats.good = row.cnt;
          break;
        case 'easy':
          stats.easy = row.cnt;
          break;
      }
    }
    return stats;
  },

  /**
   * 复习日历热力数据：最近 days 天，每天复习次数
   * 返回按日期升序的 CalendarDay[]（缺数据的日期补 0）
   */
  getCalendar(days: number): CalendarDay[] {
    const rows = getDb()
      .prepare(
        `SELECT DATE(reviewed_at) as date, COUNT(*) as count
         FROM review_logs
         WHERE reviewed_at >= datetime('now', ?)
         GROUP BY DATE(reviewed_at)`,
      )
      .all(`-${days - 1} days`) as { date: string; count: number }[];

    const map = new Map<string, number>();
    for (const r of rows) map.set(r.date, r.count);

    const result: CalendarDay[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date(now);
      dt.setUTCDate(dt.getUTCDate() - i);
      const dateStr =
        dt.getUTCFullYear() +
        '-' +
        String(dt.getUTCMonth() + 1).padStart(2, '0') +
        '-' +
        String(dt.getUTCDate()).padStart(2, '0');
      result.push({ date: dateStr, count: map.get(dateStr) ?? 0 });
    }
    return result;
  },

  /**
   * 学习时间轴：近期 review_logs 明细（含卡片 front、牌组名）
   * 返回最近 limit 条，按时间倒序
   */
  getTimeline(limit: number): TimelineItem[] {
    const rows = getDb()
      .prepare(
        `SELECT rl.id, rl.card_id, rl.result, rl.reviewed_at,
                c.front AS card_front, d.name AS deck_name
         FROM review_logs rl
         LEFT JOIN cards c ON rl.card_id = c.id
         LEFT JOIN decks d ON c.deck_id = d.id
         ORDER BY rl.reviewed_at DESC
         LIMIT ?`,
      )
      .all(limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      cardId: r.card_id,
      cardFront: r.card_front,
      deckName: r.deck_name,
      result: r.result,
      reviewedAt: r.reviewed_at,
    }));
  },
};
