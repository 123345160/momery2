/**
 * noteAttachmentRoutes.ts — 笔记附件路由（multipart 上传用 multer）
 */

import { Router } from 'express';
import multer from 'multer';
import { noteAttachmentController } from '../controllers/noteAttachmentController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const noteAttachmentRoutes = Router();

// POST /api/notes/:id/attachments — 上传（field=file）
noteAttachmentRoutes.post('/notes/:id/attachments', upload.single('file'), noteAttachmentController.upload);

// GET /api/notes/:id/attachments — 列表
noteAttachmentRoutes.get('/notes/:id/attachments', noteAttachmentController.list);

// GET /api/attachments/:id/download — 下载
noteAttachmentRoutes.get('/attachments/:id/download', noteAttachmentController.download);

// DELETE /api/attachments/:id — 删除
noteAttachmentRoutes.delete('/attachments/:id', noteAttachmentController.remove);
