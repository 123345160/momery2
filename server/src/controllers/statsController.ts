/**
 * statsController.ts — 统计控制器（ARCH §6.2.7）
 */

import type { Request, Response } from 'express';
import { statsService } from '../services/statsService.js';
import { success } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const statsController = {
  /**
   * GET /api/stats/overview
   * 全局统计概览（总卡片/已掌握/今日待复习/连续天数/正确率）
   */
  overview: asyncHandler(async (_req: Request, res: Response) => {
    success(res, statsService.overview());
  }),

  /**
   * GET /api/stats/calendar?days=30
   * 复习日历热力数据（最近 days 天每天复习次数）
   */
  calendar: asyncHandler(async (req: Request, res: Response) => {
    const daysNum = Number(req.query.days);
    const days = Number.isFinite(daysNum) && daysNum > 0 ? daysNum : 30;
    success(res, statsService.calendar(days));
  }),

  /**
   * GET /api/stats/timeline?limit=50
   * 学习时间轴（review_logs 明细）
   */
  timeline: asyncHandler(async (req: Request, res: Response) => {
    const limitNum = Number(req.query.limit);
    const limit = Number.isFinite(limitNum) && limitNum > 0 ? limitNum : 50;
    success(res, statsService.timeline(limit));
  }),
};
