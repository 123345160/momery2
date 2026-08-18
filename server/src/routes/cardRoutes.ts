/**
 * cardRoutes.ts — 卡片根路由（STANDARDS §11 Step 5）
 *
 * 挂载于 /api/cards（由 routes/index.ts 挂载）
 * 仅含 Card 根级路由（3 端点）
 * 嵌套在 /decks/:deckId/cards 下的端点见 deckRoutes.ts
 */

import { Router } from 'express';
import { cardController } from '../controllers/cardController.js';

export const cardRoutes = Router();

cardRoutes.post('/batch', cardController.createBatch);  // POST   /api/cards/batch
cardRoutes.put('/:id', cardController.update);          // PUT    /api/cards/:id
cardRoutes.delete('/:id', cardController.remove);       // DELETE /api/cards/:id
