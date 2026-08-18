/**
 * 记忆学习平台 — SQLite 数据库连接（单例）
 *
 * 规范：DB §6.1 — 单一 better-sqlite3 实例
 * 特性：WAL 模式 + 外键约束 + busy_timeout（ARCH §4.1）
 */

import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { config } from '../config.js';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

let dbInstance: DatabaseType | null = null;

/**
 * 获取数据库单例（首次调用时创建，后续复用）
 */
export function getDb(): DatabaseType {
  if (dbInstance) {
    return dbInstance;
  }

  // 确保数据目录存在
  const dbDir = dirname(config.dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(config.dbPath);

  // 开启 WAL 模式（Write-Ahead Logging）
  dbInstance.pragma('journal_mode = WAL');

  // 启用外键约束
  dbInstance.pragma('foreign_keys = ON');

  // 设置 busy_timeout（毫秒，等待锁的最大时间）
  dbInstance.pragma('busy_timeout = 5000');

  return dbInstance;
}

/**
 * 关闭数据库连接（测试 / 优雅关闭时使用）
 */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * 用于测试：注入指定的数据库实例（如内存数据库）
 */
export function setDb(db: DatabaseType): void {
  if (dbInstance) {
    dbInstance.close();
  }
  dbInstance = db;
  dbInstance.pragma('foreign_keys = ON');
}

/**
 * 事务包装器（DB §7.7 — service 层跨 repo 原子操作）
 *
 * better-sqlite3 事务是同步的，fn 内所有 getDb() 调用返回同一实例，
 * prepare().run() 自动在事务上下文内执行。fn 抛异常时自动 ROLLBACK。
 *
 * @example
 * runInTransaction(() => {
 *   cardRepo.updateReviewState(id, state);
 *   reviewLogRepo.insert({ cardId, deckId, result });
 * });
 */
export function runInTransaction<T>(fn: () => T): T {
  const db = getDb();
  return db.transaction(fn)();
}
