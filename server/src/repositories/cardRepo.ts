/**
 * cardRepo.ts — cards 表数据访问层（DB §6.3.4，核心表）
 * 纯 SQL 操作，不包含业务判断
 */

import { getDb } from '../db/connection.js';
import type {
  Card,
  CardInsertDTO,
  CardUpdateDTO,
  CardReviewStateDTO,
} from '../types/index.js';

export const cardRepo = {
  /** 按牌组查全部卡片 */
  getByDeck(deckId: number): Card[] {
    return getDb()
      .prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at')
      .all(deckId) as Card[];
  },

  /** 按 ID 查 */
  getById(id: number): Card | null {
    const row = getDb().prepare('SELECT * FROM cards WHERE id = ?').get(id) as Card | undefined;
    return row ?? null;
  },

  /** 获取到期卡片（最高频查询，走 idx_cards_next_review） */
  getDueCards(deckId: number): Card[] {
    return getDb()
      .prepare(
        `SELECT * FROM cards
         WHERE deck_id = ? AND next_review <= datetime('now')
         ORDER BY next_review ASC`
      )
      .all(deckId) as Card[];
  },

  /** 插入单张卡片 */
  insert(dto: CardInsertDTO): number {
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO cards (deck_id, front, back, source_note, tags)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(dto.deckId, dto.front, dto.back, dto.sourceNote ?? null, dto.tags ?? '[]');
    return Number(result.lastInsertRowid);
  },

  /** 批量插入卡片（事务内） */
  insertBatch(dtos: CardInsertDTO[]): number[] {
    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO cards (deck_id, front, back, source_note, tags)
       VALUES (?, ?, ?, ?, ?)`
    );
    const ids: number[] = [];

    const tx = db.transaction(() => {
      for (const dto of dtos) {
        const result = stmt.run(
          dto.deckId,
          dto.front,
          dto.back,
          dto.sourceNote ?? null,
          dto.tags ?? '[]'
        );
        ids.push(Number(result.lastInsertRowid));
      }
    });
    tx();

    return ids;
  },

  /** 更新卡片内容字段 */
  update(id: number, dto: CardUpdateDTO): number {
    const db = getDb();
    const sets: string[] = [];
    const params: (string | number)[] = [];

    if (dto.front !== undefined) {
      sets.push('front = ?');
      params.push(dto.front);
    }
    if (dto.back !== undefined) {
      sets.push('back = ?');
      params.push(dto.back);
    }
    if (dto.tags !== undefined) {
      sets.push('tags = ?');
      params.push(dto.tags);
    }

    if (sets.length === 0) return 0;

    sets.push("updated_at = datetime('now')");
    params.push(id);

    const result = db.prepare(`UPDATE cards SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return result.changes;
  },

  /** 更新复习状态字段（SM-2 算法写回） */
  updateReviewState(id: number, state: CardReviewStateDTO): number {
    const db = getDb();
    const result = db
      .prepare(
        `UPDATE cards
         SET ease_factor = ?, interval = ?, repetitions = ?,
             next_review = ?, last_reviewed = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(
        state.ease_factor,
        state.interval,
        state.repetitions,
        state.next_review,
        state.last_reviewed,
        id
      );
    return result.changes;
  },

  /** 删除卡片（复习记录由外键级联删除） */
  remove(id: number): number {
    const result = getDb().prepare('DELETE FROM cards WHERE id = ?').run(id);
    return result.changes;
  },
};
