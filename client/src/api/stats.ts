/**
 * 统计 API 模块（FRONTEND §6.3.6）
 * 对应后端：GET /api/stats/overview
 *
 * V1.0 只实现 overview；calendar/timeline/deckStats 为 M1 占位
 */

import client from './client';
import type { CalendarDay, DeckListItem, StatsOverview, TimelineItem } from '@/types';

/** GET /api/stats/overview — 全局统计概览（V1.0 已就绪） */
export function getOverview(): Promise<StatsOverview> {
  return client.get('/stats/overview') as unknown as Promise<StatsOverview>;
}

/**
 * GET /api/stats/calendar?year=&month= — 月历热力图（M1 占位）
 * M1 后端就绪后启用
 */
export function getCalendar(_year: number, _month: number): Promise<CalendarDay[]> {
  throw new Error('M1 未实现：stats/calendar 端点尚未就绪');
}

/**
 * GET /api/stats/timeline — 时间轴（M1 占位）
 * M1 后端就绪后启用
 */
export function getTimeline(): Promise<TimelineItem[]> {
  throw new Error('M1 未实现：stats/timeline 端点尚未就绪');
}

/**
 * GET /api/stats/deck/:id — 牌组维度统计（M1 占位）
 * M1 后端就绪后启用
 */
export function getDeckStats(_deckId: number): Promise<DeckListItem> {
  throw new Error('M1 未实现：stats/deck/:id 端点尚未就绪');
}
