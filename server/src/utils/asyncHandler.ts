/**
 * async 路由包装器（STANDARDS §7.4，强制）
 *
 * Express 4 不会自动捕获 async 函数中的异常
 * 所有 async controller handler 必须通过本包装器调用
 * 确保 Promise rejection 被正确传递给 Express error handler
 */

import type { Request, Response, NextFunction } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
