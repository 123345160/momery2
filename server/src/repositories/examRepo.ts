/**
 * examRepo.ts — exams 表数据访问层
 * 字段：name/deck_id/target_date/target_count/status
 */

import { getDb } from '../db/connection.js';
import type { Exam, ExamInsertDTO, ExamUpdateDTO } from '../types/index.js';

export const examRepo = {
  getAll(): Exam[] {
    return getDb().prepare('SELECT * FROM exams ORDER BY target_date ASC').all() as Exam[];
  },

  getById(id: number): Exam | null {
    const row = getDb().prepare('SELECT * FROM exams WHERE id = ?').get(id) as Exam | undefined;
    return row ?? null;
  },

  insert(dto: ExamInsertDTO): number {
    const result = getDb()
      .prepare(
        `INSERT INTO exams (name, deck_id, target_date, target_count, status)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(dto.name, dto.deckId ?? null, dto.targetDate ?? null, dto.targetCount ?? 0, 'active');
    return Number(result.lastInsertRowid);
  },

  update(id: number, dto: ExamUpdateDTO): number {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    if (dto.name !== undefined) { sets.push('name = ?'); params.push(dto.name); }
    if (dto.deckId !== undefined) { sets.push('deck_id = ?'); params.push(dto.deckId); }
    if (dto.targetDate !== undefined) { sets.push('target_date = ?'); params.push(dto.targetDate); }
    if (dto.targetCount !== undefined) { sets.push('target_count = ?'); params.push(dto.targetCount); }
    if (dto.status !== undefined) { sets.push('status = ?'); params.push(dto.status); }
    if (sets.length === 0) return 0;
    sets.push("updated_at = datetime('now')");
    params.push(id);
    const result = getDb()
      .prepare(`UPDATE exams SET ${sets.join(', ')} WHERE id = ?`)
      .run(...params);
    return result.changes;
  },

  remove(id: number): number {
    const result = getDb().prepare('DELETE FROM exams WHERE id = ?').run(id);
    return result.changes;
  },
};
