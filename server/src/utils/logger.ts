/**
 * Winston 日志单例（ARCH §11, STANDARDS §8）
 *
 * 日志级别：error > warn > info > debug
 * 开发环境：控制台彩色文本
 * 生产环境：控制台 JSON + logs/error.log + logs/combined.log
 *
 * 禁止行为（STANDARDS §8.4）：
 * - 禁止 console.log（统一用 logger）
 * - 禁止记录密码/token/密钥
 * - 禁止记录完整文件内容
 */

import winston from 'winston';
import { config } from '../config.js';
import { existsSync, mkdirSync } from 'fs';

const isDev = config.nodeEnv === 'development';

const transports: winston.transport[] = [];

if (isDev) {
  // 开发环境：控制台彩色文本
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} ${level} ${message}${metaStr}`;
        }),
      ),
    }),
  );
} else {
  // 生产环境：确保 logs 目录存在
  if (!existsSync('logs')) {
    mkdirSync('logs', { recursive: true });
  }

  // 控制台 JSON
  transports.push(
    new winston.transports.Console({
      format: winston.format.json(),
    }),
  );
  // error.log — 仅 error 级别
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  );
  // combined.log — 全级别
  transports.push(
    new winston.transports.File({ filename: 'logs/combined.log' }),
  );
}

export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
  ),
  transports,
});
