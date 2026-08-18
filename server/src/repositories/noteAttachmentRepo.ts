/**
 * noteAttachmentRepo.ts — note_attachments 表数据访问层（DB §6.3.3）
 * 纯 SQL 操作，不包含业务判断
 */

import { getDb } from '../db/connection.js';
import type { NoteAttachment, AttachmentInsertDTO } from '../types/index.js';

export const noteAttachmentRepo = {
  /** 按笔记 ID 查附件 */
  getByNote(noteId: number): NoteAttachment[] {
    return getDb()
      .prepare('SELECT * FROM note_attachments WHERE note_id = ? ORDER BY created_at')
      .all(noteId) as NoteAttachment[];
  },

  /** 按 ID 查 */
  getById(id: number): NoteAttachment | null {
    const row = getDb()
      .prepare('SELECT * FROM note_attachments WHERE id = ?')
      .get(id) as NoteAttachment | undefined;
    return row ?? null;
  },

  /** 插入附件记录 */
  insert(dto: AttachmentInsertDTO): number {
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO note_attachments (note_id, filename, filepath, file_type, file_size)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(dto.noteId, dto.filename, dto.filepath, dto.fileType ?? 'other', dto.fileSize ?? 0);
    return Number(result.lastInsertRowid);
  },

  /** 删除附件记录（物理文件删除由 noteService 执行） */
  remove(id: number): number {
    const result = getDb().prepare('DELETE FROM note_attachments WHERE id = ?').run(id);
    return result.changes;
  },
};
