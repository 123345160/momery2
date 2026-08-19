/**
 * noteService.ts — 笔记业务逻辑层
 *
 * 职责：
 * - 编排 noteRepo + folderRepo（校验文件夹存在）
 * - 笔记 CRUD
 * - 今日笔记（按创建日期）
 * - 笔记转卡片（convertNoteToCards，事务，按规范 §1.4.3.3 提取 Q/A 对写入 cards）
 */

import { noteRepo } from '../repositories/noteRepo.js';
import { folderRepo } from '../repositories/folderRepo.js';
import { deckRepo } from '../repositories/deckRepo.js';
import { getDb } from '../db/connection.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import { toSqliteUTC } from '../utils/sqliteTime.js';
import type { Note, NoteInsertDTO, NoteUpdateDTO, ConvertNoteResult } from '../types/index.js';

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 50000;

/** 校验标题 */
function validateTitle(title: string): string {
  const trimmed = title?.trim();
  if (!trimmed) {
    throw new AppError(ErrorCodes.MISSING_FIELD, '笔记标题不能为空', 400);
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new AppError(ErrorCodes.INVALID_FORMAT, `标题不能超过 ${MAX_TITLE_LENGTH} 字符`, 400);
  }
  return trimmed;
}

/** 校验正文长度 */
function validateContent(content: string): void {
  if (content && content.length > MAX_CONTENT_LENGTH) {
    throw new AppError(ErrorCodes.INVALID_FORMAT, `正文不能超过 ${MAX_CONTENT_LENGTH} 字符`, 400);
  }
}

/** 校验笔记存在 */
function validateExists(id: number): Note {
  const note = noteRepo.getById(id);
  if (!note) {
    throw new AppError(ErrorCodes.NOTE_NOT_FOUND, '笔记不存在', 404);
  }
  return note;
}

/** 校验文件夹存在（id 可空，表示根目录） */
function validateFolder(folderId: number | null): void {
  if (folderId !== null && folderId !== undefined) {
    if (!folderRepo.getById(folderId)) {
      throw new AppError(ErrorCodes.FOLDER_NOT_FOUND, '文件夹不存在', 404);
    }
  }
}

/**
 * 从笔记正文提取 Q/A 对（ConvertNoteResult 计数依据）
 *
 * 解析策略（规范 §1.4.3.3）：
 * 1. 显式分隔符：Q:/A: 或 问：/答： 或 question:/answer: 配对
 * 2. 兜底：非空段落作为正面，背面留空
 *
 * 返回的 cards 为 {front, back}[]（不含 deckId，由 convertToCards 注入 source_note）
 */
function extractCardsFromContent(content: string): { front: string; back: string }[] {
  if (!content?.trim()) return [];

  const qaPairs = extractByPrefix(content);
  if (qaPairs.length > 0) return qaPairs;

  const paras = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (paras.length === 0) return [];
  return paras.map((p) => ({ front: p, back: '' }));
}

/** 按前缀提取 Q/A 对 */
function extractByPrefix(content: string): { front: string; back: string }[] {
  const lines = content.split(/\r?\n/);
  const pairs: { front: string; back: string }[] = [];
  let curQ: string[] = [];
  let curA: string[] = [];
  let phase: 'none' | 'q' | 'a' = 'none';

  const flush = () => {
    const q = curQ.join('\n').trim();
    const a = curA.join('\n').trim();
    if (q && a) pairs.push({ front: q, back: a });
    curQ = [];
    curA = [];
  };

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    const m = line.match(/^(q|a|问|答|question|answer)\s*[:：]/i);
    if (m) {
      const kind = m[1].toLowerCase();
      const rest = line.slice(m[0].length).trim();
      if (kind === 'q' || kind === '问' || kind === 'question') {
        flush();
        phase = 'q';
        if (rest) curQ.push(rest);
      } else {
        phase = 'a';
        if (rest) curA.push(rest);
      }
    } else if (line.length > 0) {
      if (phase === 'q') curQ.push(line);
      else if (phase === 'a') curA.push(line);
    }
  }
  flush();
  return pairs;
}

export const noteService = {
  /** 创建笔记 */
  create(dto: NoteInsertDTO): number {
    const title = validateTitle(dto.title ?? '');
    validateContent(dto.content ?? '');
    validateFolder(dto.folderId ?? null);
    const insertDto: NoteInsertDTO = {
      folderId: dto.folderId ?? null,
      title,
      content: dto.content ?? '',
    };
    if (dto.isToday !== undefined) insertDto.isToday = dto.isToday;
    if (dto.tags !== undefined) insertDto.tags = dto.tags;
    return noteRepo.insert(insertDto);
  },

  /** 按文件夹查笔记（folderId 可空=根目录） */
  listByFolder(folderId: number | null): Note[] {
    validateFolder(folderId);
    return noteRepo.getByFolder(folderId);
  },

  /** 今日创建的笔记 */
  listToday(): Note[] {
    const day = toSqliteUTC(new Date()).slice(0, 10) + ' 00:00:00';
    return noteRepo.getCreatedToday(day);
  },

  get(id: number): Note {
    return validateExists(id);
  },

  update(id: number, dto: NoteUpdateDTO): void {
    validateExists(id);
    if (dto.folderId !== undefined) validateFolder(dto.folderId);
    if (dto.title !== undefined) validateTitle(dto.title);
    if (dto.content !== undefined) validateContent(dto.content);
    const changes = noteRepo.update(id, dto);
    if (changes === 0) throw new AppError(ErrorCodes.NOTE_NOT_FOUND, '笔记不存在或无变更', 404);
  },

  remove(id: number): void {
    validateExists(id);
    noteRepo.remove(id);
  },

  /**
   * 提取笔记可生成的卡片（不落库，供前端预览）
   */
  extract(id: number): ConvertNoteResult {
    const note = validateExists(id);
    const qa = extractCardsFromContent(note.content);
    return { cards: qa, cardCount: qa.length };
  },

  /**
   * 笔记转卡片（事务）
   * POST /api/notes/:id/convert
   * - 必须指定目标 deckId（校验存在）
   * - 解析正文提取 Q/A 对 → 批量写入 cards（source_note=note.id）
   * - 返回提取的卡片
   */
  convertToCards(id: number, deckId: number): ConvertNoteResult {
    const note = validateExists(id);
    if (!deckRepo.getById(deckId)) {
      throw new AppError(ErrorCodes.DECK_NOT_FOUND, '目标牌组不存在', 404);
    }

    const qa = extractCardsFromContent(note.content);
    if (qa.length === 0) {
      throw new AppError(ErrorCodes.EMPTY_CONTENT, '笔记无可提取的卡片内容', 400);
    }

    const db = getDb();
    const insertCard = db.prepare(
      `INSERT INTO cards (deck_id, front, back, source_note, tags)
       VALUES (?, ?, ?, ?, ?)`,
    );

    const tx = db.transaction(() => {
      for (const pair of qa) {
        insertCard.run(deckId, pair.front.trim(), pair.back.trim(), id, '[]');
      }
    });

    tx();
    return { cards: qa, cardCount: qa.length };
  },
};
