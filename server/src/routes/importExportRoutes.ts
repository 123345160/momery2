/**
 * importExportRoutes.ts — 导入导出路由（ARCH §6.2.11）
 *
 * 挂载于 /api 根（由 routes/index.ts 挂载 router.use('/', importExportRoutes)）
 * 端点跨 /export 与 /import 两个前缀，故路径前缀写在每条路由中
 */

import { Router } from 'express';
import { importExportController } from '../controllers/importExportController.js';

export const importExportRoutes = Router();

importExportRoutes.get('/export/all', importExportController.exportAll); // GET  /api/export/all
importExportRoutes.get('/export/deck/:id', importExportController.exportDeck); // GET  /api/export/deck/:id
importExportRoutes.post('/import/json', importExportController.importJson); // POST /api/import/json
