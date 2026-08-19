/**
 * templateRoutes.ts — 卡片模板路由
 */

import { Router } from 'express';
import { templateController } from '../controllers/templateController.js';

export const templateRoutes = Router();

templateRoutes.get('/', templateController.list);
templateRoutes.post('/', templateController.create);
templateRoutes.get('/:id', templateController.get);
templateRoutes.put('/:id', templateController.update);
templateRoutes.delete('/:id', templateController.remove);
