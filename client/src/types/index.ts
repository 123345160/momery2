/**
 * 记忆学习平台 — 前端共享类型定义（FRONTEND §8.4）
 *
 * 字段名直接沿用后端 snake_case，不做 camelCase 映射（FRONTEND §8.4 字段命名约定）
 * 响应拦截器只解包 data，不重命名字段
 *
 * 与后端 server/src/types/index.ts 保持字段一致；M1 相关类型预留占位
 */

// ===== 数据模型 =====

export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

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

export interface NoteAttachment {
  id: number;
  note_id: number;
  filename: string;
  filepath: string;
  file_type: string; // pdf | image | doc | other
  file_size: number;
  created_at: string;
}

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

export interface ReviewLog {
  id: number;
  card_id: number;
  deck_id: number;
  result: ReviewResult;
  reviewed_at: string;
}

export interface Template {
  id: number;
  name: string;
  description: string;
  front: string;
  back: string;
  is_default: number; // 0 | 1
  created_at: string;
}

export interface Exam {
  id: number;
  name: string;
  deck_id: number | null;
  target_date: string | null;
  target_count: number;
  status: string; // active | completed
  created_at: string;
}

// ===== 树形结构 =====

export interface FolderNode {
  folder: Folder;
  children: FolderNode[];
  note_count: number;
}

// ===== DTO 类型 =====

export interface CreateDeckDto {
  name: string;
  description?: string;
  folderId?: number | null;
  icon?: string;
  color?: string;
}

export interface UpdateDeckDto {
  name?: string;
  description?: string;
  folderId?: number | null;
  icon?: string;
  color?: string;
}

export interface CreateCardDto {
  deckId: number;
  front: string;
  back: string;
  sourceNote?: number | null;
  tags?: string;
}

export interface UpdateCardDto {
  front?: string;
  back?: string;
  tags?: string;
}

export type ReviewResult = 'forgot' | 'hard' | 'good' | 'easy';

// ===== API 响应类型 =====

/**
 * 统一响应包装（FRONTEND §6.2.1）
 * 响应拦截器解包 data 字段后，调用方拿到的是 T 而非 ApiResponse<T>
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T | null;
}

// ===== 查询参数类型 =====

export interface DeckQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CardQueryParams {
  page?: number;
  limit?: number;
  sort?: 'created' | 'next_review';
}

// ===== 扩展类型（带聚合字段）=====

/** 牌组列表项（含卡片/到期计数，后端 DeckListItem） */
export interface DeckListItem extends Deck {
  card_count: number;
  due_count: number;
}

/** 牌组详情（含卡片/到期计数，后端 DeckDetail） */
export interface DeckDetail extends Deck {
  card_count: number;
  due_count: number;
}

/** 复习进度统计 */
export interface ReviewProgress {
  deckId: number;
  totalCards: number;
  dueCards: number;
  reviewedToday: number;
  accuracy: number; // 0-100
}

// ===== 统计类型 =====

export interface CalendarDay {
  date: string;
  count: number;
}

/** 全局统计概览（GET /api/stats/overview 返回） */
export interface StatsOverview {
  totalCards: number;
  masteredCards: number;
  dueToday: number;
  streakDays: number;
  accuracy: number; // 0-100
}

// ===== 导入导出类型 =====

export interface ImportSummary {
  decksCreated: number;
  decksMerged: number;
  cardsInserted: number;
  cardsSkipped: number;
  notesInserted: number;
  templatesInserted: number;
}

/** 导入 JSON 请求体（与后端 ImportPayload 对齐） */
export interface ImportJsonDto {
  version?: number;
  decks?: unknown;
  review_logs?: unknown;
  notes?: unknown;
  templates?: unknown;
}

// ===== UI 相关类型 =====

export interface TabItem {
  key: string;
  label: string;
  to?: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface MenuItem {
  type: 'deck' | 'note' | 'folder';
  label: string;
}

export interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

// ===== M1 预留类型（Stage 4 不使用，占位以保结构完整）=====

export interface TimelineItem {
  id: number;
  type: 'note' | 'card' | 'review';
  title: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}
