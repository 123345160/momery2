/**
 * statsRoutes.ts — 统计路由（ARCH §6.2.7）
 *
 * 挂载于 /api/stats（由 routes/index.ts 挂载 router.use('/stats', statsRoutes)）
 * V1.0 只实现 overview；calendar/timeline/deck/:id 属于 M1（Stage 7）
 */

import { Router } from 'express';
import { statsController } from '../controllers/statsController.js';

export const statsRoutes = Router();

statsRoutes.get('/overview', statsController.overview); // GET /api/stats/overview

// M1（Stage 7）：统计可视化
// statsRoutes.get('/calendar', statsController.calendar);   // GET /api/stats/calendar?year=&month=
// statsRoutes.get('/timeline', statsController.timeline);   // GET /api/stats/timeline?page=&limit=
// statsRoutes.get('/deck/:id', statsController.deckStats); // GET /api/stats/deck/:id
