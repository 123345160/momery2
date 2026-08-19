/**
 * searchRoutes.ts — 全局搜索路由
 */

import { Router } from 'express';
import { searchController } from '../controllers/searchController.js';

export const searchRoutes = Router();

searchRoutes.get('/', searchController.search);
