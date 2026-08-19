/**
 * noteAttachmentController.ts — 笔记附件控制器
 */

import type { Request, Response } from 'express';
import { noteAttachmentService } from '../services/noteAttachmentService.js';
import { success, created } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';

export const noteAttachmentController = {
  /** POST /api/notes/:id/attachments — 上传附件（multipart/form-data, field=file） */
  upload: asyncHandler(async (req: Request, res: Response) => {
    const noteId = Number(req.params.id);
    if (!Number.isInteger(noteId)) {
      throw new AppError(ErrorCodes.INVALID_PARAM, '笔记 ID 无效', 400);
    }
    const file = (req as any).file;
    if (!file) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '未收到上传文件', 400);
    }
    const att = noteAttachmentService.save(noteId, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
    created(res, att);
  }),

  /** GET /api/notes/:id/attachments — 列出附件 */
  list: asyncHandler(async (req: Request, res: Response) => {
    const noteId = Number(req.params.id);
    if (!Number.isInteger(noteId)) {
      throw new AppError(ErrorCodes.INVALID_PARAM, '笔记 ID 无效', 400);
    }
    success(res, noteAttachmentService.listByNote(noteId));
  }),

  /** GET /api/attachments/:id/download — 下载 */
  download: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      throw new AppError(ErrorCodes.INVALID_PARAM, '附件 ID 无效', 400);
    }
    const { buffer, filename, fileType } = noteAttachmentService.getFile(id);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    if (fileType) res.setHeader('Content-Type', fileType);
    res.send(buffer);
  }),

  /** DELETE /api/attachments/:id — 删除 */
  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      throw new AppError(ErrorCodes.INVALID_PARAM, '附件 ID 无效', 400);
    }
    noteAttachmentService.remove(id);
    success(res, null);
  }),
};
