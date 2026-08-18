/**
 * examRepo.ts — exams 表数据访问层（DB §6.3.7）
 * 纯 SQL 操作，不包含业务判断
 */

import { getDb } from '../db/connection.js';
import type { Exam, ExamInsertDTO, ExamUpdateDTO } from '../types/index.js';

export const examRepo = {
  /** 获取全部考试目标 */
  getAll(): Exam[] {
    return getDb()
      .prepare('SELECT * FROM exams ORDER BY created_at DESC')
      .all() as Exam[];
  },

  /** 获取活跃的考试目标 */
  getActive(): Exam[] {
    return getDb()
      .prepare("SELECT * FROM exams WHERE status = 'active' ORDER BY created_at DESC")
      .all() as Exam[];
  },

  /** 插入考试目标 */
  insert(dto: ExamInsertDTO): number {
    const db = getDb();
    const result = db
      .prepare(
        'INSERT INTO exams (name, deck_id, target_date, target_count, status) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        dto.name,
        dto.deckId ?? null,
        dto.targetDate ?? null,
        dto.targetCount ?? 0,
        'active'
      );
    return Number(result.lastInsertRowid);
  },

  /** 更新考试目标 */
  update(id: number, dto: ExamUpdateDTO): number {
    const db = getDb();
    const sets: string[] = [];
    const params: (string | number | null)[] = [];

    if (dto.name !== undefined) {
      sets.push('name = ?');
      params.push(dto.name);
    }
    if (dto.deckId !== undefined) {
      sets.push('deck_id = ?');
      params.push(dto.deckId);
    }
    if (dto.targetDate !== undefined) {
      sets.push('target_date = ?');
      params.push(dto.targetDate);
    }
    if (dto.targetCount !== undefined) {
      sets.push('target_count = ?');
      params.push(dto.targetCount);
    }
    if (dto.status !== undefined) {
      sets.push('status = ?');
      params.push(dto.status);
    }

    if (sets.length === 0) return 0;

    params.push(id);
    const result = db.prepare(`UPDATE exams SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return result.changes;
  },

  /** 删除考试目标 */
  remove(id: number): number {
    const result = getDb().prepare('DELETE FROM exams WHERE id = ?').run(id);
    return result.changes;
  },
};
