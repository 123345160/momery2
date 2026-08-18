/**
 * 记忆学习平台 — 后端启动入口（ARCH §4.1）
 *
 * 启动时序：
 * 1. 加载 config.ts（dotenv.config 读取 .env，合并默认值）
 * 2. db/connection.ts（new Database，开启 WAL + 外键约束）
 * 3. db/migrate.ts（幂等建表 8 张 + 预置默认模板）
 * 4. 引入 app.ts（组装 Express 应用）
 * 5. app.listen(port)
 * 6. logger.info(...) 输出启动信息
 *
 * 优雅关闭（STANDARDS §9.3）：
 * SIGINT → closeDb() → process.exit(0)
 */

import { config } from './config.js';
import { getDb, closeDb } from './db/connection.js';
import { migrate } from './db/migrate.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

// 1. 配置已在 config.ts import 时加载

// 2. 数据库连接
const db = getDb();
logger.info('数据库已连接', { path: config.dbPath });

// 3. 迁移
migrate();
const tableRow = db
  .prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table'")
  .get() as { cnt: number };
logger.info('数据库迁移完成', { tables: tableRow.cnt });

// 4. 创建 Express 应用
const app = createApp();

// 5. 启动监听
app.listen(config.port, () => {
  // 6. 输出启动信息（ARCH §15.1 格式）
  logger.info(`Server running on http://localhost:${config.port}`);
  logger.info('环境信息', { env: config.nodeEnv, db: config.dbPath });
});

// 优雅关闭
process.on('SIGINT', () => {
  logger.info('收到 SIGINT，正在关闭服务...');
  closeDb();
  logger.info('数据库连接已关闭');
  process.exit(0);
});
