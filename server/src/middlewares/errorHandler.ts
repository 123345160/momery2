/**
 * 全局错误处理中间件（ARCH §7.4, STANDARDS §7.3）
 *
 * 注册位置：Express 应用最后注册（4 参数函数，Express 自动识别）
 * 处理逻辑：
 * - AppError → fail(res, err.code, err.message, err.httpStatus) + warn 日志
 * - 未知异常 → fail(res, 50004, '服务器内部错误', 500) + error 日志（含 stack）
 *
 * 安全：生产环境响应体绝不泄露 stack trace 或文件路径
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { ErrorCodes } from '../utils/errorCodes.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    // 可预期业务异常
    logger.warn('业务异常', { code: err.code, message: err.message });
    fail(res, err.code, err.message, err.httpStatus);
    return;
  }

  // 未知异常兜底：50004 + 脱敏消息，原始错误记入 error 日志
  logger.error('未捕获异常', { error: err.message, stack: err.stack });
  fail(res, ErrorCodes.INTERNAL_ERROR, '服务器内部错误', 500);
}
