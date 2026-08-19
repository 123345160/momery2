/**
 * noteController.ts — 笔记控制器
 */

import type { Request, Response } from 'express';
import { noteService } from '../services/noteService.js';
import { success, created } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type { NoteInsertDTO, NoteUpdateDTO } from '../types/index.js';

export const noteController = {
  /** GET /api/notes?folderId= — 按文件夹查笔记 */
  list: asyncHandler(async (req: Request, res: Response) => {
    const raw = req.query.folderId;
    let folderId: number | null = null;
    if (raw !== undefined && raw !== 'null' && raw !== '') {
      const n = Number(raw);
      if (!Number.isInteger(n) || n <= 0) {
        throw new AppError(ErrorCodes.INVALID_PARAM, 'folderId 无效', 400);
      }
      folderId = n;
    }
    success(res, noteService.listByFolder(folderId));
  }),

  /** GET /api/notes/today — 今日笔记 */
  today: asyncHandler(async (_req: Request, res: Response) => {
    success(res, noteService.listToday());
  }),

  /** GET /api/notes/:id — 笔记详情 */
  get: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError(ErrorCodes.INVALID_PARAM, '笔记 ID 无效', 400);
    success(res, noteService.get(id));
  }),

  /** POST /api/notes — 创建笔记 */
  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (typeof body.title !== 'string') {
      throw new AppError(ErrorCodes.MISSING_FIELD, '笔记标题不能为空', 400);
    }
    let folderId: number | null = null;
    if (body.folderId !== undefined && body.folderId !== null) {
      folderId = Number(body.folderId);
      if (!Number.isInteger(folderId) || folderId <= 0) {
        throw new AppError(ErrorCodes.INVALID_PARAM, 'folderId 无效', 400);
      }
    }
    const dto: NoteInsertDTO = {
      folderId,
      title: body.title,
      content: typeof body.content === 'string' ? body.content : '',
    };
    if (typeof body.isToday === 'number') dto.isToday = body.isToday;
    if (typeof body.tags === 'string') dto.tags = body.tags;
    const id = noteService.create(dto);
    created(res, { id });
  }),

  /** PUT /api/notes/:id — 更新 */
  update: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError(ErrorCodes.INVALID_PARAM, '笔记 ID 无效', 400);
    const dto: NoteUpdateDTO = {};
    if (typeof req.body?.title === 'string') dto.title = req.body.title;
    if (typeof req.body?.content === 'string') dto.content = req.body.content;
    if (req.body?.folderId !== undefined) {
      dto.folderId = req.body.folderId === null ? null : Number(req.body.folderId);
    }
    if (typeof req.body?.isToday === 'number') dto.isToday = req.body.isToday;
    if (typeof req.body?.tags === 'string') dto.tags = req.body.tags;
    noteService.update(id, dto);
    success(res, null);
  }),

  /** DELETE /api/notes/:id — 删除 */
  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError(ErrorCodes.INVALID_PARAM, '笔记 ID 无效', 400);
    noteService.remove(id);
    success(res, null);
  }),

  /** GET /api/notes/:id/extract — 提取可生成的卡片（预览） */
  extract: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError(ErrorCodes.INVALID_PARAM, '笔记 ID 无效', 400);
    success(res, noteService.extract(id));
  }),

  /** POST /api/notes/:id/convert — 笔记转卡片（事务） */
  convert: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError(ErrorCodes.INVALID_PARAM, '笔记 ID 无效', 400);
    const deckId = Number(req.body?.deckId);
    if (!Number.isInteger(deckId) || deckId <= 0) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '目标牌组 deckId 无效', 400);
    }
    success(res, noteService.convertToCards(id, deckId));
  }),
};
