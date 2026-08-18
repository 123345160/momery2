/**
 * folderRepo.ts — folders 表数据访问层（DB §6.3.1）
 * 纯 SQL 操作，不包含业务判断、不调用其他 repository
 */

import { getDb } from '../db/connection.js';
import type { Folder, FolderInsertDTO, FolderUpdateDTO } from '../types/index.js';

export const folderRepo = {
  /** 获取全部文件夹，按名称排序 */
  getAll(): Folder[] {
    return getDb().prepare('SELECT * FROM folders ORDER BY name').all() as Folder[];
  },

  /** 按 ID 查 */
  getById(id: number): Folder | null {
    const row = getDb().prepare('SELECT * FROM folders WHERE id = ?').get(id) as Folder | undefined;
    return row ?? null;
  },

  /** 获取子文件夹 */
  getChildren(parentId: number): Folder[] {
    return getDb()
      .prepare('SELECT * FROM folders WHERE parent_id = ? ORDER BY name')
      .all(parentId) as Folder[];
  },

  /** 插入文件夹 */
  insert(dto: FolderInsertDTO): number {
    const db = getDb();
    const result = db
      .prepare('INSERT INTO folders (name, parent_id) VALUES (?, ?)')
      .run(dto.name, dto.parentId ?? null);
    return Number(result.lastInsertRowid);
  },

  /** 更新文件夹名称 */
  update(id: number, dto: FolderUpdateDTO): number {
    const db = getDb();
    const result = db
      .prepare("UPDATE folders SET name = ?, updated_at = datetime('now') WHERE id = ?")
      .run(dto.name, id);
    return result.changes;
  },

  /**
   * 删除文件夹
   * 约束（DB §3.1.1）：无子文件夹、无笔记、无关联牌组，任一非空抛错
   */
  remove(id: number): number {
    const db = getDb();

    // 校验：无子文件夹
    const childCount = db
      .prepare('SELECT COUNT(*) as cnt FROM folders WHERE parent_id = ?')
      .get(id) as { cnt: number };
    if (childCount.cnt > 0) {
      throw new Error('FOLDER_NOT_EMPTY: 存在子文件夹');
    }

    // 校验：无笔记
    const noteCount = db
      .prepare('SELECT COUNT(*) as cnt FROM notes WHERE folder_id = ?')
      .get(id) as { cnt: number };
    if (noteCount.cnt > 0) {
      throw new Error('FOLDER_NOT_EMPTY: 文件夹下存在笔记');
    }

    // 校验：无关联牌组
    const deckCount = db
      .prepare('SELECT COUNT(*) as cnt FROM decks WHERE folder_id = ?')
      .get(id) as { cnt: number };
    if (deckCount.cnt > 0) {
      throw new Error('FOLDER_NOT_EMPTY: 文件夹下存在牌组');
    }

    const result = db.prepare('DELETE FROM folders WHERE id = ?').run(id);
    return result.changes;
  },
};
