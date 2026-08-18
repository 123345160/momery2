/**
 * sm2.ts — SM-2 间隔重复算法（ARCH §8）
 *
 * 纯函数，无副作用，无数据库依赖，可独立单元测试（ARCH §8.4）
 *
 * 冻结常量（CHARTER §3.3 / ARCH §8.3）：
 * - EF 下限 1.3
 * - interval 上限 525600 分钟（365 天）
 * - 首次复习基线：good→1440min(1天) / easy→5760min(4天)
 */

import type { CardState, CardNextState, ReviewResult } from '../types/index.js';
import { toSqliteUTC } from './sqliteTime.js';

// ===== 冻结常量（禁止改动，CHARTER §3.3 / ARCH §8.3）=====

const MIN_EASE_FACTOR = 1.3;
const MAX_INTERVAL = 525600; // 365 天 = 525600 分钟

const INTERVAL_FORGOT = 10; // forgot → 10 分钟
const INTERVAL_HARD = 1440; // hard → 1 天
const INTERVAL_FIRST_GOOD = 1440; // 首次 good → 1 天
const INTERVAL_FIRST_EASY = 5760; // 首次 easy → 4 天

const EF_DELTA_FORGOT = -0.20;
const EF_DELTA_HARD = -0.15;
const EF_DELTA_EASY = +0.15;
const EASY_MULTIPLIER = 1.3;

// ===== 算法实现 =====

/**
 * 计算卡片下一次复习状态（ARCH §8.2）
 *
 * @param card 当前卡片调度状态 { ease_factor, interval, repetitions }
 * @param result 用户评分 'forgot' | 'hard' | 'good' | 'easy'
 * @returns 新状态 { ease_factor, interval, repetitions, next_review, last_reviewed }
 */
export function calcNextState(card: CardState, result: ReviewResult): CardNextState {
  const isFirstReview = card.repetitions === 0;
  let newInterval: number;
  let newEf: number;
  let newRep: number;

  switch (result) {
    case 'forgot':
      // 完全遗忘，从头开始
      newRep = 0;
      newInterval = INTERVAL_FORGOT;
      newEf = card.ease_factor + EF_DELTA_FORGOT;
      break;

    case 'hard':
      // 回忆困难，缩短间隔
      newRep = 0;
      newInterval = INTERVAL_HARD;
      newEf = card.ease_factor + EF_DELTA_HARD;
      break;

    case 'good':
      if (isFirstReview) {
        // 首次复习基线：good → 1 天（ARCH §8.3）
        newRep = 1;
        newInterval = INTERVAL_FIRST_GOOD;
      } else {
        // 正常递进：interval × EF
        newRep = card.repetitions + 1;
        newInterval = Math.round(card.interval * card.ease_factor);
      }
      newEf = card.ease_factor;
      break;

    case 'easy':
      if (isFirstReview) {
        // 首次复习基线：easy → 4 天（ARCH §8.3）
        newRep = 1;
        newInterval = INTERVAL_FIRST_EASY;
      } else {
        // 加速递进：interval × EF × 1.3
        newRep = card.repetitions + 1;
        newInterval = Math.round(card.interval * card.ease_factor * EASY_MULTIPLIER);
      }
      newEf = card.ease_factor + EF_DELTA_EASY;
      break;

    default:
      // 理论上不会到达（controller 已校验 result）
      newRep = card.repetitions;
      newInterval = card.interval;
      newEf = card.ease_factor;
      break;
  }

  // 边界约束（ARCH §8.3）
  newEf = Math.max(newEf, MIN_EASE_FACTOR);
  newInterval = Math.min(newInterval, MAX_INTERVAL);

  // 计算时间戳
  const now = new Date();
  const nextReviewDate = new Date(now.getTime() + newInterval * 60 * 1000);

  return {
    ease_factor: Math.round(newEf * 100) / 100, // 保留两位小数
    interval: newInterval,
    repetitions: newRep,
    next_review: toSqliteUTC(nextReviewDate),
    last_reviewed: toSqliteUTC(now),
  };
}
