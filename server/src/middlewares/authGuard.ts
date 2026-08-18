/**
 * 权限校验中间件（STANDARDS §10）
 *
 * V1.0/M1 行为：直接 next()，不做任何校验
 * 目的：预留架构插槽，M2 启用时零路由改动
 *
 * M2 启用后的预期行为（STANDARDS §10.2）：
 * 1. 读取 req.headers.authorization
 * 2. 解析 Bearer <token>
 * 3. 验证 JWT 有效性
 * 4. 注入 req.userId = decoded.sub
 * 5. 验证失败 → throw new AppError(40101, '未登录', 401)
 */

import type { Request, Response, NextFunction } from 'express';

export function authGuard(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
