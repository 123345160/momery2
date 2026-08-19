/**
 * folderController.ts — 文件夹控制器
 */

import type { Request, Response } from 'express';
import { folderService } from '../services/folderService.js';
import { success, created } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type { FolderInsertDTO } from '../types/index.js';

export const folderController = {
  /** GET /api/folders/tree — 文件夹树 */
  tree: asyncHandler(async (_req: Request, res: Response) => {
    success(res, folderService.getTree());
  }),

  /** POST /api/folders — 创建文件夹 */
  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (typeof body.name !== 'string') {
      throw new AppError(ErrorCodes.MISSING_FIELD, '文件夹名称不能为空', 400);
    }
    const parentId =
      body.parentId === undefined || body.parentId === null
        ? null
        : Number(body.parentId);
    if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
      throw new AppError(ErrorCodes.INVALID_PARAM, 'parentId 无效', 400);
    }
    const dto: FolderInsertDTO = { name: body.name, parentId };
    const id = folderService.create(dto);
    created(res, { id });
  }),

  /** PUT /api/folders/:id — 重命名 */
  rename: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      throw new AppError(ErrorCodes.INVALID_PARAM, '文件夹 ID 无效', 400);
    }
    if (typeof req.body?.name !== 'string') {
      throw new AppError(ErrorCodes.MISSING_FIELD, '文件夹名称不能为空', 400);
    }
    folderService.rename(id, { name: req.body.name });
    success(res, null);
  }),

  /** POST /api/folders/:id/move — 移动 */
  move: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      throw new AppError(ErrorCodes.INVALID_PARAM, '文件夹 ID 无效', 400);
    }
    const parentId =
      req.body?.parentId === undefined || req.body?.parentId === null
        ? null
        : Number(req.body.parentId);
    if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
      throw new AppError(ErrorCodes.INVALID_PARAM, 'parentId 无效', 400);
    }
    folderService.move(id, parentId);
    success(res, null);
  }),

  /** DELETE /api/folders/:id — 删除（非空保护） */
  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      throw new AppError(ErrorCodes.INVALID_PARAM, '文件夹 ID 无效', 400);
    }
    folderService.remove(id);
    success(res, null);
  }),
};
