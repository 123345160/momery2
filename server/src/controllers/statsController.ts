/**
 * statsController.ts — 统计控制器（ARCH §6.2.7）
 *
 * 职责：
 * - 调用 statsService → 用 success() 返回
 *
 * V1.0 只实现 overview；calendar/timeline/deckStats 属于 M1（Stage 7）
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
    const overview = statsService.overview();
    success(res, overview);
  }),
};
