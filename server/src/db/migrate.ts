/**
 * 记忆学习平台 — 数据库迁移（DB §5）
 *
 * 幂等建表 + 索引 + 预置数据
 * 执行顺序（DB §5.2）：folders → notes → note_attachments → decks → cards → review_logs → templates → exams
 */

import { getDb } from './connection.js';

/** 所有 DDL 语句（按外键依赖序） */
const TABLE_DDLS: string[] = [
  // 1. folders（无外键依赖）
  `CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES folders(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  // 2. notes（依赖 folders）
  `CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER REFERENCES folders(id),
    title TEXT NOT NULL DEFAULT '未命名笔记',
    content TEXT DEFAULT '',
    is_today INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  // 3. note_attachments（依赖 notes，级联删除）
  `CREATE TABLE IF NOT EXISTS note_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    file_type TEXT DEFAULT 'other',
    file_size INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  // 4. decks（依赖 folders）
  `CREATE TABLE IF NOT EXISTS decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    folder_id INTEGER REFERENCES folders(id),
    icon TEXT DEFAULT '📚',
    color TEXT DEFAULT '#f0f0f0',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  // 5. cards（依赖 decks + notes，核心表）
  `CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    source_note INTEGER REFERENCES notes(id) ON DELETE SET NULL,
    tags TEXT DEFAULT '[]',
    ease_factor REAL DEFAULT 2.5,
    interval INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0,
    next_review TEXT DEFAULT (datetime('now')),
    last_reviewed TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  // 6. review_logs（依赖 cards + decks，级联删除）
  `CREATE TABLE IF NOT EXISTS review_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    result TEXT NOT NULL,
    reviewed_at TEXT DEFAULT (datetime('now'))
  )`,

  // 7. templates（无外键依赖）
  `CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    front TEXT DEFAULT '',
    back TEXT DEFAULT '',
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  // 8. exams（依赖 decks，删除牌组时 deck_id 置 NULL）
  `CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    deck_id INTEGER REFERENCES decks(id) ON DELETE SET NULL,
    target_date TEXT,
    target_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  )`,
];

/** 13 条索引（DB §4.1） */
const INDEX_DDLS: string[] = [
  // folders
  `CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)`,

  // notes
  `CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_today ON notes(is_today) WHERE is_today = 1`,
  `CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at)`,

  // note_attachments
  `CREATE INDEX IF NOT EXISTS idx_attach_note ON note_attachments(note_id)`,

  // decks
  `CREATE INDEX IF NOT EXISTS idx_decks_folder ON decks(folder_id)`,

  // cards
  `CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(deck_id, next_review)`,
  `CREATE INDEX IF NOT EXISTS idx_cards_source ON cards(source_note)`,

  // review_logs
  `CREATE INDEX IF NOT EXISTS idx_review_card ON review_logs(card_id)`,
  `CREATE INDEX IF NOT EXISTS idx_review_deck_date ON review_logs(deck_id, reviewed_at)`,
  `CREATE INDEX IF NOT EXISTS idx_review_date ON review_logs(reviewed_at)`,

  // exams
  `CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status)`,
];

/** 预置模板数据（DB §5.3） */
const PRESET_TEMPLATES: { name: string; description: string; front: string; back: string }[] = [
  {
    name: '问答型',
    description: '标准问答卡片',
    front: '## 问题\n\n',
    back: '## 答案\n\n',
  },
  {
    name: '填空型',
    description: '填空题卡片',
    front: '___ 是 ___ 的关键步骤。',
    back: '首先，___；其次，___。',
  },
  {
    name: '列表型',
    description: '列举知识点卡片',
    front: '请列举以下知识点：\n\n1.\n2.\n3.',
    back: '参考答案：\n\n1.\n2.\n3.',
  },
];

/**
 * 执行数据库迁移（幂等）
 * - 建 8 张表（按外键依赖序）
 * - 建 13 条索引
 * - 插入 3 条预置模板（幂等：仅在 templates 表为空时插入）
 */
export function migrate(): void {
  const db = getDb();

  // 1. 建表（按依赖序）
  for (const ddl of TABLE_DDLS) {
    db.exec(ddl);
  }

  // 2. 建索引
  for (const ddl of INDEX_DDLS) {
    db.exec(ddl);
  }

  // 3. 预置模板（幂等：仅在 templates 表为空时插入）
  const count = db.prepare('SELECT COUNT(*) as cnt FROM templates').get() as { cnt: number };
  if (count.cnt === 0) {
    const stmt = db.prepare(
      'INSERT INTO templates (name, description, front, back, is_default) VALUES (?, ?, ?, ?, 1)'
    );
    for (const t of PRESET_TEMPLATES) {
      stmt.run(t.name, t.description, t.front, t.back);
    }
  }
}
