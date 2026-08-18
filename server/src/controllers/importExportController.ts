/**
 * importExportController.ts — 导入导出控制器（ARCH §6.2.11）
 *
 * 职责：
 * - 提取 req.params / req.body
 * - 参数校验（id 正整数 / body 为对象）→ 校验失败 throw AppError
 * - 调用 importExportService → 用 success() 返回
 *
 * 禁止：
 * - 直接操作 SQL（service/repo 层职责）
 * - 包含业务规则（service 层职责，如幂等合并、JSON schema 校验）
 */

import type { Request, Response } from 'express';
import { importExportService } from '../services/importExportService.js';
import { success } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';

export const importExportController = {
  /**
   * GET /api/export/all
   * 导出全部数据 JSON（decks + cards + review_logs）
   */
  exportAll: asyncHandler(async (_req: Request, res: Response) => {
    const payload = importExportService.exportAll();
    success(res, payload);
  }),

  /**
   * GET /api/export/deck/:id
   * 导出单个牌组 JSON
   */
  exportDeck: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, '无效的牌组 ID', 400);
    }
    const payload = importExportService.exportDeck(id);
    success(res, payload);
  }),

  /**
   * POST /api/import/json
   * 导入 JSON（结构校验 + 幂等合并 + 事务保护在 service 层）
   */
  importJson: asyncHandler(async (req: Request, res: Response) => {
    if (!req.body || typeof req.body !== 'object') {
      throw new AppError(ErrorCodes.INVALID_JSON, '请求体必须是 JSON 对象', 400);
    }
    const summary = importExportService.importJson(req.body);
    success(res, summary);
  }),
};
