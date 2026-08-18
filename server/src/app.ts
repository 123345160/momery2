/**
 * 记忆学习平台 — Express 应用组装（ARCH §4.2）
 *
 * 组装顺序（不可随意变更）：
 * 1. 全局中间件：express.json() + urlencoded() + cors() + requestLogger
 * 2. 健康检查：GET /api/health（必须注册在 authGuard 之前 — STANDARDS §10.3）
 * 3. 路由挂载：app.use('/api', authGuard, apiRouter)
 * 4. 错误处理：errorHandler（最后注册，Express 4 通过 4 参数识别）
 */

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { getDb } from './db/connection.js';
import { success } from './utils/response.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { authGuard } from './middlewares/authGuard.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { apiRoutes } from './routes/index.js';

export function createApp(): express.Application {
  const app = express();

  // 1. 全局中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors({ origin: config.corsOrigin }));
  app.use(requestLogger);

  // 2. 健康检查（必须在 authGuard 之前 — STANDARDS §10.3）
  app.get('/api/health', (_req: Request, res: Response) => {
    let dbStatus: string;
    try {
      const db = getDb();
      db.prepare('SELECT 1').get();
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    success(res, {
      status: 'ok',
      uptime: process.uptime(),
      db: dbStatus,
    });
  });

  // 3. 路由挂载（所有 /api 路由统一走 authGuard — STANDARDS §10.3）
  app.use('/api', authGuard, apiRoutes);

  // 4. 错误处理（最后注册 — Express 4 通过 4 参数识别）
  app.use(errorHandler);

  return app;
}
