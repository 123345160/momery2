/**
 * Stage 1 Mock 测试 — 验证 DB §10 的 9 条验收标准
 *
 * 使用内存 SQLite 数据库，不写磁盘文件
 * 运行方式：npx tsx src/db/stage1-mock-test.ts
 *
 * 日志分级：
 *   [INFO]  连接初始化、迁移进度、汇总
 *   [PASS]  断言通过
 *   [FAIL]  断言失败
 *   [DATA]  数据流追踪（插入/查询的实际值）
 *   [DIAG]  连接诊断信息
 */

import Database from 'better-sqlite3';
import { setDb, closeDb } from './connection.js';
import { migrate } from './migrate.js';
import { deckRepo } from '../repositories/deckRepo.js';
import { cardRepo } from '../repositories/cardRepo.js';
import { reviewLogRepo } from '../repositories/reviewLogRepo.js';
import { templateRepo } from '../repositories/templateRepo.js';
import { folderRepo } from '../repositories/folderRepo.js';
import { noteRepo } from '../repositories/noteRepo.js';
import { noteAttachmentRepo } from '../repositories/noteAttachmentRepo.js';
import { examRepo } from '../repositories/examRepo.js';

// ===== 颜色 + 格式 =====
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const GRAY = '\x1b[90m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;

// ===== 日志工具 =====
function logInfo(msg: string): void {
  console.log(`${CYAN}[INFO]${RESET}  ${msg}`);
}

function logData(msg: string): void {
  console.log(`${GRAY}[DATA]${RESET}  ${'  '.repeat(1)}${msg}${RESET}`);
}

function logDiag(msg: string): void {
  console.log(`${YELLOW}[DIAG]${RESET}  ${msg}`);
}

function assert(condition: boolean, message: string, detail?: string): void {
  if (condition) {
    console.log(`  ${GREEN}[PASS]${RESET} ${message}`);
    passed++;
  } else {
    console.log(`  ${RED}[FAIL]${RESET} ${message}`);
    if (detail) console.log(`         ${RED}→ ${detail}${RESET}`);
    failed++;
  }
}

function section(title: string): void {
  console.log(`\n${BOLD}${CYAN}━━━━ ${title} ━━━━${RESET}`);
}

function ts(): string {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

// ===== 连接初始化日志 =====
logInfo(`${ts()} 初始化内存数据库 (:memory:)`);
const memDb = new Database(':memory:');
logInfo(`${ts()} SQLite 版本: ${(memDb.prepare('SELECT sqlite_version() as v').get() as { v: string }).v}`);

setDb(memDb);
logInfo(`${ts()} setDb() 注入完成，单例已替换`);

// 打印连接诊断
logDiag('PRAGMA 初始化状态：');
const pragmas = ['journal_mode', 'foreign_keys', 'busy_timeout', 'synchronous'];
for (const p of pragmas) {
  const val = memDb.pragma(p, { simple: true });
  logDiag(`  ${p} = ${val}`);
}

logInfo(`${ts()} 开始执行 migrate()`);
const tMigrateStart = Date.now();
migrate();
const tMigrateEnd = Date.now();
logInfo(`${ts()} migrate() 完成，耗时 ${tMigrateEnd - tMigrateStart}ms`);

// 迁移后诊断
logDiag('迁移后表数量：');
const tableCount = memDb
  .prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table'")
  .get() as { cnt: number };
logDiag(`  sqlite_master 表记录 = ${tableCount.cnt}`);

const indexCount = memDb
  .prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='index'")
  .get() as { cnt: number };
logDiag(`  sqlite_master 索引记录 = ${indexCount.cnt}`);

// ===== §10.1  8 张表全部创建成功 =====
section('§10.1  8 张表全部创建成功');
{
  const EXPECTED_TABLES = [
    'folders', 'notes', 'note_attachments', 'decks',
    'cards', 'review_logs', 'templates', 'exams',
  ];

  for (const table of EXPECTED_TABLES) {
    const row = memDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
    assert(row !== undefined, `表 ${table} 存在`);
  }

  // 验证 cards 表列定义
  logData('PRAGMA table_info(cards) 查询列定义');
  const cardsColumns = memDb.prepare('PRAGMA table_info(cards)').all() as { name: string; type: string; notnull: number; dflt_value: string | null }[];
  const cardColNames = cardsColumns.map((c) => c.name);
  logData(`cards 列 (${cardsColumns.length}): ${cardColNames.join(', ')}`);
  logData(`cards 类型映射: ${cardsColumns.map((c) => `${c.name}(${c.type})`).join(', ')}`);

  const expectedCardCols = ['id', 'deck_id', 'front', 'back', 'source_note', 'tags', 'ease_factor', 'interval', 'repetitions', 'next_review', 'last_reviewed', 'created_at', 'updated_at'];
  const missing = expectedCardCols.filter((col) => !cardColNames.includes(col));
  assert(
    missing.length === 0,
    'cards 表列定义完整',
    missing.length > 0 ? `缺失列: ${missing.join(', ')}` : undefined,
  );
}

// ===== §10.2  外键约束启用 =====
section('§10.2  外键约束启用');
{
  const fkPragma = memDb.pragma('foreign_keys', { simple: true });
  logDiag(`PRAGMA foreign_keys → ${fkPragma}`);
  assert(fkPragma === 1, `PRAGMA foreign_keys = ON (实际值: ${fkPragma})`);

  // 插入无效外键应失败
  logData('尝试插入无效外键: deck_id=99999 (不存在)');
  let fkViolation = false;
  let fkError = '';
  try {
    memDb.prepare("INSERT INTO cards (deck_id, front, back) VALUES (99999, 'test', 'test')").run();
  } catch (e) {
    fkViolation = true;
    fkError = e instanceof Error ? e.message : String(e);
  }
  logData(`SQLite 拒绝: ${fkError}`);
  assert(fkViolation, '外键约束生效：插入无效 deck_id 被拒绝');
}

// ===== §10.3  13 条索引全部创建 =====
section('§10.3  13 条索引全部创建');
{
  const EXPECTED_INDEXES = [
    'idx_folders_parent',
    'idx_notes_folder', 'idx_notes_today', 'idx_notes_updated',
    'idx_attach_note',
    'idx_decks_folder',
    'idx_cards_deck', 'idx_cards_next_review', 'idx_cards_source',
    'idx_review_card', 'idx_review_deck_date', 'idx_review_date',
    'idx_exams_status',
  ];

  logData(`检查 ${EXPECTED_INDEXES.length} 条索引`);
  for (const idx of EXPECTED_INDEXES) {
    const row = memDb.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name=?").get(idx);
    assert(row !== undefined, `索引 ${idx} 存在`);
  }
}

// ===== §10.4  迁移幂等 =====
section('§10.4  迁移幂等（重复执行不报错）');
{
  let idempotent = true;
  let errorDetail = '';
  try {
    logData('第 2 次执行 migrate()');
    migrate();
    logData('第 3 次执行 migrate()');
    migrate();
  } catch (e) {
    idempotent = false;
    errorDetail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  assert(idempotent, '重复执行 migrate() 三次不报错', errorDetail || undefined);

  // 验证幂等后模板没有重复插入
  const tplCount = templateRepo.getAll();
  logData(`幂等后模板数: ${tplCount.length} (应为 3)`);
  assert(tplCount.length === 3, '幂等后模板未重复插入');
}

// ===== §10.5  预置 3 条模板 =====
section('§10.5  预置 3 条模板数据');
{
  const templates = templateRepo.getAll();
  logData(`templateRepo.getAll() → ${templates.length} 条`);
  for (const t of templates) {
    logData(`  [id=${t.id}] ${t.name} | is_default=${t.is_default} | front="${t.front.slice(0, 20)}..."`);
  }

  assert(templates.length === 3, `模板数量 = 3 (实际: ${templates.length})`);
  assert(
    templates.every((t) => t.is_default === 1),
    '全部为 is_default=1（预置模板）',
  );
  const names = templates.map((t) => t.name).join(', ');
  assert(
    names === '问答型, 填空型, 列表型',
    `模板名称: ${names}`,
  );
}

// ===== §10.6  事务验证：复习提交原子性 =====
section('§10.6  事务验证：复习提交同时更新 cards + 写入 review_logs');
{
  // 准备数据
  const deckId = deckRepo.insert({ name: '测试牌组' });
  logData(`deckRepo.insert → deckId=${deckId}`);
  const cardId = cardRepo.insert({ deckId, front: '1+1=?', back: '2' });
  logData(`cardRepo.insert → cardId=${cardId} (ease=2.5, interval=0, rep=0)`);

  // 模拟正常事务：更新卡片状态 + 写入复习记录
  logData('开启正常事务: updateReviewState + reviewLogRepo.insert');
  const db = memDb;
  const tx = db.transaction(() => {
    cardRepo.updateReviewState(cardId, {
      ease_factor: 2.6,
      interval: 1440,
      repetitions: 1,
      next_review: '2026-08-19 12:00:00',
      last_reviewed: '2026-08-18 12:00:00',
    });
    reviewLogRepo.insert({ cardId, deckId, result: 'good' });
  });
  const tTxStart = Date.now();
  tx();
  logData(`正常事务提交完成，耗时 ${Date.now() - tTxStart}ms`);

  const card = cardRepo.getById(cardId);
  logData(`cardRepo.getById(${cardId}) → rep=${card?.repetitions}, interval=${card?.interval}, ef=${card?.ease_factor}`);
  assert(card !== null && card.repetitions === 1, '卡片 repetitions 已更新为 1');
  assert(card !== null && card.interval === 1440, '卡片 interval 已更新为 1440 分钟');

  const logs = reviewLogRepo.getByCard(cardId);
  logData(`reviewLogRepo.getByCard(${cardId}) → ${logs.length} 条`);
  assert(logs.length === 1, `复习记录已写入 (数量: ${logs.length})`);
  assert(logs[0].result === 'good', '复习记录 result = good');

  // 模拟异常回滚
  const cardId2 = cardRepo.insert({ deckId, front: '2+2=?', back: '4' });
  logData(`cardRepo.insert → cardId2=${cardId2} (初始 ease=2.5)`);
  const beforeCard2 = cardRepo.getById(cardId2);
  logData(`回滚前: ease_factor=${beforeCard2?.ease_factor}, repetitions=${beforeCard2?.repetitions}`);

  let rollbackOccurred = false;
  logData('开启异常事务: updateReviewState + throw SIMULATED_FAILURE');
  const txFail = db.transaction(() => {
    cardRepo.updateReviewState(cardId2, {
      ease_factor: 1.3,
      interval: 10,
      repetitions: 0,
      next_review: '2026-08-18 18:00:00',
      last_reviewed: '2026-08-18 12:00:00',
    });
    throw new Error('SIMULATED_FAILURE');
  });

  try {
    txFail();
  } catch (e) {
    if (e instanceof Error && e.message === 'SIMULATED_FAILURE') {
      rollbackOccurred = true;
      logData('捕获 SIMULATED_FAILURE，事务应已回滚');
    }
  }

  assert(rollbackOccurred, '事务抛异常被捕获');

  const afterCard2 = cardRepo.getById(cardId2);
  logData(`回滚后: ease_factor=${afterCard2?.ease_factor}, repetitions=${afterCard2?.repetitions}`);
  assert(
    afterCard2 !== null && afterCard2.ease_factor === beforeCard2!.ease_factor,
    '回滚生效：卡片 ease_factor 未变（仍为初始值 2.5）',
    `期望 2.5, 实际 ${afterCard2?.ease_factor}`,
  );

  // 验证复习记录没有写入
  const logs2 = reviewLogRepo.getByCard(cardId2);
  logData(`reviewLogRepo.getByCard(${cardId2}) → ${logs2.length} 条 (应为 0)`);
  assert(logs2.length === 0, '回滚生效：无错误复习记录写入');
}

// ===== §10.7  PRAGMA integrity_check =====
section('§10.7  PRAGMA integrity_check 报告无损坏');
{
  logData('PRAGMA integrity_check');
  const result = memDb.pragma('integrity_check', { simple: true });
  logDiag(`integrity_check → ${result}`);
  assert(result === 'ok', `integrity_check = ok (实际: ${result})`);

  // 额外：foreign_key_check
  logData('PRAGMA foreign_key_check');
  const fkCheck = memDb.pragma('foreign_key_check', { simple: true });
  logDiag(`foreign_key_check → ${JSON.stringify(fkCheck)} (空=无违规)`);
  assert(
    (Array.isArray(fkCheck) && fkCheck.length === 0) || fkCheck === undefined || fkCheck === '',
    'foreign_key_check 无违规',
  );
}

// ===== §10.8  Repository 层纯 SQL 操作 =====
section('§10.8  Repository 层纯 SQL 操作（不含业务判断）');
{
  logData('folderRepo: insert → getById');
  const folderId = folderRepo.insert({ name: '测试文件夹' });
  const folder = folderRepo.getById(folderId);
  logData(`  folderId=${folderId}, name="${folder?.name}"`);
  assert(folder !== null && folder.name === '测试文件夹', 'folderRepo CRUD 正常');

  logData('noteRepo: insert → getById');
  const noteId = noteRepo.insert({ folderId, title: '测试笔记' });
  const note = noteRepo.getById(noteId);
  logData(`  noteId=${noteId}, title="${note?.title}", content="${note?.content}", tags="${note?.tags}"`);
  assert(note !== null && note.title === '测试笔记', 'noteRepo CRUD 正常');

  logData('noteAttachmentRepo: insert → getById');
  const attachId = noteAttachmentRepo.insert({ noteId, filename: 'test.pdf', filepath: 'uploads/test.pdf' });
  const attach = noteAttachmentRepo.getById(attachId);
  logData(`  attachId=${attachId}, filename="${attach?.filename}", file_type="${attach?.file_type}"`);
  assert(attach !== null && attach.filename === 'test.pdf', 'noteAttachmentRepo CRUD 正常');

  logData('deckRepo: insert → getById');
  const deckId = deckRepo.insert({ name: '测试牌组2' });
  const deck = deckRepo.getById(deckId);
  logData(`  deckId=${deckId}, name="${deck?.name}", icon="${deck?.icon}", color="${deck?.color}"`);
  assert(deck !== null && deck.name === '测试牌组2', 'deckRepo CRUD 正常');

  logData('examRepo: insert → getAll');
  examRepo.insert({ name: '测试考试', deckId });
  const exams = examRepo.getAll();
  logData(`  exams.length=${exams.length}, [0].name="${exams[0]?.name}", status="${exams[0]?.status}"`);
  assert(exams.length >= 1, 'examRepo CRUD 正常');

  // templateRepo 禁止删除预置模板
  logData('templateRepo: 尝试删除 is_default=1 的模板 (id=1)');
  let deleteBlocked = false;
  let deleteError = '';
  try {
    templateRepo.remove(1);
  } catch (e) {
    deleteBlocked = true;
    deleteError = e instanceof Error ? e.message : String(e);
  }
  logData(`  拒绝: ${deleteError}`);
  assert(deleteBlocked, 'templateRepo 禁止删除预置模板（纯 SQL 约束）');
}

// ===== §10.9  到期卡片查询走 idx_cards_next_review =====
section('§10.9  到期卡片查询走 idx_cards_next_review 复合索引');
{
  const deckId = deckRepo.insert({ name: '索引测试牌组' });
  logData(`deckRepo.insert → deckId=${deckId}`);

  const c1 = cardRepo.insert({ deckId, front: '到期卡1', back: 'A' });
  const c2 = cardRepo.insert({ deckId, front: '到期卡2', back: 'B' });
  logData(`cardRepo.insert → cardId=${c1}, ${c2} (next_review 默认 datetime('now'), 即已到期)`);

  const dueCards = cardRepo.getDueCards(deckId);
  logData(`cardRepo.getDueCards(${deckId}) → ${dueCards.length} 张`);
  for (const c of dueCards) {
    logData(`  [id=${c.id}] front="${c.front}" next_review="${c.next_review}"`);
  }
  assert(dueCards.length === 2, `到期卡片数 = 2 (实际: ${dueCards.length})`);

  // EXPLAIN QUERY PLAN
  logData('EXPLAIN QUERY PLAN:');
  const plan = memDb
    .prepare('EXPLAIN QUERY PLAN SELECT * FROM cards WHERE deck_id = ? AND next_review <= datetime(\'now\')')
    .all(deckId) as { detail: string }[];

  for (const p of plan) {
    logData(`  ${p.detail}`);
  }

  const usesIndex = plan.some((p) => p.detail.includes('idx_cards_next_review'));
  assert(usesIndex, `EXPLAIN QUERY PLAN 走 idx_cards_next_review`, `计划: ${plan.map((p) => p.detail).join(' | ')}`);

  // 额外：验证 idx_cards_deck 也被使用
  logData('EXPLAIN QUERY PLAN (仅按 deck_id 查):');
  const plan2 = memDb
    .prepare('EXPLAIN QUERY PLAN SELECT * FROM cards WHERE deck_id = ?')
    .all(deckId) as { detail: string }[];

  for (const p of plan2) {
    logData(`  ${p.detail}`);
  }
  // idx_cards_deck 和 idx_cards_next_review 首列均为 deck_id，优化器可能选任一
  const usesDeckIdx = plan2.some((p) => p.detail.includes('idx_cards_deck') || p.detail.includes('idx_cards_next_review'));
  assert(usesDeckIdx, `EXPLAIN QUERY PLAN 走 deck_id 索引 (idx_cards_deck 或 idx_cards_next_review)`);
}

// ===== 汇总 =====
console.log(`\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`  ${GREEN}通过: ${passed}${RESET}  ${RED}失败: ${failed}${RESET}  总计: ${passed + failed}`);
console.log(`${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);

// ===== 关闭连接诊断 =====
logDiag('关闭数据库连接');
const tCloseStart = Date.now();
closeDb();
logDiag(`closeDb() 完成，耗时 ${Date.now() - tCloseStart}ms`);
logDiag(`单例状态: 已置空`);

console.log(`\n${GRAY}[INFO]  ${ts()} 测试结束\n${RESET}`);
process.exit(failed > 0 ? 1 : 0);
