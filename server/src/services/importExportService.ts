/**
 * importExportService.ts — 导入导出业务层（ARCH §10 / §6.2.11）
 *
 * 职责：
 * - exportAll：全量导出（decks + cards + review_logs）→ ExportPayload
 * - exportDeck：单牌组导出 → ExportPayload
 * - importJson：JSON 校验 → 事务内幂等导入（R10 同名追加非重复）→ ImportSummary
 *
 * 时间格式转换：
 * - 导出：DB toSqliteUTC 格式 → JSON ISO（ARCH §10.1 示例）
 * - 导入：JSON ISO → DB toSqliteUTC 格式（time-handling-spec R2）
 */

import { deckRepo } from '../repositories/deckRepo.js';
import { cardRepo } from '../repositories/cardRepo.js';
import { importExportRepo } from '../repositories/importExportRepo.js';
import { runInTransaction } from '../db/connection.js';
import { toSqliteUTC } from '../utils/sqliteTime.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type {
  Card,
  Deck,
  ReviewLog,
  ExportPayload,
  ExportDeck,
  ExportCard,
  ExportReviewLog,
  ImportSummary,
  ReviewResult,
} from '../types/index.js';

// ===== 内部辅助函数 =====

/** DB toSqliteUTC 格式 → ISO（导出用） */
function sqliteToISO(s: string | null): string | null {
  if (!s) return null;
  // DB 格式 'YYYY-MM-DD HH:MM:SS' 是 UTC，加 'Z' 让 Date 按 UTC 解析
  return new Date(s + 'Z').toISOString();
}

/** ISO → DB toSqliteUTC 格式（导入用） */
function isoToSqlite(s: string | null): string | null {
  if (!s) return null;
  return toSqliteUTC(new Date(s));
}

/** 类型守卫：普通对象 */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** DB Card → ExportCard（tags JSON 字符串转数组，时间转 ISO） */
function cardToExportCard(card: Card): ExportCard {
  let tags: string[] = [];
  try {
    tags = JSON.parse(card.tags || '[]');
    if (!Array.isArray(tags)) tags = [];
  } catch {
    tags = [];
  }
  return {
    front: card.front,
    back: card.back,
    tags,
    ease_factor: card.ease_factor,
    interval: card.interval,
    repetitions: card.repetitions,
    next_review: sqliteToISO(card.next_review) ?? '',
    last_reviewed: sqliteToISO(card.last_reviewed),
  };
}

// ===== Service =====

export const importExportService = {
  /**
   * 全量导出（GET /api/export/all）
   * 包含全部 decks + cards（含 SM-2）+ review_logs（notes/templates V1.0 占位空数组）
   */
  exportAll(): ExportPayload {
    const decks = deckRepo.getAll();
    const reviewLogs = importExportRepo.getReviewLogsAll();

    // 一次查询每个 deck 的 cards，复用于导出和反查映射
    const deckCardsMap = new Map<number, Card[]>();
    const cardMap = new Map<number, Card>();
    const deckMap = new Map<number, Deck>();
    for (const deck of decks) {
      deckMap.set(deck.id, deck);
      const cards = cardRepo.getByDeck(deck.id);
      deckCardsMap.set(deck.id, cards);
      for (const card of cards) {
        cardMap.set(card.id, card);
      }
    }

    const exportDecks: ExportDeck[] = decks.map((deck) => ({
      name: deck.name,
      description: deck.description,
      cards: (deckCardsMap.get(deck.id) ?? []).map(cardToExportCard),
    }));

    const exportLogs: ExportReviewLog[] = reviewLogs.map((log: ReviewLog) => {
      const card = cardMap.get(log.card_id);
      const deck = deckMap.get(log.deck_id);
      return {
        deck_name: deck?.name ?? '',
        card_front: card?.front ?? '',
        result: log.result as ReviewResult,
        reviewed_at: sqliteToISO(log.reviewed_at) ?? '',
      };
    });

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      decks: exportDecks,
      review_logs: exportLogs,
      notes: [],
      templates: [],
    };
  },

  /**
   * 单牌组导出（GET /api/export/deck/:id）
   * 只含指定 deck + 其 cards + 其 review_logs
   */
  exportDeck(id: number): ExportPayload {
    const deck = deckRepo.getById(id);
    if (!deck) {
      throw new AppError(ErrorCodes.DECK_NOT_FOUND, `牌组不存在: ${id}`, 404);
    }

    const cards = cardRepo.getByDeck(id);
    const reviewLogs = importExportRepo.getReviewLogsByDeck(id);

    // cardId → card 映射（反查 card_front）
    const cardMap = new Map<number, Card>();
    for (const card of cards) {
      cardMap.set(card.id, card);
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      decks: [
        {
          name: deck.name,
          description: deck.description,
          cards: cards.map(cardToExportCard),
        },
      ],
      review_logs: reviewLogs.map((log: ReviewLog) => ({
        deck_name: deck.name,
        card_front: cardMap.get(log.card_id)?.front ?? '',
        result: log.result as ReviewResult,
        reviewed_at: sqliteToISO(log.reviewed_at) ?? '',
      })),
      notes: [],
      templates: [],
    };
  },

  /**
   * 导入 JSON（POST /api/import/json）
   * 策略（ARCH §10.2）：
   * - 校验：JSON 结构不符 schema → 40005 INVALID_JSON
   * - 幂等（R10）：同名牌组合并（decksMerged），同 front 卡片跳过（cardsSkipped）
   * - 进度保留：恢复 SM-2 状态 + 原 reviewed_at
   * - 事务保护：整个导入在 runInTransaction 内，任一失败回滚
   */
  importJson(payload: unknown): ImportSummary {
    // ===== 结构校验 =====
    if (!isObject(payload)) {
      throw new AppError(ErrorCodes.INVALID_JSON, '导入数据必须是对象', 400);
    }
    const decksRaw = payload.decks;
    if (!Array.isArray(decksRaw)) {
      throw new AppError(ErrorCodes.INVALID_JSON, 'decks 必须是数组', 400);
    }
    const reviewLogs = Array.isArray(payload.review_logs) ? payload.review_logs : [];

    const summary: ImportSummary = {
      decksCreated: 0,
      decksMerged: 0,
      cardsInserted: 0,
      cardsSkipped: 0,
      notesInserted: 0,
      templatesInserted: 0,
    };

    runInTransaction(() => {
      // ===== 导入 decks + cards =====
      for (let i = 0; i < decksRaw.length; i++) {
        const deck = decksRaw[i];
        if (!isObject(deck)) {
          throw new AppError(ErrorCodes.INVALID_JSON, `decks[${i}] 必须是对象`, 400);
        }
        if (typeof deck.name !== 'string' || !deck.name.trim()) {
          throw new AppError(ErrorCodes.INVALID_JSON, `decks[${i}].name 无效`, 400);
        }
        if (!Array.isArray(deck.cards)) {
          throw new AppError(ErrorCodes.INVALID_JSON, `decks[${i}].cards 必须是数组`, 400);
        }

        // 幂等检测：同名牌组 → 合并（追加卡片，不覆盖元信息）
        let deckId: number;
        const existing = importExportRepo.getDeckByName(deck.name);
        if (existing) {
          summary.decksMerged++;
          deckId = existing.id;
        } else {
          deckId = deckRepo.insert({
            name: deck.name,
            description: typeof deck.description === 'string' ? deck.description : '',
          });
          summary.decksCreated++;
        }

        // 遍历卡片
        for (let j = 0; j < deck.cards.length; j++) {
          const card = deck.cards[j];
          if (!isObject(card)) {
            throw new AppError(ErrorCodes.INVALID_JSON, `decks[${i}].cards[${j}] 必须是对象`, 400);
          }
          if (typeof card.front !== 'string' || typeof card.back !== 'string') {
            throw new AppError(
              ErrorCodes.INVALID_JSON,
              `decks[${i}].cards[${j}].front/back 无效`,
              400
            );
          }

          // 幂等检测：同 front 卡片 → 跳过
          const existingCard = importExportRepo.getCardByDeckAndFront(deckId, card.front);
          if (existingCard) {
            summary.cardsSkipped++;
            continue;
          }

          // 转换并插入（恢复 SM-2 状态）
          const tags = Array.isArray(card.tags) ? JSON.stringify(card.tags) : '[]';
          importExportRepo.insertCardWithState({
            deckId,
            front: card.front,
            back: card.back,
            tags,
            ease_factor: typeof card.ease_factor === 'number' ? card.ease_factor : 2.5,
            interval: typeof card.interval === 'number' ? card.interval : 0,
            repetitions: typeof card.repetitions === 'number' ? card.repetitions : 0,
            next_review: isoToSqlite(card.next_review as string) ?? toSqliteUTC(new Date()),
            last_reviewed: isoToSqlite(card.last_reviewed as string),
          });
          summary.cardsInserted++;
        }
      }

      // ===== 导入 review_logs（恢复历史，通过 deck_name + card_front 反查）=====
      for (let k = 0; k < reviewLogs.length; k++) {
        const log = reviewLogs[k];
        if (!isObject(log)) continue; // 宽松处理：跳过无效记录
        if (
          typeof log.deck_name !== 'string' ||
          typeof log.card_front !== 'string' ||
          typeof log.result !== 'string' ||
          typeof log.reviewed_at !== 'string'
        ) {
          continue; // 宽松处理：跳过字段不全的记录
        }

        // 反查 deckId + cardId
        const targetDeck = importExportRepo.getDeckByName(log.deck_name);
        if (!targetDeck) continue;
        const targetCard = importExportRepo.getCardByDeckAndFront(targetDeck.id, log.card_front);
        if (!targetCard) continue;

        importExportRepo.insertReviewLogWithDate({
          cardId: targetCard.id,
          deckId: targetDeck.id,
          result: log.result,
          reviewedAt: isoToSqlite(log.reviewed_at) ?? toSqliteUTC(new Date()),
        });
      }
    });

    return summary;
  },
};
