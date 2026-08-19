/**
 * noteRepo.ts — notes 表数据访问层
 * 纯 SQL 操作，字段与 DB schema 一致：folder_id/title/content/is_today/tags
 */

import { getDb } from '../db/connection.js';
import type { Note, NoteInsertDTO, NoteUpdateDTO } from '../types/index.js';

export const noteRepo = {
  /** 按文件夹查笔记（默认按 updated_at 倒序） */
  getByFolder(folderId: number | null): Note[] {
    return getDb()
      .prepare('SELECT * FROM notes WHERE folder_id IS ? ORDER BY updated_at DESC')
      .all(folderId) as Note[];
  },

  /** 今日创建的笔记（按 created_at 的日期部分匹配） */
  getCreatedToday(todayStartUTC: string): Note[] {
    return getDb()
      .prepare(
        `SELECT * FROM notes
         WHERE created_at >= ? AND created_at < datetime(?, '+1 day')
         ORDER BY created_at DESC`,
      )
      .all(todayStartUTC, todayStartUTC) as Note[];
  },

  getAll(): Note[] {
    return getDb().prepare('SELECT * FROM notes ORDER BY updated_at DESC').all() as Note[];
  },

  getById(id: number): Note | null {
    const row = getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id) as
      | Note
      | undefined;
    return row ?? null;
  },

  /** 关键词搜索（标题/正文，大小写不敏感） */
  search(keyword: string, limit: number): Note[] {
    return getDb()
      .prepare(
        `SELECT * FROM notes
         WHERE title LIKE ? OR content LIKE ?
         ORDER BY updated_at DESC
         LIMIT ?`,
      )
      .all(`%${keyword}%`, `%${keyword}%`, limit) as Note[];
  },

  insert(dto: NoteInsertDTO): number {
    const result = getDb()
      .prepare(
        `INSERT INTO notes (folder_id, title, content, is_today, tags)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        dto.folderId ?? null,
        dto.title ?? '未命名笔记',
        dto.content ?? '',
        dto.isToday ?? 0,
        dto.tags ?? '[]',
      );
    return Number(result.lastInsertRowid);
  },

  update(id: number, dto: NoteUpdateDTO): number {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    if (dto.folderId !== undefined) { sets.push('folder_id = ?'); params.push(dto.folderId); }
    if (dto.title !== undefined) { sets.push('title = ?'); params.push(dto.title); }
    if (dto.content !== undefined) { sets.push('content = ?'); params.push(dto.content); }
    if (dto.isToday !== undefined) { sets.push('is_today = ?'); params.push(dto.isToday); }
    if (dto.tags !== undefined) { sets.push('tags = ?'); params.push(dto.tags); }
    if (sets.length === 0) return 0;
    sets.push("updated_at = datetime('now')");
    params.push(id);
    const result = getDb()
      .prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`)
      .run(...params);
    return result.changes;
  },

  remove(id: number): number {
    const result = getDb().prepare('DELETE FROM notes WHERE id = ?').run(id);
    return result.changes;
  },
};
