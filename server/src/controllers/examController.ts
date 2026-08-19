/**
 * examController.ts — 考试目标控制器
 */

import type { Request, Response } from 'express';
import { examService } from '../services/examService.js';
import { success, created } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type { ExamInsertDTO, ExamUpdateDTO } from '../types/index.js';

export const examController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    success(res, examService.list());
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError(ErrorCodes.INVALID_PARAM, '考试 ID 无效', 400);
    success(res, examService.get(id));
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (typeof body.name !== 'string') throw new AppError(ErrorCodes.MISSING_FIELD, '考试名称不能为空', 400);
    const dto: ExamInsertDTO = { name: body.name };
    if (body.deckId !== undefined && body.deckId !== null) {
      const did = Number(body.deckId);
      if (!Number.isInteger(did) || did <= 0) throw new AppError(ErrorCodes.INVALID_PARAM, 'deckId 无效', 400);
      dto.deckId = did;
    }
    if (typeof body.targetDate === 'string') dto.targetDate = body.targetDate;
    if (typeof body.targetCount === 'number') dto.targetCount = body.targetCount;
    const id = examService.create(dto);
    created(res, { id });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError(ErrorCodes.INVALID_PARAM, '考试 ID 无效', 400);
    const dto: ExamUpdateDTO = {};
    if (typeof req.body?.name === 'string') dto.name = req.body.name;
    if (req.body?.deckId !== undefined) {
      dto.deckId = req.body.deckId === null ? null : Number(req.body.deckId);
    }
    if (typeof req.body?.targetDate === 'string') dto.targetDate = req.body.targetDate;
    if (typeof req.body?.targetCount === 'number') dto.targetCount = req.body.targetCount;
    if (typeof req.body?.status === 'string') dto.status = req.body.status;
    examService.update(id, dto);
    success(res, null);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError(ErrorCodes.INVALID_PARAM, '考试 ID 无效', 400);
    examService.remove(id);
    success(res, null);
  }),

  progress: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError(ErrorCodes.INVALID_PARAM, '考试 ID 无效', 400);
    success(res, examService.progress(id));
  }),
};
