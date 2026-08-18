/**
 * 记忆学习平台 — 后端共享类型定义
 * 字段名直接使用 snake_case，不做 camelCase 映射（FRONTEND §8.4）
 * 对应 DB §3 表结构
 */

// ===== 文件夹 =====
export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

// ===== 笔记 =====
export interface Note {
  id: number;
  folder_id: number | null;
  title: string;
  content: string;
  is_today: number; // 0 | 1
  tags: string; // JSON 数组字符串 '["tag1","tag2"]'
  created_at: string;
  updated_at: string;
}

// ===== 笔记附件 =====
export interface NoteAttachment {
  id: number;
  note_id: number;
  filename: string;
  filepath: string;
  file_type: string; // pdf | image | doc | other
  file_size: number;
  created_at: string;
}

// ===== 牌组 =====
export interface Deck {
  id: number;
  name: string;
  description: string;
  folder_id: number | null;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

// ===== 卡片（核心表）=====
export interface Card {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  source_note: number | null;
  tags: string;
  ease_factor: number;
  interval: number; // 单位：分钟
  repetitions: number;
  next_review: string;
  last_reviewed: string | null;
  created_at: string;
  updated_at: string;
}

// ===== 复习记录 =====
export interface ReviewLog {
  id: number;
  card_id: number;
  deck_id: number;
  result: string; // forgot | hard | good | easy
  reviewed_at: string;
}

// ===== 模板 =====
export interface Template {
  id: number;
  name: string;
  description: string;
  front: string;
  back: string;
  is_default: number; // 0 | 1
  created_at: string;
}

// ===== 考试目标 =====
export interface Exam {
  id: number;
  name: string;
  deck_id: number | null;
  target_date: string | null;
  target_count: number;
  status: string; // active | completed
  created_at: string;
}

// ===== DTO 类型（用于 insert/update 参数）=====

export interface FolderInsertDTO {
  name: string;
  parentId?: number | null;
}

export interface FolderUpdateDTO {
  name: string;
}

export interface NoteInsertDTO {
  folderId?: number | null;
  title?: string;
  content?: string;
  isToday?: number;
  tags?: string;
}

export interface NoteUpdateDTO {
  folderId?: number | null;
  title?: string;
  content?: string;
  isToday?: number;
  tags?: string;
}

export interface AttachmentInsertDTO {
  noteId: number;
  filename: string;
  filepath: string;
  fileType?: string;
  fileSize?: number;
}

export interface DeckInsertDTO {
  name: string;
  description?: string;
  folderId?: number | null;
  icon?: string;
  color?: string;
}

export interface DeckUpdateDTO {
  name?: string;
  description?: string;
  folderId?: number | null;
  icon?: string;
  color?: string;
}

export interface CardInsertDTO {
  deckId: number;
  front: string;
  back: string;
  sourceNote?: number | null;
  tags?: string;
}

export interface CardUpdateDTO {
  front?: string;
  back?: string;
  tags?: string;
}

export interface CardReviewStateDTO {
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
  last_reviewed: string;
}

export interface ReviewLogInsertDTO {
  cardId: number;
  deckId: number;
  result: string;
}

export interface TemplateInsertDTO {
  name: string;
  description?: string;
  front?: string;
  back?: string;
}

export interface ExamInsertDTO {
  name: string;
  deckId?: number | null;
  targetDate?: string | null;
  targetCount?: number;
}

export interface ExamUpdateDTO {
  name?: string;
  deckId?: number | null;
  targetDate?: string | null;
  targetCount?: number;
  status?: string;
}

// ===== 统计相关返回类型 =====

export interface CalendarDay {
  date: string;
  count: number;
}

export interface StatsByResult {
  forgot: number;
  hard: number;
  good: number;
  easy: number;
}

// ===== Stage 3 新增：分页 + 聚合类型 =====

/** 分页结果包装 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** 牌组列表项（含卡片/到期计数） */
export interface DeckListItem extends Deck {
  card_count: number;
  due_count: number;
}

/** 牌组详情（含卡片/到期计数） */
export interface DeckDetail extends Deck {
  card_count: number;
  due_count: number;
}

/** 查询参数类型 */
export interface DeckListQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CardListQuery {
  page?: number;
  limit?: number;
  sort?: 'created' | 'next_review';
}

/** 批量创建卡片请求体 */
export interface CardBatchCreateDTO {
  deckId: number;
  cards: CardInsertDTO[];
}

// ===== Stage 3b 新增：SM-2 + Review 类型 =====

/** SM-2 评分结果（ARCH §8.1） */
export type ReviewResult = 'forgot' | 'hard' | 'good' | 'easy';

/** SM-2 输入：卡片当前调度状态（ARCH §8.1） */
export interface CardState {
  ease_factor: number;
  interval: number; // 分钟
  repetitions: number;
}

/** SM-2 输出：卡片新调度状态（ARCH §8.1） */
export interface CardNextState extends CardState {
  next_review: string; // ISO datetime
  last_reviewed: string; // ISO datetime
}

/** 复习进度统计（GET /api/decks/:deckId/review-progress 返回） */
export interface ReviewProgress {
  deckId: number;
  totalCards: number;
  dueCards: number;
  reviewedToday: number;
  accuracy: number; // 0-100
}
