/**
 * folderRepo.ts — folders 表数据访问层
 * 纯 SQL 操作，不包含业务判断
 */

import { getDb } from '../db/connection.js';
import type { Folder, FolderInsertDTO, FolderUpdateDTO } from '../types/index.js';

export const folderRepo = {
  /** 查询全部文件夹（用于内存构建树） */
  getAll(): Folder[] {
    return getDb().prepare('SELECT * FROM folders ORDER BY name').all() as Folder[];
  },

  getById(id: number): Folder | null {
    const row = getDb().prepare('SELECT * FROM folders WHERE id = ?').get(id) as
      | Folder
      | undefined;
    return row ?? null;
  },

  getByNameAndParent(name: string, parentId: number | null): Folder | null {
    const row = getDb()
      .prepare('SELECT * FROM folders WHERE name = ? AND parent_id IS ?')
      .get(name, parentId) as Folder | undefined;
    return row ?? null;
  },

  /** 查询某文件夹下的直接子文件夹 */
  getChildren(parentId: number | null): Folder[] {
    return getDb()
      .prepare('SELECT * FROM folders WHERE parent_id IS ? ORDER BY name')
      .all(parentId) as Folder[];
  },

  /** 统计某文件夹下的笔记数量（不含子文件夹） */
  countNotes(folderId: number): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) AS c FROM notes WHERE folder_id = ?')
      .get(folderId) as { c: number };
    return row.c;
  },

  /** 统计某文件夹下的直接子文件夹数量 */
  countChildren(folderId: number): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) AS c FROM folders WHERE parent_id = ?')
      .get(folderId) as { c: number };
    return row.c;
  },

  insert(dto: FolderInsertDTO): number {
    const result = getDb()
      .prepare('INSERT INTO folders (name, parent_id) VALUES (?, ?)')
      .run(dto.name, dto.parentId ?? null);
    return Number(result.lastInsertRowid);
  },

  update(id: number, dto: FolderUpdateDTO): number {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    if (dto.name !== undefined) {
      sets.push('name = ?');
      params.push(dto.name);
    }
    if (sets.length === 0) return 0;
    sets.push("updated_at = datetime('now')");
    params.push(id);
    const result = getDb()
      .prepare(`UPDATE folders SET ${sets.join(', ')} WHERE id = ?`)
      .run(...params);
    return result.changes;
  },

  /** 移动文件夹到新父（专门用于 move 操作） */
  moveTo(id: number, parentId: number | null): number {
    const result = getDb()
      .prepare("UPDATE folders SET parent_id = ?, updated_at = datetime('now') WHERE id = ?")
      .run(parentId, id);
    return result.changes;
  },

  /**
   * 删除文件夹（前置校验由 service 负责：非空保护）
   * 注意外键：notes.folder_id ON DELETE RESTRICT，notes 存在时删除会失败
   */
  remove(id: number): number {
    const result = getDb().prepare('DELETE FROM folders WHERE id = ?').run(id);
    return result.changes;
  },
};
