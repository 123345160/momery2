/**
 * noteRepo.ts — notes 表数据访问层（DB §6.3.2）
 * 纯 SQL 操作，不包含业务判断
 */

import { getDb } from '../db/connection.js';
import type { Note, NoteInsertDTO, NoteUpdateDTO } from '../types/index.js';

export const noteRepo = {
  /** 按文件夹查笔记 */
  getByFolder(folderId: number): Note[] {
    return getDb()
      .prepare('SELECT * FROM notes WHERE folder_id = ? ORDER BY updated_at DESC')
      .all(folderId) as Note[];
  },

  /** 获取今日临时笔记 */
  getTodayNotes(): Note[] {
    return getDb()
      .prepare('SELECT * FROM notes WHERE is_today = 1 ORDER BY updated_at DESC')
      .all() as Note[];
  },

  /** 按 ID 查 */
  getById(id: number): Note | null {
    const row = getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note | undefined;
    return row ?? null;
  },

  /** 插入笔记 */
  insert(dto: NoteInsertDTO): number {
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO notes (folder_id, title, content, is_today, tags)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        dto.folderId ?? null,
        dto.title ?? '未命名笔记',
        dto.content ?? '',
        dto.isToday ?? 0,
        dto.tags ?? '[]'
      );
    return Number(result.lastInsertRowid);
  },

  /** 更新笔记（部分字段） */
  update(id: number, dto: NoteUpdateDTO): number {
    const db = getDb();
    const sets: string[] = [];
    const params: (string | number | null)[] = [];

    if (dto.title !== undefined) {
      sets.push('title = ?');
      params.push(dto.title);
    }
    if (dto.content !== undefined) {
      sets.push('content = ?');
      params.push(dto.content);
    }
    if (dto.folderId !== undefined) {
      sets.push('folder_id = ?');
      params.push(dto.folderId);
    }
    if (dto.isToday !== undefined) {
      sets.push('is_today = ?');
      params.push(dto.isToday);
    }
    if (dto.tags !== undefined) {
      sets.push('tags = ?');
      params.push(dto.tags);
    }

    if (sets.length === 0) return 0;

    sets.push("updated_at = datetime('now')");
    params.push(id);

    const result = db.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return result.changes;
  },

  /** 删除笔记（附件由外键级联删除） */
  remove(id: number): number {
    const result = getDb().prepare('DELETE FROM notes WHERE id = ?').run(id);
    return result.changes;
  },
};
