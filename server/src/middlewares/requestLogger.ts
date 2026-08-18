/**
 * 请求日志中间件（ARCH §7.2, STANDARDS §8.2.3）
 *
 * 每个请求进入时记录开始时间，响应结束时记录日志
 * 记录字段：method, url, status, duration (ms), timestamp
 * 日志级别：info（正常）/ error（status >= 400）
 * 不记录请求 body 和响应 body（隐私 + 体积考虑）
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    logger.log(level, `${req.method} ${req.url} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
    });
  });

  next();
}
