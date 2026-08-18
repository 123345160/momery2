/**
 * reviewController.ts — 复习控制器（STANDARDS §11 Step 4）
 *
 * 职责：
 * - 提取 req.params / req.body
 * - 参数校验（cardId 正整数 / deckId 正整数 / result 合法值）
 * - 调用 reviewService → 用 success() / created() 返回
 *
 * 端点（ARCH §6.2.4）：
 * - POST   /api/cards/:id/review          → submit
 * - GET    /api/decks/:deckId/due         → getDueCards
 * - GET    /api/decks/:deckId/review-progress → getProgress
 */

import type { Request, Response } from 'express';
import { reviewService } from '../services/reviewService.js';
import { success, created } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';

const VALID_RESULTS = ['forgot', 'hard', 'good', 'easy'] as const;

export const reviewController = {
  /**
   * POST /api/cards/:id/review
   * 请求体: { result: 'forgot' | 'hard' | 'good' | 'easy' }
   */
  submit: asyncHandler(async (req: Request, res: Response) => {
    const cardId = Number(req.params.id);

    // 类型守卫：cardId 必须是正整数
    if (!Number.isInteger(cardId) || cardId <= 0) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的卡片 ID');
    }

    // 提取 result
    const { result } = req.body;

    // 类型守卫：result 必须是合法字符串
    if (
      result === undefined ||
      result === null ||
      typeof result !== 'string' ||
      !VALID_RESULTS.includes(result as (typeof VALID_RESULTS)[number])
    ) {
      throw new AppError(
        ErrorCodes.INVALID_FORMAT,
        `评分值必须是 ${VALID_RESULTS.join(' / ')} 之一`
      );
    }

    const updatedCard = reviewService.submitReview(cardId, result);
    created(res, updatedCard);
  }),

  /**
   * GET /api/decks/:deckId/due
   */
  getDueCards: asyncHandler(async (req: Request, res: Response) => {
    const deckId = Number(req.params.deckId);

    // 类型守卫：deckId 必须是正整数
    if (!Number.isInteger(deckId) || deckId <= 0) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的牌组 ID');
    }

    const dueCards = reviewService.getDueCards(deckId);
    success(res, dueCards);
  }),

  /**
   * GET /api/decks/:deckId/review-progress
   */
  getProgress: asyncHandler(async (req: Request, res: Response) => {
    const deckId = Number(req.params.deckId);

    // 类型守卫：deckId 必须是正整数
    if (!Number.isInteger(deckId) || deckId <= 0) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的牌组 ID');
    }

    const progress = reviewService.getReviewProgress(deckId);
    success(res, progress);
  }),
};
