/**
 * 记忆学习平台 — 配置中心（ARCH §5）
 *
 * 唯一配置出口：任何模块需要配置时 import { config } from '../config.js'
 * 禁止其他文件直接读 process.env（ARCH §5.2）
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || './data/app.db',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'development',
} as const;
