/**
 * templateRepo.ts — templates 表数据访问层
 * 字段：name/description/front/back/is_default
 */

import { getDb } from '../db/connection.js';
import type { Template, TemplateInsertDTO } from '../types/index.js';

export const templateRepo = {
  getAll(): Template[] {
    return getDb().prepare('SELECT * FROM templates ORDER BY is_default DESC, name').all() as Template[];
  },

  getById(id: number): Template | null {
    const row = getDb().prepare('SELECT * FROM templates WHERE id = ?').get(id) as
      | Template
      | undefined;
    return row ?? null;
  },

  insert(dto: TemplateInsertDTO): number {
    const result = getDb()
      .prepare(
        `INSERT INTO templates (name, description, front, back, is_default)
         VALUES (?, ?, ?, ?, 0)`,
      )
      .run(dto.name, dto.description ?? null, dto.front ?? '', dto.back ?? '');
    return Number(result.lastInsertRowid);
  },

  update(id: number, dto: Partial<TemplateInsertDTO>): number {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    if (dto.name !== undefined) { sets.push('name = ?'); params.push(dto.name); }
    if (dto.description !== undefined) { sets.push('description = ?'); params.push(dto.description); }
    if (dto.front !== undefined) { sets.push('front = ?'); params.push(dto.front); }
    if (dto.back !== undefined) { sets.push('back = ?'); params.push(dto.back); }
    if (sets.length === 0) return 0;
    params.push(id);
    const result = getDb()
      .prepare(`UPDATE templates SET ${sets.join(', ')} WHERE id = ?`)
      .run(...params);
    return result.changes;
  },

  remove(id: number): number {
    const result = getDb().prepare('DELETE FROM templates WHERE id = ?').run(id);
    return result.changes;
  },
};
