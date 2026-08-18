/**
 * deckRoutes.ts — 牌组路由（STANDARDS §11 Step 5）
 *
 * 挂载于 /api/decks（由 routes/index.ts 挂载）
 * 包含 Deck CRUD（5 端点）+ 嵌套 Card 路由（2 端点）
 */

import { Router } from 'express';
import { deckController } from '../controllers/deckController.js';
import { cardController } from '../controllers/cardController.js';

export const deckRoutes = Router();

// ===== Deck CRUD =====
deckRoutes.get('/', deckController.list);           // GET    /api/decks
deckRoutes.post('/', deckController.create);        // POST   /api/decks
deckRoutes.get('/:id', deckController.getById);    // GET    /api/decks/:id
deckRoutes.put('/:id', deckController.update);     // PUT    /api/decks/:id
deckRoutes.delete('/:id', deckController.remove);  // DELETE /api/decks/:id

// ===== 嵌套 Card 路由（共享 /decks 前缀）=====
deckRoutes.get('/:deckId/cards', cardController.listByDeck);   // GET   /api/decks/:deckId/cards
deckRoutes.post('/:deckId/cards', cardController.create);     // POST  /api/decks/:deckId/cards
