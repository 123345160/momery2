/**
 * reviewService.ts — 复习业务（ARCH §6.2.4 / DB §7.7）
 *
 * 职责：到期筛选 + SM-2 计算 + 记录写入（事务）+ 进度统计
 * 规则：调用 repository、不写 SQL、不碰 req/res
 */

import { cardRepo } from '../repositories/cardRepo.js';
import { reviewLogRepo } from '../repositories/reviewLogRepo.js';
import { deckRepo } from '../repositories/deckRepo.js';
import { runInTransaction } from '../db/connection.js';
import { calcNextState } from '../utils/sm2.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import { logger } from '../utils/logger.js';
import { toSqliteUTC } from '../utils/sqliteTime.js';
import type {
  Card,
  ReviewResult,
  ReviewProgress,
} from '../types/index.js';

/** 合法评分值（controller 也会校验，service 再守一道） */
const VALID_RESULTS: ReviewResult[] = ['forgot', 'hard', 'good', 'easy'];

export const reviewService = {
  /**
   * 提交复习评分（DB §7.7 — 写入事务）
   *
   * 流程：
   * 1. 校验卡片存在
   * 2. 校验评分合法
   * 3. SM-2 计算新状态（事务前，纯计算）
   * 4. 事务内：更新卡片状态 + 写入复习记录
   * 5. 返回更新后的卡片
   */
  submitReview(cardId: number, result: string): Card {
    // 1. 校验卡片存在
    const card = cardRepo.getById(cardId);
    if (!card) {
      throw new AppError(ErrorCodes.CARD_NOT_FOUND, `卡片不存在: ${cardId}`, 404);
    }

    // 2. 校验评分合法
    if (!VALID_RESULTS.includes(result as ReviewResult)) {
      throw new AppError(
        ErrorCodes.INVALID_FORMAT,
        `无效的评分值: ${result}，合法值为: ${VALID_RESULTS.join(', ')}`
      );
    }

    // 3. SM-2 计算新状态（纯函数，事务前）
    const newState = calcNextState(
      {
        ease_factor: card.ease_factor,
        interval: card.interval,
        repetitions: card.repetitions,
      },
      result as ReviewResult
    );

    logger.debug('SM-2 计算结果', {
      cardId,
      result,
      old: { ef: card.ease_factor, interval: card.interval, rep: card.repetitions },
      new: { ef: newState.ease_factor, interval: newState.interval, rep: newState.repetitions },
      nextReview: newState.next_review,
    });

    // 4. 事务内：更新卡片状态 + 写入复习记录（DB §7.7 原子性保证）
    runInTransaction(() => {
      cardRepo.updateReviewState(cardId, newState);
      reviewLogRepo.insert({
        cardId,
        deckId: card.deck_id,
        result,
      });
    });

    // 5. 返回更新后的卡片
    const updatedCard = cardRepo.getById(cardId);
    if (!updatedCard) {
      // 理论上不会发生（刚更新成功），防御性检查
      throw new AppError(ErrorCodes.INTERNAL_ERROR, '卡片更新后查询失败');
    }

    return updatedCard;
  },

  /**
   * 获取到期卡片列表（ARCH §6.2.4）
   *
   * 走 idx_cards_next_review 复合索引
   */
  getDueCards(deckId: number): Card[] {
    // 校验牌组存在
    const deck = deckRepo.getById(deckId);
    if (!deck) {
      throw new AppError(ErrorCodes.DECK_NOT_FOUND, `牌组不存在: ${deckId}`, 404);
    }

    return cardRepo.getDueCards(deckId);
  },

  /**
   * 获取牌组复习进度（ARCH §6.2.4）
   *
   * 返回：总卡片数 / 到期数 / 今日已复习数 / 正确率
   */
  getReviewProgress(deckId: number): ReviewProgress {
    // 校验牌组存在
    const deck = deckRepo.getById(deckId);
    if (!deck) {
      throw new AppError(ErrorCodes.DECK_NOT_FOUND, `牌组不存在: ${deckId}`, 404);
    }

    // 总卡片数
    const allCards = cardRepo.getByDeck(deckId);
    const totalCards = allCards.length;

    // 到期卡片数
    const dueCards = cardRepo.getDueCards(deckId).length;

    // 今日已复习数（UTC 当日起止，与数据库 reviewed_at 的 datetime('now') 时区一致）
    // 旧实现用 getFullYear/getMonth/getDate（本地时区），在 UTC+8 凌晨 0-8 点会与
    // UTC"今日"错位，导致 reviewedToday 统计偏差。改用 getUTC* + toSqliteUTC 统一。
    const now = new Date();
    const todayStart = toSqliteUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)));
    const todayEnd = toSqliteUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59)));
    const todayLogs = reviewLogRepo.getByDeckInRange(deckId, todayStart, todayEnd);
    const reviewedToday = todayLogs.length;

    // 正确率：(good + easy) / total × 100
    const stats = reviewLogRepo.countByResult(deckId);
    const totalReviews = stats.forgot + stats.hard + stats.good + stats.easy;
    const correctReviews = stats.good + stats.easy;
    const accuracy = totalReviews > 0
      ? Math.round((correctReviews / totalReviews) * 100)
      : 0;

    return {
      deckId,
      totalCards,
      dueCards,
      reviewedToday,
      accuracy,
    };
  },
};
