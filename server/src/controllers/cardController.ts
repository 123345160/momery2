/**
 * cardController.ts — 卡片控制器（STANDARDS §11 Step 4）
 *
 * 职责：
 * - 提取 req.params / req.query / req.body
 * - 参数校验（必填/格式）→ 校验失败 throw AppError
 * - 调用 cardService → 用 success() / created() 返回
 *
 * 禁止：
 * - 直接操作 SQL（service/repo 层职责）
 * - 包含业务规则（service 层职责）
 */

import type { Request, Response } from 'express';
import { cardService } from '../services/cardService.js';
import { success, created } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type { CardListQuery } from '../types/index.js';

export const cardController = {
  /**
   * GET /api/decks/:deckId/cards?page=&limit=&sort=&search=&status=
   */
  listByDeck: asyncHandler(async (req: Request, res: Response) => {
    const deckId = Number(req.params.deckId);
    if (!Number.isInteger(deckId) || deckId <= 0) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的牌组 ID', 400);
    }

    const query: CardListQuery = {};
    const pageNum = Number(req.query.page);
    if (Number.isFinite(pageNum) && pageNum > 0) query.page = pageNum;
    const limitNum = Number(req.query.limit);
    if (Number.isFinite(limitNum) && limitNum > 0) query.limit = limitNum;
    if (req.query.sort === 'created' || req.query.sort === 'next_review' || req.query.sort === 'front') {
      query.sort = req.query.sort;
    }
    if (typeof req.query.search === 'string') query.search = req.query.search;
    if (req.query.status === 'all' || req.query.status === 'due' || req.query.status === 'mastered') {
      query.status = req.query.status;
    }

    const result = cardService.listByDeck(deckId, query);
    success(res, result);
  }),

  /**
   * POST /api/decks/:deckId/cards
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const deckId = Number(req.params.deckId);
    if (!Number.isInteger(deckId) || deckId <= 0) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的牌组 ID', 400);
    }

    const { front, back, sourceNote, tags } = req.body;

    if (!front || typeof front !== 'string' || !front.trim()) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '卡片正面不能为空', 400);
    }
    if (!back || typeof back !== 'string' || !back.trim()) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '卡片背面不能为空', 400);
    }
    if (sourceNote !== undefined && sourceNote !== null && (!Number.isInteger(sourceNote) || sourceNote <= 0)) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的笔记 ID', 400);
    }

    const id = cardService.create(deckId, { front, back, sourceNote, tags });
    created(res, { id });
  }),

  /**
   * POST /api/cards/batch
   */
  createBatch: asyncHandler(async (req: Request, res: Response) => {
    const { deckId, cards } = req.body;

    if (!deckId || !Number.isInteger(deckId) || deckId <= 0) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的牌组 ID', 400);
    }
    if (!Array.isArray(cards)) {
      throw new AppError(ErrorCodes.MISSING_FIELD, 'cards 必须是数组', 400);
    }

    // 逐条校验 card 结构
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card || typeof card.front !== 'string' || !card.front.trim()) {
        throw new AppError(ErrorCodes.MISSING_FIELD, `第 ${i + 1} 张卡片正面不能为空`, 400);
      }
      if (typeof card.back !== 'string' || !card.back.trim()) {
        throw new AppError(ErrorCodes.MISSING_FIELD, `第 ${i + 1} 张卡片背面不能为空`, 400);
      }
    }

    const ids = cardService.createBatch({ deckId, cards });
    created(res, { ids });
  }),

  /**
   * PUT /api/cards/:id
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的卡片 ID', 400);
    }

    const { front, back, tags } = req.body;

    if (front !== undefined && (front === null || typeof front !== 'string' || !front.trim())) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '卡片正面不能为空', 400);
    }
    if (back !== undefined && (back === null || typeof back !== 'string' || !back.trim())) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '卡片背面不能为空', 400);
    }

    cardService.update(id, { front, back, tags });
    success(res, { id }, '更新成功');
  }),

  /**
   * DELETE /api/cards/:id
   */
  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的卡片 ID', 400);
    }

    cardService.remove(id);
    success(res, { id }, '删除成功');
  }),
};
