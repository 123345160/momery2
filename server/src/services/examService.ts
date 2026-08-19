/**
 * examService.ts — 考试目标业务逻辑层
 * 含倒计时天数、进度（基于 deck_id 的已掌握率）计算
 */

import { examRepo } from '../repositories/examRepo.js';
import { deckRepo } from '../repositories/deckRepo.js';
import { cardRepo } from '../repositories/cardRepo.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type { Exam, ExamInsertDTO, ExamUpdateDTO, ExamProgress } from '../types/index.js';

const MAX_NAME_LENGTH = 200;
const MASTERED_MIN_REPS = 3;
const MASTERED_MIN_INTERVAL = 30240;

function validateName(name: string): string {
  const trimmed = name?.trim();
  if (!trimmed) throw new AppError(ErrorCodes.MISSING_FIELD, '考试名称不能为空', 400);
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new AppError(ErrorCodes.INVALID_FORMAT, `考试名称不能超过 ${MAX_NAME_LENGTH} 字符`, 400);
  }
  return trimmed;
}

function validateExists(id: number): Exam {
  const e = examRepo.getById(id);
  if (!e) throw new AppError(ErrorCodes.EXAM_NOT_FOUND, '考试目标不存在', 404);
  return e;
}

/** 计算考试进度（基于源牌组的已掌握率 + 倒计时） */
function computeProgress(e: Exam): ExamProgress {
  const deckId = e.deck_id;
  let total = 0;
  let mastered = 0;
  if (deckId) {
    const cards = cardRepo.getByDeck(deckId);
    total += cards.length;
    mastered += cards.filter(
      (c) => c.repetitions >= MASTERED_MIN_REPS && c.interval >= MASTERED_MIN_INTERVAL,
    ).length;
  }
  const accuracy = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const now = new Date();
  const examDate = new Date((e.target_date ?? '').replace(' ', 'T') + 'Z');
  const daysLeft = isNaN(examDate.getTime())
    ? 0
    : Math.ceil((examDate.getTime() - now.getTime()) / 86400000);
  return {
    targetCount: e.target_count,
    currentCount: mastered,
    targetAccuracy: 100,
    currentAccuracy: accuracy,
    daysLeft,
  };
}

export const examService = {
  list(): Exam[] {
    return examRepo.getAll();
  },

  get(id: number): Exam {
    return validateExists(id);
  },

  /** 创建考试目标 */
  create(dto: ExamInsertDTO): number {
    const name = validateName(dto.name);
    if (dto.deckId !== null && dto.deckId !== undefined) {
      if (!deckRepo.getById(dto.deckId)) {
        throw new AppError(ErrorCodes.DECK_NOT_FOUND, '关联牌组不存在', 404);
      }
    }
    return examRepo.insert({ ...dto, name });
  },

  update(id: number, dto: ExamUpdateDTO): void {
    validateExists(id);
    if (dto.name !== undefined) dto.name = validateName(dto.name);
    if (dto.deckId !== undefined && dto.deckId !== null) {
      if (!deckRepo.getById(dto.deckId)) {
        throw new AppError(ErrorCodes.DECK_NOT_FOUND, '关联牌组不存在', 404);
      }
    }
    const changes = examRepo.update(id, dto);
    if (changes === 0) throw new AppError(ErrorCodes.EXAM_NOT_FOUND, '考试目标不存在', 404);
  },

  remove(id: number): void {
    validateExists(id);
    examRepo.remove(id);
  },

  /** 进度（倒计时 + 当前掌握率） */
  progress(id: number): ExamProgress {
    const e = validateExists(id);
    return computeProgress(e);
  },
};
