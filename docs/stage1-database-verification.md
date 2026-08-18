# Stage 1 数据库层 — 迁移脚本与测试用例归档

> **归档时间**: 2026-08-18
> **验收结果**: 47 项断言全绿，0 失败
> **对应规范**: DB §10 验收 9 条
> **实施计划**: IMPLEMENTATION_PLAN.md Stage 1

---

## 1. 文件索引

| 文件 | 位置 | 用途 |
|------|------|------|
| connection.ts | [server/src/db/connection.ts](file:///d:/vscode/momery2/daima/server/src/db/connection.ts) | SQLite 单例连接（WAL + FK + busy_timeout） |
| migrate.ts | [server/src/db/migrate.ts](file:///d:/vscode/momery2/daima/server/src/db/migrate.ts) | 幂等建表 + 索引 + 预置模板 |
| stage1-mock-test.ts | [server/src/db/stage1-mock-test.ts](file:///d:/vscode/momery2/daima/server/src/db/stage1-mock-test.ts) | 内存 DB mock 测试（47 项断言） |
| types/index.ts | [server/src/types/index.ts](file:///d:/vscode/momery2/daima/server/src/types/index.ts) | 8 实体 + 13 DTO + 统计类型 |
| 8 个 repo | [server/src/repositories/](file:///d:/vscode/momery2/daima/server/src/repositories) | folderRepo / noteRepo / noteAttachmentRepo / cardRepo / reviewLogRepo / templateRepo / examRepo / deckRepo |

---

## 2. 迁移脚本概要

### 2.1 建表顺序（按外键依赖序，DB §5.2）

```
folders → notes → note_attachments → decks → cards → review_logs → templates → exams
```

### 2.2 8 张表 DDL 摘要

| # | 表名 | 外键依赖 | 级联策略 | 核心字段 |
|---|------|---------|---------|---------|
| 1 | folders | self(parent_id) | — | id, name, parent_id, created_at, updated_at |
| 2 | notes | folders(id) | — | id, folder_id, title, content, is_today, tags, created_at, updated_at |
| 3 | note_attachments | notes(id) | ON DELETE CASCADE | id, note_id, filename, filepath, file_type, file_size, created_at |
| 4 | decks | folders(id) | — | id, name, description, folder_id, icon, color, created_at, updated_at |
| 5 | cards | decks(id), notes(id) | deck: CASCADE, note: SET NULL | id, deck_id, front, back, source_note, tags, ease_factor, interval, repetitions, next_review, last_reviewed, created_at, updated_at |
| 6 | review_logs | cards(id), decks(id) | ON DELETE CASCADE | id, card_id, deck_id, result, reviewed_at |
| 7 | templates | — | — | id, name, description, front, back, is_default, created_at |
| 8 | exams | decks(id) | ON DELETE SET NULL | id, name, deck_id, target_date, target_count, status, created_at |

### 2.3 13 条索引

| # | 索引名 | 表 | 列 | 类型 | 用途 |
|---|--------|-----|-----|------|------|
| 1 | idx_folders_parent | folders | parent_id | 普通 | 查子文件夹 |
| 2 | idx_notes_folder | notes | folder_id | 普通 | 按文件夹查笔记 |
| 3 | idx_notes_today | notes | is_today WHERE is_today=1 | 部分 | 今日临时笔记 |
| 4 | idx_notes_updated | notes | updated_at | 普通 | 按更新时间排序 |
| 5 | idx_attach_note | note_attachments | note_id | 普通 | 按笔记查附件 |
| 6 | idx_decks_folder | decks | folder_id | 普通 | 按文件夹查牌组 |
| 7 | idx_cards_deck | cards | deck_id | 普通 | 按牌组查卡片 |
| 8 | idx_cards_next_review | cards | deck_id, next_review | 复合 | **到期卡片查询（最高频）** |
| 9 | idx_cards_source | cards | source_note | 普通 | 按来源笔记查卡片 |
| 10 | idx_review_card | review_logs | card_id | 普通 | 卡片复习历史 |
| 11 | idx_review_deck_date | review_logs | deck_id, reviewed_at | 复合 | 牌组时间范围查 |
| 12 | idx_review_date | review_logs | reviewed_at | 普通 | 日历热力图 |
| 13 | idx_exams_status | exams | status | 普通 | 活跃考试目标 |

### 2.4 预置模板（幂等插入）

| id | name | is_default | front 模板 | back 模板 |
|----|------|-----------|-----------|-----------|
| 1 | 问答型 | 1 | `## 问题\n\n` | `## 答案\n\n` |
| 2 | 填空型 | 1 | `___ 是 ___ 的关键步骤。` | `首先，___；其次，___。` |
| 3 | 列表型 | 1 | `请列举以下知识点：\n\n1.\n2.\n3.` | `参考答案：\n\n1.\n2.\n3.` |

---

## 3. Repository 方法清单

| Repo | 方法 | 参数 | 返回 |
|------|------|------|------|
| folderRepo | getAll() | — | Folder[] |
| folderRepo | getById(id) | number | Folder \| null |
| folderRepo | getChildren(parentId) | number | Folder[] |
| folderRepo | insert(dto) | FolderInsertDTO | number (id) |
| folderRepo | update(id, dto) | number, FolderUpdateDTO | number (changes) |
| folderRepo | remove(id) | number | number (changes) |
| noteRepo | getByFolder(folderId) | number | Note[] |
| noteRepo | getTodayNotes() | — | Note[] |
| noteRepo | getById(id) | number | Note \| null |
| noteRepo | insert(dto) | NoteInsertDTO | number (id) |
| noteRepo | update(id, dto) | number, NoteUpdateDTO | number (changes) |
| noteRepo | remove(id) | number | number (changes) |
| noteAttachmentRepo | getByNote(noteId) | number | NoteAttachment[] |
| noteAttachmentRepo | getById(id) | number | NoteAttachment \| null |
| noteAttachmentRepo | insert(dto) | AttachmentInsertDTO | number (id) |
| noteAttachmentRepo | remove(id) | number | number (changes) |
| cardRepo | getByDeck(deckId) | number | Card[] |
| cardRepo | getById(id) | number | Card \| null |
| cardRepo | getDueCards(deckId) | number | Card[] |
| cardRepo | insert(dto) | CardInsertDTO | number (id) |
| cardRepo | insertBatch(dtos) | CardInsertDTO[] | number[] (ids) |
| cardRepo | update(id, dto) | number, CardUpdateDTO | number (changes) |
| cardRepo | updateReviewState(id, state) | number, CardReviewStateDTO | number (changes) |
| cardRepo | remove(id) | number | number (changes) |
| reviewLogRepo | insert(dto) | ReviewLogInsertDTO | number (id) |
| reviewLogRepo | getByCard(cardId) | number | ReviewLog[] |
| reviewLogRepo | getByDeckInRange(deckId, from, to) | number, string, string | ReviewLog[] |
| reviewLogRepo | getDailyCounts(year, month) | number, number | CalendarDay[] |
| reviewLogRepo | countByResult(deckId) | number | StatsByResult |
| templateRepo | getAll() | — | Template[] |
| templateRepo | getById(id) | number | Template \| null |
| templateRepo | insert(dto) | TemplateInsertDTO | number (id) |
| templateRepo | remove(id) | number | number (changes) |
| examRepo | getAll() | — | Exam[] |
| examRepo | getActive() | — | Exam[] |
| examRepo | insert(dto) | ExamInsertDTO | number (id) |
| examRepo | update(id, dto) | number, ExamUpdateDTO | number (changes) |
| examRepo | remove(id) | number | number (changes) |
| deckRepo | getAll() | — | Deck[] |
| deckRepo | getByFolder(folderId) | number | Deck[] |
| deckRepo | getById(id) | number | Deck \| null |
| deckRepo | insert(dto) | DeckInsertDTO | number (id) |
| deckRepo | update(id, dto) | number, DeckUpdateDTO | number (changes) |
| deckRepo | remove(id) | number | number (changes) |

---

## 4. 测试用例清单（47 项断言）

### §10.1  8 张表全部创建成功（9 项）

| # | 断言 | 验证方式 |
|---|------|---------|
| 1 | 表 folders 存在 | sqlite_master 查询 |
| 2 | 表 notes 存在 | sqlite_master 查询 |
| 3 | 表 note_attachments 存在 | sqlite_master 查询 |
| 4 | 表 decks 存在 | sqlite_master 查询 |
| 5 | 表 cards 存在 | sqlite_master 查询 |
| 6 | 表 review_logs 存在 | sqlite_master 查询 |
| 7 | 表 templates 存在 | sqlite_master 查询 |
| 8 | 表 exams 存在 | sqlite_master 查询 |
| 9 | cards 表列定义完整 | PRAGMA table_info(cards) 验证 13 列 |

### §10.2  外键约束启用（2 项）

| # | 断言 | 验证方式 |
|---|------|---------|
| 10 | PRAGMA foreign_keys = ON | pragma('foreign_keys') = 1 |
| 11 | 外键约束生效：插入无效 deck_id 被拒绝 | INSERT deck_id=99999 抛 FOREIGN KEY constraint failed |

### §10.3  13 条索引全部创建（13 项）

| # | 断言 |
|---|------|
| 12 | 索引 idx_folders_parent 存在 |
| 13 | 索引 idx_notes_folder 存在 |
| 14 | 索引 idx_notes_today 存在 |
| 15 | 索引 idx_notes_updated 存在 |
| 16 | 索引 idx_attach_note 存在 |
| 17 | 索引 idx_decks_folder 存在 |
| 18 | 索引 idx_cards_deck 存在 |
| 19 | 索引 idx_cards_next_review 存在 |
| 20 | 索引 idx_cards_source 存在 |
| 21 | 索引 idx_review_card 存在 |
| 22 | 索引 idx_review_deck_date 存在 |
| 23 | 索引 idx_review_date 存在 |
| 24 | 索引 idx_exams_status 存在 |

### §10.4  迁移幂等（2 项）

| # | 断言 | 验证方式 |
|---|------|---------|
| 25 | 重复执行 migrate() 三次不报错 | try-catch 包裹 3 次 migrate() |
| 26 | 幂等后模板未重复插入 | templateRepo.getAll().length === 3 |

### §10.5  预置 3 条模板数据（3 项）

| # | 断言 | 验证方式 |
|---|------|---------|
| 27 | 模板数量 = 3 | templateRepo.getAll().length |
| 28 | 全部为 is_default=1 | every(t => t.is_default === 1) |
| 29 | 模板名称: 问答型, 填空型, 列表型 | names.join(', ') === 预期 |

### §10.6  事务验证：复习提交原子性（7 项）

| # | 断言 | 验证方式 |
|---|------|---------|
| 30 | 卡片 repetitions 已更新为 1 | 正常事务后 getById 验证 |
| 31 | 卡片 interval 已更新为 1440 分钟 | 正常事务后 getById 验证 |
| 32 | 复习记录已写入 (数量: 1) | reviewLogRepo.getByCard().length |
| 33 | 复习记录 result = good | logs[0].result === 'good' |
| 34 | 事务抛异常被捕获 | catch SIMULATED_FAILURE |
| 35 | 回滚生效：卡片 ease_factor 未变（仍为初始值 2.5） | 回滚后 getById 验证 |
| 36 | 回滚生效：无错误复习记录写入 | getByCard(cardId2).length === 0 |

### §10.7  PRAGMA integrity_check（2 项）

| # | 断言 | 验证方式 |
|---|------|---------|
| 37 | integrity_check = ok | pragma('integrity_check') === 'ok' |
| 38 | foreign_key_check 无违规 | pragma('foreign_key_check') 为空 |

### §10.8  Repository 层纯 SQL 操作（6 项）

| # | 断言 | 验证方式 |
|---|------|---------|
| 39 | folderRepo CRUD 正常 | insert → getById 验证 |
| 40 | noteRepo CRUD 正常 | insert → getById 验证 |
| 41 | noteAttachmentRepo CRUD 正常 | insert → getById 验证 |
| 42 | deckRepo CRUD 正常 | insert → getById 验证 |
| 43 | examRepo CRUD 正常 | insert → getAll 验证 |
| 44 | templateRepo 禁止删除预置模板 | remove(1) 抛 TEMPLATE_IS_DEFAULT |

### §10.9  到期卡片查询走 idx_cards_next_review（3 项）

| # | 断言 | 验证方式 |
|---|------|---------|
| 45 | 到期卡片数 = 2 | getDueCards(deckId).length === 2 |
| 46 | EXPLAIN QUERY PLAN 走 idx_cards_next_review | 查询计划包含 idx_cards_next_review |
| 47 | EXPLAIN QUERY PLAN 走 deck_id 索引 | 查询计划包含 idx_cards_deck 或 idx_cards_next_review |

---

## 5. 测试运行方式

```bash
cd daima/server
npx tsx src/db/stage1-mock-test.ts
```

### 运行环境

| 项 | 值 |
|----|-----|
| SQLite 版本 | 3.49.2 |
| 数据库模式 | :memory:（内存，不写磁盘） |
| journal_mode | memory |
| foreign_keys | 1 |
| busy_timeout | 5000 |
| synchronous | 2 |
| migrate() 耗时 | 1ms |
| closeDb() 耗时 | 0ms |

### 日志分级

| 标签 | 用途 |
|------|------|
| [INFO] | 连接初始化、迁移进度、汇总 |
| [PASS] | 断言通过 |
| [FAIL] | 断言失败（附 detail） |
| [DATA] | 数据流追踪（insert 返回 ID、getById 返回字段值） |
| [DIAG] | 连接诊断（PRAGMA 值、表/索引计数、关闭耗时） |

---

## 6. 验收结论

```
通过: 47  失败: 0  总计: 47
```

DB §10 的 9 条验收标准全部满足，Stage 1 数据库层验收通过。
