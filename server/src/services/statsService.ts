/**
 * statsService.ts — 统计业务层（ARCH §6.2.7 / DB §7.4）
 *
 * 职责：
 * - overview：聚合 5 个全局指标 → StatsOverview
 *   - totalCards：总卡片数
 *   - masteredCards：已掌握（R11 口径：repetitions >= 3 且 interval >= 30240 分钟）
 *   - dueToday：今日待复习
 *   - streakDays：连续学习天数（UTC 倒推）
 *   - accuracy：总正确率 (good + easy) / total × 100
 *
 * V1.0 只做 overview；calendar/timeline/deckStats 属于 M1（Stage 7）
 */

import { statsRepo } from '../repositories/statsRepo.js';
import type { StatsOverview, CalendarDay, TimelineItem } from '../types/index.js';

export const statsService = {
  /**
   * 全局统计概览（GET /api/stats/overview）
   */
  overview(): StatsOverview {
    const totalCards = statsRepo.countTotal();
    const masteredCards = statsRepo.countMastered();
    const dueToday = statsRepo.countDueToday();
    const streakDays = statsRepo.getStreakDays();

    // 总正确率：(good + easy) / total × 100（CHARTER L211 口径）
    const byResult = statsRepo.countByResultAll();
    const totalReviews =
      byResult.forgot + byResult.hard + byResult.good + byResult.easy;
    const accuracy =
      totalReviews === 0
        ? 0
        : Math.round(((byResult.good + byResult.easy) / totalReviews) * 100);

    return {
      totalCards,
      masteredCards,
      dueToday,
      streakDays,
      accuracy,
    };
  },

  /**
   * 复习日历热力数据（GET /api/stats/calendar?days=）
   * 最近 days 天每天复习次数，缺数据补 0
   */
  calendar(days: number): CalendarDay[] {
    const d = Math.min(365, Math.max(7, Math.floor(days || 30)));
    return statsRepo.getCalendar(d);
  },

  /**
   * 学习时间轴（GET /api/stats/timeline?limit=）
   * 近期 review_logs 明细，按时间倒序
   */
  timeline(limit: number): TimelineItem[] {
    const l = Math.min(200, Math.max(1, Math.floor(limit || 50)));
    return statsRepo.getTimeline(l);
  },
};
