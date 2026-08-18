/**
 * templateRepo.ts — templates 表数据访问层（DB §6.3.6）
 * 纯 SQL 操作，不包含业务判断
 */

import { getDb } from '../db/connection.js';
import type { Template, TemplateInsertDTO } from '../types/index.js';

export const templateRepo = {
  /** 获取全部模板，预置模板优先 */
  getAll(): Template[] {
    return getDb()
      .prepare('SELECT * FROM templates ORDER BY is_default DESC, created_at')
      .all() as Template[];
  },

  /** 按 ID 查 */
  getById(id: number): Template | null {
    const row = getDb()
      .prepare('SELECT * FROM templates WHERE id = ?')
      .get(id) as Template | undefined;
    return row ?? null;
  },

  /** 插入用户模板 */
  insert(dto: TemplateInsertDTO): number {
    const db = getDb();
    const result = db
      .prepare('INSERT INTO templates (name, description, front, back, is_default) VALUES (?, ?, ?, ?, 0)')
      .run(dto.name, dto.description ?? '', dto.front ?? '', dto.back ?? '');
    return Number(result.lastInsertRowid);
  },

  /** 删除模板（禁止删除 is_default=1 的记录） */
  remove(id: number): number {
    const db = getDb();

    const row = db
      .prepare('SELECT is_default FROM templates WHERE id = ?')
      .get(id) as { is_default: number } | undefined;

    if (!row) return 0;
    if (row.is_default === 1) {
      throw new Error('TEMPLATE_IS_DEFAULT: 禁止删除预置模板');
    }

    const result = db.prepare('DELETE FROM templates WHERE id = ?').run(id);
    return result.changes;
  },
};
