/**
 * searchController.ts — 全局搜索控制器
 * GET /api/search?q=&category=decks|notes|cards|all（ARCH §6.2）
 */

import type { Request, Response } from 'express';
import { searchService } from '../services/searchService.js';
import { success } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type { SearchCategory } from '../types/index.js';

const VALID_CATEGORIES: SearchCategory[] = ['all', 'decks', 'notes', 'cards'];

export const searchController = {
  search: asyncHandler(async (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const category = (req.query.category as string) ?? 'all';
    if (!VALID_CATEGORIES.includes(category as SearchCategory)) {
      throw new AppError(ErrorCodes.INVALID_PARAM, 'category 无效', 400);
    }
    const limitNum = Number(req.query.limit);
    const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.floor(limitNum) : 20;
    success(res, searchService.search(q, category as SearchCategory, limit));
  }),
};
