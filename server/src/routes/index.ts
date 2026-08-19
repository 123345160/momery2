/**
 * 路由注册表（STANDARDS §11 Step 6）
 *
 * 所有子路由在此汇总，统一挂载到 /api 前缀下（由 app.ts 执行）
 * 新增模块时：import → router.use('/<prefix>', <module>Routes)
 */

import { Router } from 'express';
import { deckRoutes } from './deckRoutes.js';
import { cardRoutes } from './cardRoutes.js';
import { reviewRoutes } from './reviewRoutes.js';
import { importExportRoutes } from './importExportRoutes.js';
import { statsRoutes } from './statsRoutes.js';
import { folderRoutes } from './folderRoutes.js';
import { noteRoutes } from './noteRoutes.js';
import { noteAttachmentRoutes } from './noteAttachmentRoutes.js';
import { templateRoutes } from './templateRoutes.js';
import { examRoutes } from './examRoutes.js';
import { searchRoutes } from './searchRoutes.js';

const router = Router();

// V1.0
router.use('/decks', deckRoutes);
router.use('/cards', cardRoutes);

// Stage 3b：复习模块（路径前缀已在 reviewRoutes 内部声明）
router.use('/', reviewRoutes);

// Stage 3c：导入导出模块（路径前缀已在 importExportRoutes 内部声明）
router.use('/', importExportRoutes);

// Stage 3c：统计模块（overview 已验收；calendar/timeline 为 M1 扩展）
router.use('/stats', statsRoutes);

// M1（Stage 7）：笔记系统
router.use('/folders', folderRoutes);
router.use('/notes', noteRoutes);
router.use('/', noteAttachmentRoutes);

// M1（Stage 7）：卡片模板
router.use('/templates', templateRoutes);

// M1（Stage 7）：考试目标
router.use('/exams', examRoutes);

// M1（Stage 7）：全局搜索
router.use('/search', searchRoutes);

export { router as apiRoutes };
