# 记忆学习平台 — 数据库技术文档

> 本文档定义数据库选型、表结构设计、索引策略、迁移方案、数据访问层规范与常用查询模式。不包含具体实现代码。

---

## 一、数据库选型

| 维度 | 选型 | 说明 |
|------|------|------|
| 数据库系统 | SQLite 3 | 嵌入式关系型数据库，零配置，无需独立服务进程 |
| Node.js 驱动 | better-sqlite3 ^11 | 同步 API，性能优于异步 sqlite3 驱动，适合单用户本地场景 |
| 存储位置 | `data/app.db` | 项目根目录下 data 文件夹，可经配置中心 `DB_PATH` 覆盖 |
| 适用阶段 | Phase 1-3 | MVP 及高级功能阶段使用 SQLite；Phase 4 起若需多用户可迁移至 PostgreSQL |

### 选型理由

- **零运维**：无需安装数据库服务，`npm install` 即用
- **单文件存储**：数据库即一个 `.db` 文件，备份/迁移直接复制
- **事务支持**：完整 ACID，复习记录写入与卡片状态更新用事务保证一致性
- **轻量**：单用户学习工具，并发量低（1-5 请求/秒），SQLite 完全胜任
- **迁移路径**：SQL 标准兼容 PostgreSQL，后续升级只需换驱动 + 微调 DDL

---

## 二、实体关系总览

```
folders ──┬── notes ──┬── note_attachments
          │            │
          │            └── cards (via source_note)
          │
          └── decks ──── cards ──── review_logs
                           │
                           └── exams (via deck_id)

templates (独立实体，无外键依赖)
```

### 实体关系描述

| 关系 | 类型 | 说明 |
|------|------|------|
| folders → folders | 自引用 1:N | `parent_id` 实现嵌套文件夹树 |
| folders → notes | 1:N | 一个文件夹包含多篇笔记 |
| folders → decks | 1:N | 牌组可选归属到文件夹 |
| notes → note_attachments | 1:N | 一篇笔记有多个附件，级联删除 |
| notes → cards | 1:N (可选) | `cards.source_note` 标记卡片来源于哪篇笔记 |
| decks → cards | 1:N | 核心关系，牌组包含多张卡片，级联删除 |
| cards → review_logs | 1:N | 一张卡片有多条复习记录，级联删除 |
| decks → exams | 1:N (可选) | 一次考试目标关联一个牌组 |

---

## 三、表结构设计

### 3.1 文件夹表 `folders`

| 列名 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | — | 主键 |
| `name` | TEXT | NOT NULL | — | 文件夹名称 |
| `parent_id` | INTEGER | REFERENCES folders(id) | NULL | 父文件夹 ID，NULL = 根目录 |
| `created_at` | TEXT | — | datetime('now') | 创建时间 |
| `updated_at` | TEXT | — | datetime('now') | 更新时间 |

**设计要点**：
- 树形结构通过 `parent_id` 自引用实现，应用层递归查询构建树
- 不支持硬删除子树（级联由应用层控制：删除文件夹前校验无子节点和笔记）

### 3.2 笔记表 `notes`

| 列名 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | — | 主键 |
| `folder_id` | INTEGER | REFERENCES folders(id) | NULL | 所属文件夹，NULL = 未分类 |
| `title` | TEXT | NOT NULL | '未命名笔记' | 笔记标题 |
| `content` | TEXT | — | '' | Tiptap JSON 格式正文 |
| `is_today` | INTEGER | — | 0 | 1=今日临时笔记，0=永久笔记 |
| `tags` | TEXT | — | '[]' | JSON 数组字符串 `["tag1","tag2"]` |
| `created_at` | TEXT | — | datetime('now') | 创建时间 |
| `updated_at` | TEXT | — | datetime('now') | 更新时间 |

**设计要点**：
- `content` 存储 Tiptap 编辑器的 JSON 输出，非 Markdown 原文 — 前端渲染时还原富文本结构
- `is_today` 标记今日临时笔记，每日仅保留当天的临时笔记（旧的可迁移到文件夹或清理）
- `tags` 用 JSON 字符串而非关联表，简化查询（Phase 1 标签筛选量小，JSON 反序列化开销可接受）
- 笔记转为记忆卡片时，`cards.source_note` 回指到 `notes.id`

### 3.3 笔记附件表 `note_attachments`

| 列名 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | — | 主键 |
| `note_id` | INTEGER | NOT NULL, REFERENCES notes(id) ON DELETE CASCADE | — | 所属笔记 |
| `filename` | TEXT | NOT NULL | — | 原始文件名 |
| `filepath` | TEXT | NOT NULL | — | 服务端存储路径 `uploads/xxx` |
| `file_type` | TEXT | — | 'other' | 类型枚举：pdf / image / doc / other |
| `file_size` | INTEGER | — | 0 | 文件大小（字节） |
| `created_at` | TEXT | — | datetime('now') | 上传时间 |

**设计要点**：
- `ON DELETE CASCADE`：删除笔记时自动删除附件记录
- 文件物理删除由应用层在删除记录后执行（`fs.unlink`）
- `file_type` 用于前端展示图标和文件预览策略

### 3.4 牌组表 `decks`

| 列名 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | — | 主键 |
| `name` | TEXT | NOT NULL | — | 牌组名称 |
| `description` | TEXT | — | '' | 牌组描述 |
| `folder_id` | INTEGER | REFERENCES folders(id) | NULL | 所属文件夹 |
| `icon` | TEXT | — | '📚' | Emoji 图标 |
| `color` | TEXT | — | '#f0f0f0' | 卡片主题色（hex） |
| `created_at` | TEXT | — | datetime('now') | 创建时间 |
| `updated_at` | TEXT | — | datetime('now') | 更新时间 |

**设计要点**：
- `icon` 和 `color` 供前端卡片式展示使用，服务端不校验合法性
- `folder_id` 使牌组也可按文件夹组织（与笔记共享文件夹体系）

### 3.5 卡片表 `cards`（核心表）

| 列名 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | — | 主键 |
| `deck_id` | INTEGER | NOT NULL, REFERENCES decks(id) ON DELETE CASCADE | — | 所属牌组 |
| `front` | TEXT | NOT NULL | — | 正面内容（Markdown） |
| `back` | TEXT | NOT NULL | — | 背面内容（Markdown） |
| `source_note` | INTEGER | REFERENCES notes(id) | NULL | 来源笔记 ID |
| `tags` | TEXT | — | '[]' | JSON 标签数组 |
| `ease_factor` | REAL | — | 2.5 | SM-2 简易度因子 |
| `interval` | INTEGER | — | 0 | 间隔天数，0 = 新卡/刚创建 |
| `repetitions` | INTEGER | — | 0 | 连续正确次数 |
| `next_review` | TEXT | — | datetime('now') | 下次复习时间（ISO 8601） |
| `last_reviewed` | TEXT | — | NULL | 最近一次复习时间 |
| `created_at` | TEXT | — | datetime('now') | 创建时间 |
| `updated_at` | TEXT | — | datetime('now') | 更新时间 |

**设计要点**：
- 分两套字段：
  - **内容字段** (`front`, `back`, `tags`) — 存储学习内容，Markdown 格式
  - **算法字段** (`ease_factor`, `interval`, `repetitions`, `next_review`, `last_reviewed`) — 驱动间隔重复
- `interval = 0` 表示新卡（从未复习或刚被重置），可立即进入复习队列
- `next_review` 用于到期判定：`next_review <= datetime('now')` → 纳入今日复习
- `ON DELETE CASCADE`：删除牌组时级联删除所有卡片

### 3.6 复习记录表 `review_logs`

| 列名 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | — | 主键 |
| `card_id` | INTEGER | NOT NULL, REFERENCES cards(id) ON DELETE CASCADE | — | 复习的卡片 |
| `deck_id` | INTEGER | NOT NULL, REFERENCES decks(id) ON DELETE CASCADE | — | 所属牌组（冗余，加速统计） |
| `result` | TEXT | NOT NULL | — | 评分：forgot / hard / good / easy |
| `reviewed_at` | TEXT | — | datetime('now') | 复习时间 |

**设计要点**：
- `deck_id` 冗余字段，避免统计时 JOIN cards → decks 的二次查询
- `ON DELETE CASCADE`：删除牌组时级联删除所有复习记录
- 此表为**追加写入**表，无 UPDATE 操作，适合做时间轴和日历数据源
- 统计查询（如每日复习总量、正确率）均以此表为基础

### 3.7 模板表 `templates`

| 列名 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | — | 主键 |
| `name` | TEXT | NOT NULL | — | 模板名称 |
| `description` | TEXT | — | '' | 模板说明 |
| `front` | TEXT | — | '' | 正面预设文本（Markdown） |
| `back` | TEXT | — | '' | 背面预设文本（Markdown） |
| `is_default` | INTEGER | — | 0 | 1=系统预置，不可删除 |
| `created_at` | TEXT | — | datetime('now') | 创建时间 |

**设计要点**：
- `is_default = 1` 的记录通过迁移脚本预置，前端隐藏删除按钮
- 模板不关联牌组 — 用户选择模板后填充到手动词卡表单

### 3.8 考试目标表 `exams`

| 列名 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | — | 主键 |
| `name` | TEXT | NOT NULL | — | 考试名称 |
| `deck_id` | INTEGER | REFERENCES decks(id) | NULL | 关联牌组 |
| `target_date` | TEXT | — | NULL | 目标日期（ISO 8601） |
| `target_count` | INTEGER | — | 0 | 每日复习卡片数目标 |
| `status` | TEXT | — | 'active' | active / completed |
| `created_at` | TEXT | — | datetime('now') | 创建时间 |

**设计要点**：
- `deck_id` 不设级联删除：删除牌组时考试目标仍保留，仅 `deck_id` 变为 NULL
- `target_count = 0` 表示无每日数量目标（仅设定日期）

---

## 四、索引策略

### 4.1 索引清单

| 表 | 索引名 | 列 | 类型 | 用途 |
|----|--------|-----|------|------|
| folders | `idx_folders_parent` | `parent_id` | 普通 | 构建文件夹树 |
| notes | `idx_notes_folder` | `folder_id` | 普通 | 按文件夹查笔记 |
| notes | `idx_notes_today` | `is_today` | 普通 (WHERE is_today=1) | 查询今日笔记 |
| notes | `idx_notes_updated` | `updated_at` | 普通 | 按时间排序 |
| note_attachments | `idx_attach_note` | `note_id` | 普通 | 查笔记附件 |
| decks | `idx_decks_folder` | `folder_id` | 普通 | 按文件夹查牌组 |
| cards | `idx_cards_deck` | `deck_id` | 普通 | 按牌组查卡片（高频） |
| cards | `idx_cards_next_review` | `deck_id, next_review` | 复合 | 到期卡片筛选（最高频） |
| cards | `idx_cards_source` | `source_note` | 普通 | 从笔记追溯卡片 |
| review_logs | `idx_review_card` | `card_id` | 普通 | 查卡片复习历史 |
| review_logs | `idx_review_deck_date` | `deck_id, reviewed_at` | 复合 | 牌组统计查询（高频） |
| review_logs | `idx_review_date` | `reviewed_at` | 普通 | 日历视图 / 全局统计 |
| exams | `idx_exams_status` | `status` | 普通 | 筛选活跃的考试 |

### 4.2 索引设计原则

- **最高频查询优先**：到期卡片筛选 (`deck_id + next_review`) 是每日打开应用的第一查询，必须走索引
- **复合索引列顺序**：等值查询列在前（`deck_id`），范围查询列在后（`next_review`）
- **冗余少**：Phase 1 数据量小（单用户 < 10 万行），不对选择性差的列建索引
- **定期分析**：Phase 2 引入 `ANALYZE` 统计信息更新，辅助查询优化器

---

## 五、建表迁移策略

### 5.1 迁移原则

- **幂等建表**：所有 DDL 使用 `CREATE TABLE IF NOT EXISTS`，重复执行不报错
- **启动时自执行**：服务启动后自动运行迁移，无需手动命令
- **顺序依赖**：按外键依赖顺序执行建表（先主表后引用表）
- **无回滚**：MVP 阶段不做迁移回滚，数据备份依赖文件复制

### 5.2 迁移执行顺序

```
1. folders          (无外键依赖)
2. notes            (依赖 folders)
3. note_attachments (依赖 notes)
4. decks            (依赖 folders)
5. cards            (依赖 decks, notes)
6. review_logs      (依赖 cards, decks)
7. templates        (无外键依赖)
8. exams            (依赖 decks)
```

### 5.3 预置数据

迁移完成后自动插入预置模板：

| name | front | back | is_default |
|------|-------|------|------------|
| 问答型 | `## 问题\n\n` | `## 答案\n\n` | 1 |
| 填空型 | `___ 是 ___ 的关键步骤。` | `首先，___；其次，___。` | 1 |
| 列表型 | `请列举以下知识点：\n\n1.\n2.\n3.` | `参考答案：\n\n1.\n2.\n3.` | 1 |

---

## 六、数据访问层规范

### 6.1 分层定位

```
services/         # 业务逻辑层 — 调用 repository，编排多表操作
    │
repositories/     # 数据访问层 — 纯 SQL 操作，不包含业务规则
    │
db/connection.ts  # 数据库连接 — 单一 better-sqlite3 实例
```

### 6.2 Repository 设计规范

| 规范项 | 说明 |
|--------|------|
| 对应关系 | 一个 repository 对应一张主表（如 `cardRepo.ts` ↔ `cards` 表） |
| 方法命名 | `getXxx` (查询) / `insert` (单条插入) / `insertBatch` (批量) / `update` (更新) / `remove` (删除) |
| 返回值 | 查询返回数据对象或 null；写入返回插入/更新的行 ID |
| 参数 | 接收 Plain Object（DTO），内部参数化拼 SQL |
| 禁止事项 | 不包含 if-else 业务判断、不调用其他 repository、不访问 req/res |

### 6.3 Repository 方法清单

#### `folderRepo.ts`

| 方法 | 参数 | 返回 | SQL 摘要 |
|------|------|------|---------|
| `getAll` | — | Folder[] | `SELECT * FROM folders ORDER BY name` |
| `getById` | id | Folder \| null | `SELECT * FROM folders WHERE id = ?` |
| `getChildren` | parentId | Folder[] | `SELECT * FROM folders WHERE parent_id = ?` |
| `insert` | { name, parentId? } | id | `INSERT INTO folders ...` |
| `update` | id, { name } | affected | `UPDATE folders SET name=?, updated_at=...` |
| `remove` | id | affected | 删除前校验无子文件夹和笔记 |

#### `noteRepo.ts`

| 方法 | 参数 | 返回 | SQL 摘要 |
|------|------|------|---------|
| `getByFolder` | folderId | Note[] | `WHERE folder_id = ? ORDER BY updated_at DESC` |
| `getTodayNotes` | — | Note[] | `WHERE is_today = 1 ORDER BY updated_at DESC` |
| `getById` | id | Note \| null | `SELECT * FROM notes WHERE id = ?` |
| `insert` | dto | id | `INSERT INTO notes ...` |
| `update` | id, dto | affected | `UPDATE notes SET ...` |
| `remove` | id | affected | 级联处理附件文件删除 |

#### `cardRepo.ts`

| 方法 | 参数 | 返回 | SQL 摘要 |
|------|------|------|---------|
| `getByDeck` | deckId | Card[] | `WHERE deck_id = ? ORDER BY created_at` |
| `getById` | id | Card \| null | `SELECT * FROM cards WHERE id = ?` |
| `getDueCards` | deckId | Card[] | `WHERE deck_id = ? AND next_review <= datetime('now')` |
| `insert` | dto | id | `INSERT INTO cards ...` |
| `insertBatch` | dto[] | ids[] | 事务内多条 INSERT |
| `update` | id, dto | affected | `UPDATE cards SET ...` |
| `updateReviewState` | id, state | affected | 更新 ease_factor/interval/repetitions/next_review/last_reviewed |
| `remove` | id | affected | `DELETE FROM cards WHERE id = ?` |

#### `reviewLogRepo.ts`

| 方法 | 参数 | 返回 | SQL 摘要 |
|------|------|------|---------|
| `insert` | { cardId, deckId, result } | id | `INSERT INTO review_logs ...` |
| `getByCard` | cardId | ReviewLog[] | `WHERE card_id = ? ORDER BY reviewed_at DESC` |
| `getByDeckInRange` | deckId, from, to | ReviewLog[] | `WHERE deck_id = ? AND reviewed_at BETWEEN ? AND ?` |
| `getDailyCounts` | year, month | CalendarDay[] | GROUP BY 日期，用于日历热力图 |
| `countByResult` | deckId | StatsByResult | GROUP BY result，用于正确率计算 |

#### `templateRepo.ts`

| 方法 | 参数 | 返回 | SQL 摘要 |
|------|------|------|---------|
| `getAll` | — | Template[] | `SELECT * FROM templates ORDER BY is_default DESC, created_at` |
| `getById` | id | Template \| null | `WHERE id = ?` |
| `insert` | dto | id | `INSERT INTO templates ...` |
| `remove` | id | affected | 禁止删除 `is_default = 1` 的记录 |

#### `examRepo.ts`

| 方法 | 参数 | 返回 | SQL 摘要 |
|------|------|------|---------|
| `getAll` | — | Exam[] | `SELECT * FROM exams ORDER BY created_at DESC` |
| `getActive` | — | Exam[] | `WHERE status = 'active'` |
| `insert` | dto | id | `INSERT INTO exams ...` |
| `update` | id, dto | affected | `UPDATE exams SET ...` |
| `remove` | id | affected | `DELETE FROM exams WHERE id = ?` |

---

## 七、核心查询模式

### 7.1 今日到期卡片（最高频查询）

```
场景：用户进入复习模式，获取某个牌组中所有到期卡片
表：cards
条件：deck_id = ? AND next_review <= datetime('now')
排序：next_review ASC（先到期的先复习）
索引：idx_cards_next_review (deck_id, next_review)
```

### 7.2 牌组列表与进度（首页查询）

```
场景：首页展示所有牌组，含卡片总数和待复习数量
表：decks LEFT JOIN cards
聚合：
  - 总卡片数：COUNT(cards.id)
  - 到期数：  SUM(CASE WHEN next_review <= now THEN 1 ELSE 0 END)
分组：GROUP BY decks.id
```

### 7.3 日历热力图数据

```
场景：统计页日历视图，展示某月每日复习卡片数
表：review_logs
条件：deck_id = ? AND reviewed_at BETWEEN '2026-06-01' AND '2026-07-01'
分组：GROUP BY DATE(reviewed_at)
聚合：COUNT(DISTINCT card_id)
索引：idx_review_deck_date (deck_id, reviewed_at)
```

### 7.4 全局统计概览

```
场景：统计面板首页，展示累计数据
表：cards + review_logs
指标：
  - 总卡片数：     SELECT COUNT(*) FROM cards
  - 已掌握：       SELECT COUNT(*) FROM cards WHERE repetitions >= 3 AND interval >= 21
  - 今日待复习：   SELECT COUNT(*) FROM cards WHERE next_review <= datetime('now')
  - 连续学习天数： 查询 review_logs 按日期分组，从今天倒推连续有记录的日期数
  - 总正确率：     SELECT result, COUNT(*) FROM review_logs GROUP BY result
```

### 7.5 时间轴数据

```
场景：按时间线展示复习记录和卡片创建记录（混合展示）
数据源：UNION ALL
  - 复习记录：SELECT 'review' AS type, result, reviewed_at AS time, card_id FROM review_logs
  - 创建记录：SELECT 'create' AS type, NULL, created_at AS time, id FROM cards
排序：time DESC
```

### 7.6 笔记转卡片（写入事务）

```
场景：将一篇笔记一键转换为多张记忆卡片
步骤（在同一个事务内）：
  1. 解析笔记 content (Tiptap JSON)，提取标题/段落边界
  2. 对每个段落，调用 cardRepo.insert({ deck_id, front, back, source_note })
  3. 返回新建的卡片列表
```

### 7.7 复习提交（写入事务）

```
场景：用户对卡片评分后提交
步骤（在同一个事务内）：
  1. 调用 SM-2 算法计算新的 ease_factor, interval, repetitions, next_review
  2. 调用 cardRepo.updateReviewState(id, newState)
  3. 调用 reviewLogRepo.insert({ cardId, deckId, result })
保证：卡片状态更新和复习记录写入原子性
```

---

## 八、备份与恢复

### 8.1 备份策略

| 方式 | 说明 | 适用场景 |
|------|------|---------|
| 文件复制 | 直接复制 `data/app.db` 文件 | 开发阶段手动备份 |
| JSON 导出 | 调用 `/api/export/all` 导出全量数据 | 用户主动数据迁移 |
| 定时快照 | Phase 3 引入：每日自动复制 db 文件到 `data/backups/`，保留最近 7 天 | 生产防护 |

### 8.2 恢复步骤

1. 停止应用服务
2. 将备份的 `app.db` 覆盖 `data/app.db`
3. 重启服务，迁移自动执行（幂等，无影响）
4. 访问健康检查确认数据库状态为 `connected`

### 8.3 数据完整性校验

Phase 3 引入启动时轻量校验：

| 校验项 | 方法 |
|--------|------|
| 外键完整性 | `PRAGMA foreign_key_check` |
| 数据库未损坏 | `PRAGMA integrity_check` |
| 表结构一致 | 检查 `sqlite_master` 中表名和列名 |

---

## 九、性能考量

### 9.1 当前阶段（Phase 1 — 单用户本地）

| 场景 | 预期数据量 | 性能目标 |
|------|-----------|---------|
| 总卡片数 | < 10,000 | — |
| 单牌组卡片数 | < 500 | — |
| 每日复习量 | < 100 | — |
| 复习记录 | < 50,000/年 | — |

在此量级下，所有查询无需分页、无需缓存、无需读写分离。SQLite 单表扫描 5 万行耗时 < 5ms。

### 9.2 预留优化点（Phase 4+）

| 优化项 | 触发条件 | 方案 |
|--------|---------|------|
| 分页查询 | 单牌组卡片 > 1000 | 游标分页 `WHERE id > ? LIMIT 50` |
| 统计缓存 | 统计面板频繁访问 | Redis / 内存缓存 30 秒 TTL |
| 读写分离 | 迁移到 PostgreSQL 后 | 主库写入 + 只读副本统计查询 |
| 全文搜索 | 全局搜索 > 1000 条笔记 | SQLite FTS5 扩展 / Elasticsearch |

---

## 十、验收清单

- [ ] 8 张表全部创建成功，`PRAGMA table_info` 验证列定义
- [ ] 外键约束启用 (`PRAGMA foreign_keys = ON`)
- [ ] 13 条索引全部创建，`EXPLAIN QUERY PLAN` 验证走索引
- [ ] 迁移幂等：重复执行建表脚本不报错
- [ ] 预置 3 条模板数据自动插入
- [ ] 事务验证：复习提交同时更新 cards + 写入 review_logs，模拟异常回滚
- [ ] `PRAGMA integrity_check` 报告数据库无损坏
- [ ] Repository 层纯 SQL 操作，不含业务判断
- [ ] 到期卡片查询走 `idx_cards_next_review` 复合索引
