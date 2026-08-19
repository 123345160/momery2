/**
 * 统计 API 模块（FRONTEND §6.3.6）
 * GET /api/stats/overview
 * GET /api/stats/calendar?days=30
 * GET /api/stats/timeline?limit=50
 */

import client from './client';
import type { CalendarDay, StatsOverview, TimelineItem } from '@/types';

/** GET /api/stats/overview — 全局统计概览 */
export function getOverview(): Promise<StatsOverview> {
  return client.get('/stats/overview') as unknown as Promise<StatsOverview>;
}

/** GET /api/stats/calendar?days=30 — 日历热力图（近 N 天每日复习次数） */
export function getCalendar(days = 30): Promise<CalendarDay[]> {
  return client.get('/stats/calendar', { params: { days } }) as unknown as Promise<CalendarDay[]>;
}

/** GET /api/stats/timeline?limit=50 — 学习时间轴 */
export function getTimeline(limit = 50): Promise<TimelineItem[]> {
  return client.get('/stats/timeline', { params: { limit } }) as unknown as Promise<TimelineItem[]>;
}
