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
  sort?: 'created' | 'next_review' | 'front';
  search?: string;
  status?: 'all' | 'due' | 'mastered';
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

// ===== Stage 3c 新增：导入导出 + 统计概览类型（ARCH §10 / §6.2.7 / §6.2.11）=====

/**
 * 导出 JSON 顶层结构（ARCH §10.1）
 * 顶层元数据用 camelCase，业务字段沿用 DB snake_case
 * notes/templates 在 V1.0 为空数组占位（M1 实现后填充具体类型）
 */
export interface ExportPayload {
  version: number; // 1
  exportedAt: string; // ISO datetime
  decks: ExportDeck[];
  review_logs: ExportReviewLog[];
  notes: ExportNote[];
  templates: ExportTemplate[];
}

/** 导出中的笔记（M1，folder_name 用于还原层级，is_today 为布尔 0/1） */
export interface ExportNote {
  folder_name: string | null;
  title: string;
  content: string;
  is_today: number; // 0/1
  tags: string; // JSON 字符串（与 DB 一致）
}

/** 导出中的模板（M1） */
export interface ExportTemplate {
  name: string;
  description: string | null;
  front: string;
  back: string;
  is_default: number; // 0/1
}

/** 导出中的牌组（ARCH §10.1） */
export interface ExportDeck {
  name: string;
  description: string;
  cards: ExportCard[];
}

/** 导出中的卡片（ARCH §10.1，tags 为数组，与 DB 的 JSON 字符串不同） */
export interface ExportCard {
  front: string;
  back: string;
  tags: string[]; // 导出时 JSON.parse(DB.tags) 转数组
  ease_factor: number;
  interval: number; // 分钟
  repetitions: number;
  next_review: string; // ISO datetime
  last_reviewed: string | null; // ISO datetime 或 null（新建卡片未复习）
}

/** 导出中的复习记录（ARCH §10.1，通过 deck_name + card_front 反查归属） */
export interface ExportReviewLog {
  deck_name: string;
  card_front: string;
  result: ReviewResult;
  reviewed_at: string; // ISO datetime
}

/** 导入返回摘要（ARCH §6.2.11） */
export interface ImportSummary {
  decksCreated: number;
  decksMerged: number;
  cardsInserted: number;
  cardsSkipped: number;
  notesInserted: number;
  templatesInserted: number;
}

/** 导入 JSON 请求体（POST /api/import/json） */
export interface ImportPayload {
  version?: number;
  decks?: unknown;
  review_logs?: unknown;
  notes?: unknown;
  templates?: unknown;
}

/**
 * 全局统计概览（GET /api/stats/overview 返回，DB §7.4 + CHARTER R11）
 * - masteredCards 口径：repetitions >= 3 且 interval >= 30240 分钟（21 天，R11）
 * - streakDays：review_logs 按日期分组，从今天倒推连续有记录的日期数
 * - accuracy：总正确率 (good + easy) / total × 100
 */
export interface StatsOverview {
  totalCards: number;
  masteredCards: number;
  dueToday: number;
  streakDays: number;
  accuracy: number; // 0-100
}

// ===== M1（Stage 7）新增返回类型 =====

/** 文件夹树节点（GET /api/folders/tree 返回） */
export interface FolderNode {
  id: number;
  name: string;
  parentId: number | null;
  noteCount: number;
  children: FolderNode[];
}

/** 笔记转卡片结果（GET /api/notes/:id/extract、POST /api/notes/:id/convert 返回） */
export interface ConvertNoteResult {
  cards: { front: string; back: string }[];
  cardCount: number;
}

/** 考试进度（GET /api/exams/:id/progress 返回） */
export interface ExamProgress {
  targetCount: number;
  currentCount: number;
  targetAccuracy: number;
  currentAccuracy: number;
  daysLeft: number;
}

/** 学习时间轴条目（GET /api/stats/timeline 返回） */
export interface TimelineItem {
  id: number;
  cardId: number | null;
  cardFront: string | null;
  deckName: string | null;
  result: string;
  reviewedAt: string;
}

/** 全局搜索类别（GET /api/search?category=，ARCH §6.2） */
export type SearchCategory = 'all' | 'decks' | 'notes' | 'cards';

/** 全局搜索结果（GET /api/search 返回） */
export interface SearchResult {
  keyword: string;
  decks: {
    id: number;
    name: string;
    description: string;
    cardCount: number;
  }[];
  cards: {
    id: number;
    deckId: number | null;
    deckName: string | null;
    front: string;
    back: string;
  }[];
  notes: {
    id: number;
    folderId: number | null;
    folderName: string | null;
    title: string;
    snippet: string;
  }[];
}
