/**
 * deckRepo.ts — decks 表数据访问层（DB §6.3.8）
 * 纯 SQL 操作，不包含业务判断
 */

import { getDb } from '../db/connection.js';
import type { Deck, DeckInsertDTO, DeckUpdateDTO } from '../types/index.js';

export const deckRepo = {
  /** 获取全部牌组（卡片计数与到期数由 deckService 编排聚合） */
  getAll(): Deck[] {
    return getDb()
      .prepare('SELECT * FROM decks ORDER BY created_at DESC')
      .all() as Deck[];
  },

  /** 按文件夹查牌组 */
  getByFolder(folderId: number): Deck[] {
    return getDb()
      .prepare('SELECT * FROM decks WHERE folder_id = ? ORDER BY created_at DESC')
      .all(folderId) as Deck[];
  },

  /** 按 ID 查 */
  getById(id: number): Deck | null {
    const row = getDb().prepare('SELECT * FROM decks WHERE id = ?').get(id) as Deck | undefined;
    return row ?? null;
  },

  /** 插入牌组 */
  insert(dto: DeckInsertDTO): number {
    const db = getDb();
    const result = db
      .prepare(
        'INSERT INTO decks (name, description, folder_id, icon, color) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        dto.name,
        dto.description ?? '',
        dto.folderId ?? null,
        dto.icon ?? '📚',
        dto.color ?? '#f0f0f0'
      );
    return Number(result.lastInsertRowid);
  },

  /** 更新牌组 */
  update(id: number, dto: DeckUpdateDTO): number {
    const db = getDb();
    const sets: string[] = [];
    const params: (string | number | null)[] = [];

    if (dto.name !== undefined) {
      sets.push('name = ?');
      params.push(dto.name);
    }
    if (dto.description !== undefined) {
      sets.push('description = ?');
      params.push(dto.description);
    }
    if (dto.folderId !== undefined) {
      sets.push('folder_id = ?');
      params.push(dto.folderId);
    }
    if (dto.icon !== undefined) {
      sets.push('icon = ?');
      params.push(dto.icon);
    }
    if (dto.color !== undefined) {
      sets.push('color = ?');
      params.push(dto.color);
    }

    if (sets.length === 0) return 0;

    sets.push("updated_at = datetime('now')");
    params.push(id);

    const result = db.prepare(`UPDATE decks SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return result.changes;
  },

  /** 删除牌组（卡片与复习记录由外键级联删除，考试目标 deck_id 置 NULL） */
  remove(id: number): number {
    const result = getDb().prepare('DELETE FROM decks WHERE id = ?').run(id);
    return result.changes;
  },
};
