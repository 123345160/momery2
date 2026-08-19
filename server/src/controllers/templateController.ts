/**
 * templateController.ts — 卡片模板控制器
 */

import type { Request, Response } from 'express';
import { templateService } from '../services/templateService.js';
import { success, created } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type { TemplateInsertDTO } from '../types/index.js';

export const templateController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    success(res, templateService.list());
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError(ErrorCodes.INVALID_PARAM, '模板 ID 无效', 400);
    success(res, templateService.get(id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (typeof body.name !== 'string') throw new AppError(ErrorCodes.MISSING_FIELD, '模板名称不能为空', 400);
    if (typeof body.front !== 'string') throw new AppError(ErrorCodes.MISSING_FIELD, '正面模板不能为空', 400);
    if (typeof body.back !== 'string') throw new AppError(ErrorCodes.MISSING_FIELD, '背面模板不能为空', 400);
    const dto: TemplateInsertDTO = { name: body.name, front: body.front, back: body.back };
    if (typeof body.description === 'string') dto.description = body.description;
    const id = templateService.create(dto);
    created(res, { id });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError(ErrorCodes.INVALID_PARAM, '模板 ID 无效', 400);
    const dto: Partial<TemplateInsertDTO> = {};
    if (typeof req.body?.name === 'string') dto.name = req.body.name;
    if (typeof req.body?.description === 'string') dto.description = req.body.description;
    if (typeof req.body?.front === 'string') dto.front = req.body.front;
    if (typeof req.body?.back === 'string') dto.back = req.body.back;
    templateService.update(id, dto);
    success(res, null);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError(ErrorCodes.INVALID_PARAM, '模板 ID 无效', 400);
    templateService.remove(id);
    success(res, null);
  }),
};
