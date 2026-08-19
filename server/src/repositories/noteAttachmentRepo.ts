/**
 * noteAttachmentRepo.ts — note_attachments 表数据访问层
 */

import { getDb } from '../db/connection.js';
import type { NoteAttachment, AttachmentInsertDTO } from '../types/index.js';

export const noteAttachmentRepo = {
  /** 按笔记查附件 */
  getByNote(noteId: number): NoteAttachment[] {
    return getDb()
      .prepare('SELECT * FROM note_attachments WHERE note_id = ? ORDER BY created_at DESC')
      .all(noteId) as NoteAttachment[];
  },

  getById(id: number): NoteAttachment | null {
    const row = getDb().prepare('SELECT * FROM note_attachments WHERE id = ?').get(id) as
      | NoteAttachment
      | undefined;
    return row ?? null;
  },

  insert(dto: AttachmentInsertDTO): number {
    const result = getDb()
      .prepare(
        `INSERT INTO note_attachments (note_id, filename, file_type, file_size, filepath)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(dto.noteId, dto.filename, dto.fileType ?? null, dto.fileSize ?? null, dto.filepath);
    return Number(result.lastInsertRowid);
  },

  remove(id: number): number {
    const result = getDb().prepare('DELETE FROM note_attachments WHERE id = ?').run(id);
    return result.changes;
  },
};
