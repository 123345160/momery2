/**
 * noteRoutes.ts — 笔记路由
 */

import { Router } from 'express';
import { noteController } from '../controllers/noteController.js';

export const noteRoutes = Router();

// GET /api/notes?folderId= — 按文件夹查
noteRoutes.get('/', noteController.list);

// GET /api/notes/today — 今日笔记
noteRoutes.get('/today', noteController.today);

// GET /api/notes/:id/extract — 提取可生成的卡片（预览）
noteRoutes.get('/:id/extract', noteController.extract);

// POST /api/notes/:id/convert — 笔记转卡片
noteRoutes.post('/:id/convert', noteController.convert);

// GET /api/notes/:id — 详情
noteRoutes.get('/:id', noteController.get);

// POST /api/notes — 创建
noteRoutes.post('/', noteController.create);

// PUT /api/notes/:id — 更新
noteRoutes.put('/:id', noteController.update);

// DELETE /api/notes/:id — 删除
noteRoutes.delete('/:id', noteController.remove);
