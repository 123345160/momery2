/**
 * folderRoutes.ts — 文件夹路由
 */

import { Router } from 'express';
import { folderController } from '../controllers/folderController.js';

export const folderRoutes = Router();

// GET /api/folders/tree — 文件夹树
folderRoutes.get('/tree', folderController.tree);

// POST /api/folders — 创建
folderRoutes.post('/', folderController.create);

// PUT /api/folders/:id — 重命名
folderRoutes.put('/:id', folderController.rename);

// POST /api/folders/:id/move — 移动
folderRoutes.post('/:id/move', folderController.move);

// DELETE /api/folders/:id — 删除（非空保护）
folderRoutes.delete('/:id', folderController.remove);
