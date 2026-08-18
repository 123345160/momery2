/**
 * deckService.ts — 牌组业务逻辑层（STANDARDS §11 Step 3）
 *
 * 职责：
 * - 编排 deckRepo + cardRepo（计数聚合）
 * - 参数校验 → 抛出 AppError
 * - 分页/搜索逻辑
 *
 * 禁止：
 * - 直接操作 res/req（controller 层职责）
 * - 硬编码 SQL（repo 层职责）
 */

import { deckRepo } from '../repositories/deckRepo.js';
import { cardRepo } from '../repositories/cardRepo.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type {
  DeckInsertDTO,
  DeckUpdateDTO,
  DeckListItem,
  DeckDetail,
  DeckListQuery,
  PaginatedResult,
} from '../types/index.js';

// 默认分页参数
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_NAME_LENGTH = 100;

/** 规范化分页参数 */
function normalizePagination(page?: number, limit?: number): { page: number; limit: number } {
  const p = Math.max(1, Math.floor(page ?? DEFAULT_PAGE));
  const l = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit ?? DEFAULT_LIMIT)));
  return { page: p, limit: l };
}

export const deckService = {
  /**
   * 牌组列表（含卡片/到期计数，支持搜索 + 分页）
   * GET /api/decks?search=&page=&limit=
   */
  list(query: DeckListQuery): PaginatedResult<DeckListItem> {
    const { page, limit } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim() ?? '';

    // 获取全部牌组（V1.0 数据量小，内存过滤足够）
    let decks = deckRepo.getAll();

    // 搜索过滤
    if (search) {
      const lower = search.toLowerCase();
      decks = decks.filter(
        (d) =>
          d.name.toLowerCase().includes(lower) ||
          d.description.toLowerCase().includes(lower),
      );
    }

    const total = decks.length;

    // 为每个牌组附加计数
    const items: DeckListItem[] = decks.map((deck) => {
      const cards = cardRepo.getByDeck(deck.id);
      const dueCount = cardRepo.getDueCards(deck.id).length;
      return {
        ...deck,
        card_count: cards.length,
        due_count: dueCount,
      };
    });

    // 分页切片
    const start = (page - 1) * limit;
    const pagedItems = items.slice(start, start + limit);

    return { items: pagedItems, total, page, limit };
  },

  /**
   * 牌组详情（含卡片/到期计数）
   * GET /api/decks/:id
   */
  getById(id: number): DeckDetail {
    const deck = deckRepo.getById(id);
    if (!deck) {
      throw new AppError(ErrorCodes.DECK_NOT_FOUND, '牌组不存在', 404);
    }

    const cards = cardRepo.getByDeck(id);
    const dueCount = cardRepo.getDueCards(id).length;

    return {
      ...deck,
      card_count: cards.length,
      due_count: dueCount,
    };
  },

  /**
   * 创建牌组
   * POST /api/decks
   */
  create(dto: DeckInsertDTO): number {
    // 参数校验
    if (!dto.name?.trim()) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '牌组名称不能为空', 400);
    }
    if (dto.name.length > MAX_NAME_LENGTH) {
      throw new AppError(
        ErrorCodes.INVALID_FORMAT,
        `牌组名称不能超过 ${MAX_NAME_LENGTH} 字符`,
        400,
      );
    }

    const insertDto: DeckInsertDTO = {
      name: dto.name.trim(),
    };
    if (dto.description !== undefined) insertDto.description = dto.description;
    if (dto.folderId !== undefined) insertDto.folderId = dto.folderId;
    if (dto.icon !== undefined) insertDto.icon = dto.icon;
    if (dto.color !== undefined) insertDto.color = dto.color;

    return deckRepo.insert(insertDto);
  },

  /**
   * 更新牌组
   * PUT /api/decks/:id
   */
  update(id: number, dto: DeckUpdateDTO): void {
    const deck = deckRepo.getById(id);
    if (!deck) {
      throw new AppError(ErrorCodes.DECK_NOT_FOUND, '牌组不存在', 404);
    }

    if (dto.name !== undefined && !dto.name.trim()) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '牌组名称不能为空', 400);
    }
    if (dto.name !== undefined && dto.name.length > MAX_NAME_LENGTH) {
      throw new AppError(
        ErrorCodes.INVALID_FORMAT,
        `牌组名称不能超过 ${MAX_NAME_LENGTH} 字符`,
        400,
      );
    }

    const changes = deckRepo.update(id, dto);
    if (changes === 0) {
      throw new AppError(ErrorCodes.DECK_NOT_FOUND, '牌组不存在或无变更', 404);
    }
  },

  /**
   * 删除牌组
   * 级联：卡片 + 复习记录由外键 CASCADE 删除；考试目标 deck_id 置 NULL
   * DELETE /api/decks/:id
   */
  remove(id: number): void {
    const deck = deckRepo.getById(id);
    if (!deck) {
      throw new AppError(ErrorCodes.DECK_NOT_FOUND, '牌组不存在', 404);
    }

    deckRepo.remove(id);
  },
};
