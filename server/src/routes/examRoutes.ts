/**
 * examRoutes.ts — 考试目标路由
 */

import { Router } from 'express';
import { examController } from '../controllers/examController.js';

export const examRoutes = Router();

examRoutes.get('/', examController.list);
examRoutes.post('/', examController.create);
examRoutes.get('/:id', examController.get);
examRoutes.get('/:id/progress', examController.progress);
examRoutes.put('/:id', examController.update);
examRoutes.delete('/:id', examController.remove);
