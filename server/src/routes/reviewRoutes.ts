/**
 * reviewRoutes.ts — 复习路由（STANDARDS §11 Step 5）
 *
 * 挂载于 /api（由 routes/index.ts 挂载在根前缀下）
 *
 * 端点（ARCH §6.2.4）：
 * - POST   /api/cards/:id/review              → submit
 * - GET    /api/decks/:deckId/due             → getDueCards
 * - GET    /api/decks/:deckId/review-progress → getProgress
 *
 * 说明：复习端点跨 cards 与 decks 两个前缀，
 * 路径前缀直接写在每条路由中，统一由 reviewRoutes 管理以便后续维护。
 */

import { Router } from 'express';
import { reviewController } from '../controllers/reviewController.js';

export const reviewRoutes = Router();

// ===== 卡片复习评分 =====
reviewRoutes.post('/cards/:id/review', reviewController.submit);

// ===== 牌组复习相关 =====
reviewRoutes.get('/decks/:deckId/due', reviewController.getDueCards);
reviewRoutes.get('/decks/:deckId/review-progress', reviewController.getProgress);
