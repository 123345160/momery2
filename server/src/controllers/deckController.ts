/**
 * deckController.ts — 牌组控制器（STANDARDS §11 Step 4）
 *
 * 职责：
 * - 提取 req.params / req.query / req.body
 * - 参数校验（必填/格式）→ 校验失败 throw AppError
 * - 调用 deckService → 用 success() / created() 返回
 *
 * 禁止：
 * - 直接操作 SQL（service/repo 层职责）
 * - 包含业务规则（service 层职责）
 */

import type { Request, Response } from 'express';
import { deckService } from '../services/deckService.js';
import { success, created } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type { DeckListQuery } from '../types/index.js';

export const deckController = {
  /**
   * GET /api/decks?search=&page=&limit=
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const query: DeckListQuery = {};
    if (typeof req.query.search === 'string') query.search = req.query.search;
    const pageNum = Number(req.query.page);
    if (Number.isFinite(pageNum) && pageNum > 0) query.page = pageNum;
    const limitNum = Number(req.query.limit);
    if (Number.isFinite(limitNum) && limitNum > 0) query.limit = limitNum;

    const result = deckService.list(query);
    success(res, result);
  }),

  /**
   * POST /api/decks
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, description, folderId, icon, color } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '牌组名称不能为空', 400);
    }
    if (folderId !== undefined && folderId !== null && (!Number.isInteger(folderId) || folderId <= 0)) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的文件夹 ID', 400);
    }

    const id = deckService.create({ name, description, folderId, icon, color });
    created(res, { id });
  }),

  /**
   * GET /api/decks/:id
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的牌组 ID', 400);
    }

    const deck = deckService.getById(id);
    success(res, deck);
  }),

  /**
   * PUT /api/decks/:id
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的牌组 ID', 400);
    }

    const { name, description, folderId, icon, color } = req.body;

    if (name !== undefined && (name === null || typeof name !== 'string' || !name.trim())) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '牌组名称不能为空', 400);
    }
    if (folderId !== undefined && folderId !== null && (!Number.isInteger(folderId) || folderId <= 0)) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的文件夹 ID', 400);
    }

    deckService.update(id, { name, description, folderId, icon, color });
    success(res, { id }, '更新成功');
  }),

  /**
   * DELETE /api/decks/:id
   */
  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的牌组 ID', 400);
    }

    deckService.remove(id);
    success(res, { id }, '删除成功');
  }),
};
