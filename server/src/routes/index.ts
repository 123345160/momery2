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

const router = Router();

// V1.0
router.use('/decks', deckRoutes);
router.use('/cards', cardRoutes);

// Stage 3b：复习模块（路径前缀已在 reviewRoutes 内部声明）
router.use('/', reviewRoutes);

// Stage 3 后续：importExport / stats
// router.use('/io', ioRoutes);
// router.use('/stats', statsRoutes);

export { router as apiRoutes };
