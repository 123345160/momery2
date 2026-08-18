/**
 * cardService.ts — 卡片业务逻辑层（STANDARDS §11 Step 3）
 *
 * 职责：
 * - 编排 cardRepo + deckRepo（校验牌组存在）
 * - 参数校验 → 抛出 AppError
 * - 分页/排序逻辑
 *
 * 禁止：
 * - 直接操作 res/req（controller 层职责）
 * - 硬编码 SQL（repo 层职责）
 */

import { cardRepo } from '../repositories/cardRepo.js';
import { deckRepo } from '../repositories/deckRepo.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type {
  Card,
  CardInsertDTO,
  CardUpdateDTO,
  CardListQuery,
  CardBatchCreateDTO,
  PaginatedResult,
} from '../types/index.js';

// 默认分页参数
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_CARD_CONTENT = 10000;

/** 规范化分页参数 */
function normalizePagination(page?: number, limit?: number): { page: number; limit: number } {
  const p = Math.max(1, Math.floor(page ?? DEFAULT_PAGE));
  const l = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit ?? DEFAULT_LIMIT)));
  return { page: p, limit: l };
}

/** 校验卡片内容字段 */
function validateCardContent(front: string, back: string): void {
  if (!front?.trim()) {
    throw new AppError(ErrorCodes.MISSING_FIELD, '卡片正面不能为空', 400);
  }
  if (!back?.trim()) {
    throw new AppError(ErrorCodes.MISSING_FIELD, '卡片背面不能为空', 400);
  }
  if (front.length > MAX_CARD_CONTENT) {
    throw new AppError(
      ErrorCodes.INVALID_FORMAT,
      `卡片正面不能超过 ${MAX_CARD_CONTENT} 字符`,
      400,
    );
  }
  if (back.length > MAX_CARD_CONTENT) {
    throw new AppError(
      ErrorCodes.INVALID_FORMAT,
      `卡片背面不能超过 ${MAX_CARD_CONTENT} 字符`,
      400,
    );
  }
}

/** 校验牌组存在 */
function validateDeckExists(deckId: number): void {
  const deck = deckRepo.getById(deckId);
  if (!deck) {
    throw new AppError(ErrorCodes.DECK_NOT_FOUND, '牌组不存在', 404);
  }
}

export const cardService = {
  /**
   * 牌组下卡片列表（分页 + 排序）
   * GET /api/decks/:deckId/cards?page=&limit=&sort=
   */
  listByDeck(deckId: number, query: CardListQuery): PaginatedResult<Card> {
    // 校验牌组存在
    validateDeckExists(deckId);

    const { page, limit } = normalizePagination(query.page, query.limit);
    const sort = query.sort ?? 'created';

    // 获取全部卡片（V1.0 数据量小，内存排序足够）
    let cards = cardRepo.getByDeck(deckId);

    // 排序
    if (sort === 'next_review') {
      cards = [...cards].sort((a, b) =>
        a.next_review.localeCompare(b.next_review),
      );
    }
    // sort === 'created' 时 cardRepo.getByDeck 已按 created_at 排序

    const total = cards.length;

    // 分页切片
    const start = (page - 1) * limit;
    const items = cards.slice(start, start + limit);

    return { items, total, page, limit };
  },

  /**
   * 在牌组中创建单张卡片
   * POST /api/decks/:deckId/cards
   */
  create(deckId: number, dto: Omit<CardInsertDTO, 'deckId'>): number {
    // 校验牌组存在
    validateDeckExists(deckId);

    // 校验内容
    validateCardContent(dto.front, dto.back);

    const insertDto: CardInsertDTO = {
      deckId,
      front: dto.front.trim(),
      back: dto.back.trim(),
    };
    if (dto.sourceNote !== undefined) insertDto.sourceNote = dto.sourceNote;
    if (dto.tags !== undefined) insertDto.tags = dto.tags;

    return cardRepo.insert(insertDto);
  },

  /**
   * 批量创建卡片
   * POST /api/cards/batch
   */
  createBatch(dto: CardBatchCreateDTO): number[] {
    // 校验牌组存在
    validateDeckExists(dto.deckId);

    // 校验数组非空
    if (!dto.cards || dto.cards.length === 0) {
      throw new AppError(ErrorCodes.EMPTY_DECK, '卡片数组不能为空', 400);
    }

    // 逐条校验内容
    for (let i = 0; i < dto.cards.length; i++) {
      const card = dto.cards[i];
      try {
        validateCardContent(card.front, card.back);
      } catch (err) {
        if (err instanceof AppError) {
          throw new AppError(
            err.code,
            `第 ${i + 1} 张卡片：${err.message}`,
            err.httpStatus,
          );
        }
        throw err;
      }
    }

    // 规范化数据
    const normalizedCards: CardInsertDTO[] = dto.cards.map((card) => {
      const item: CardInsertDTO = {
        deckId: dto.deckId,
        front: card.front.trim(),
        back: card.back.trim(),
      };
      if (card.sourceNote !== undefined) item.sourceNote = card.sourceNote;
      if (card.tags !== undefined) item.tags = card.tags;
      return item;
    });

    return cardRepo.insertBatch(normalizedCards);
  },

  /**
   * 更新卡片内容（front/back/tags）
   * PUT /api/cards/:id
   */
  update(id: number, dto: CardUpdateDTO): void {
    const card = cardRepo.getById(id);
    if (!card) {
      throw new AppError(ErrorCodes.CARD_NOT_FOUND, '卡片不存在', 404);
    }

    // 如果更新了 front/back，校验内容
    if (dto.front !== undefined) {
      if (!dto.front.trim()) {
        throw new AppError(ErrorCodes.MISSING_FIELD, '卡片正面不能为空', 400);
      }
      if (dto.front.length > MAX_CARD_CONTENT) {
        throw new AppError(
          ErrorCodes.INVALID_FORMAT,
          `卡片正面不能超过 ${MAX_CARD_CONTENT} 字符`,
          400,
        );
      }
    }
    if (dto.back !== undefined) {
      if (!dto.back.trim()) {
        throw new AppError(ErrorCodes.MISSING_FIELD, '卡片背面不能为空', 400);
      }
      if (dto.back.length > MAX_CARD_CONTENT) {
        throw new AppError(
          ErrorCodes.INVALID_FORMAT,
          `卡片背面不能超过 ${MAX_CARD_CONTENT} 字符`,
          400,
        );
      }
    }

    const changes = cardRepo.update(id, dto);
    if (changes === 0) {
      throw new AppError(ErrorCodes.CARD_NOT_FOUND, '卡片不存在或无变更', 404);
    }
  },

  /**
   * 删除卡片（复习记录由外键 CASCADE 删除）
   * DELETE /api/cards/:id
   */
  remove(id: number): void {
    const card = cardRepo.getById(id);
    if (!card) {
      throw new AppError(ErrorCodes.CARD_NOT_FOUND, '卡片不存在', 404);
    }

    cardRepo.remove(id);
  },
};
