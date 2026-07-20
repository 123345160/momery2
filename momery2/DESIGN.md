# 记忆学习平台 — 产品设计文档

## 一、产品概述

一个融合**笔记管理**与**间隔重复记忆卡片**的综合学习平台。支持手动创建记忆卡片、AI 辅助生成卡片、多类型文件解析、富文本笔记编辑、复习统计等功能。

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript + Vite |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 富文本编辑器 | Tiptap (ProseMirror) |
| Markdown | marked + highlight.js |
| 后端框架 | Node.js + Express + TypeScript |
| 数据库 | SQLite (better-sqlite3) |
| AI (Phase 2) | OpenAI / Anthropic API |

---

## 二、页面布局架构

```
┌──────────┬──────────────────────────────────────────┐
│          │  顶部功能区                                │
│          │  [首页] [卡片统计] [考试与目标]  [+新建] [日历] [工具] │
│ 左侧     ├──────────────────────────────────────────┤
│ 固定     │                                            │
│ 侧边栏   │         主体内容区 (卡片式布局)               │
│ 240px    │                                            │
│          │  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ 📂 文档   │  │ 牌组 A   │ │ 今日笔记 │ │ 统计卡片 │    │
│   与文件夹│  │ 12 张卡片│ │ 3 条笔记│ │ 复习进度 │    │
│          │  └─────────┘ └─────────┘ └─────────┘    │
│ 📝 今日  │                                            │
│   笔记   │  ┌──────────────────────────────────┐    │
│          │  │ 复习模式 (Q&A 卡片)               │    │
│ 🧠 记忆  │  │                                    │    │
│   卡片   │  │ 问题：光合作用的化学方程式是？       │    │
│          │  │ ────────────────────────────────  │    │
│ ──────── │  │ 答案：6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂│    │
│ 🔍 搜索  │  │                                    │    │
│          │  │ [完全忘记] [困难] [正确] [简单]    │    │
│ 筛选：   │  └──────────────────────────────────┘    │
│ ○ 全部   │                                            │
│ ○ 文件夹 │                                            │
│ ○ PDF   │                                            │
│ ○ 标签   │                                            │
└──────────┴──────────────────────────────────────────┘
```

---

## 三、路由设计

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | DashboardHome | 首页总览 |
| `/cards` | CardsHome | 记忆卡片首页（牌组网格） |
| `/cards/stats` | CardStats | 卡片统计（日历视图 + 时间轴） |
| `/cards/exam` | ExamGoals | 考试与目标管理 |
| `/cards/deck/:id` | DeckDetail | 牌组详情（卡片列表） |
| `/cards/review/:deckId` | ReviewSession | 复习模式 |
| `/notes` | NotesList | 文档与文件夹 |
| `/notes/today` | TodayNotes | 今日临时笔记 |
| `/notes/:id` | NoteEditor | 笔记编辑器 |
| `/search` | SearchView | 全局搜索 |
| `/settings` | Settings | 设置页 |

---

## 四、功能模块

### 4.1 左侧侧边栏

- **导航入口**：文档与文件夹、今日笔记、记忆卡片
- **搜索**：全局搜索框
- **分类筛选**：全部 / 文件夹 / PDF / 标签

### 4.2 顶部功能区

- **子标签切换**：首页 / 卡片统计 / 考试与目标
- **新建按钮**：新建牌组、笔记、文件夹
- **日历栏**：日期选择，快捷跳转
- **工具入口**：模板、教程、设置

### 4.3 记忆卡片系统

#### 牌组管理
- 创建/编辑/删除牌组
- 牌组卡片网格展示（名称、卡片数、复习进度）
- 分类筛选与搜索

#### 卡片创建
- **手动创建**：输入正面（问题）+ 背面（答案），支持 Markdown
- **模板创建**：从预置/自定义模板快速创建
- **AI 生成**（Phase 2）：输入主题，AI 自动生成一组卡片
- **笔记转换**：将笔记内容一键转为记忆卡片
- **批量导入**：JSON 格式批量导入

#### 复习模式
- Q&A 卡片式交互
- 先展示问题 → 点击「显示答案」→ 4 级自评按钮
- 4 级评分：完全忘记 / 困难 / 正确 / 简单
- 基于简化 SM-2 算法自动调整下次复习时间
- 复习进度条实时反馈

### 4.4 统计系统

#### 日历视图
- 月份日历展示每日复习卡片数
- 不同颜色标注学习密度
- 点击日期查看当日详情

#### 数据面板
- 总卡片数 / 已掌握 / 待复习 / 今日待复习
- 正确率趋势
- 连续学习天数

#### 时间轴
- 按时间展示笔记/卡片的创建记录
- 复习历史记录

### 4.5 笔记系统

#### 文件夹管理
- 嵌套文件夹结构
- 文档在文件夹间移动

#### 今日笔记
- 快速记录当日临时笔记
- 可迁移到永久文件夹

#### 富文本编辑器
- 标题层级（H1-H3）
- 待办清单
- 图片插入
- 表格
- 代码块
- Markdown 快捷输入

#### 附件支持
- PDF 上传与预览
- 图片上传
- 附件关联到笔记

### 4.6 考试与目标

- 设定考试日期和复习目标（如"每天复习 50 张"）
- 进度追踪
- 倒计时提醒

### 4.7 AI 功能（Phase 2）

- **AI 生成记忆卡片**：输入笔记或主题，自动提炼关键知识点生成卡片
- **AI 导师**：根据卡片内容提问，引导主动回忆
- **AI 问答**：学习过程中的疑问即时解答
- **PDF 解析**：上传 PDF，AI 提取知识点生成卡片

### 4.8 辅助工具

- **模板管理**：预设卡片模板（问答型 / 填空型 / 列表型）
- **个性化设置**：主题、复习卡片数、提醒时间
- **好友邀请**：分享牌组给好友一起学习
- **教程指引**：新手引导

---

## 五、数据模型

```sql
-- 文件夹
CREATE TABLE folders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  parent_id   INTEGER REFERENCES folders(id),
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- 笔记
CREATE TABLE notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id   INTEGER REFERENCES folders(id),
  title       TEXT NOT NULL DEFAULT '未命名笔记',
  content     TEXT DEFAULT '',            -- Tiptap JSON
  is_today    INTEGER DEFAULT 0,
  tags        TEXT DEFAULT '[]',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- 笔记附件
CREATE TABLE note_attachments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id     INTEGER REFERENCES notes(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  filepath    TEXT NOT NULL,
  file_type   TEXT DEFAULT 'other',
  file_size   INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- 牌组
CREATE TABLE decks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  folder_id   INTEGER REFERENCES folders(id),
  icon        TEXT DEFAULT '📚',
  color       TEXT DEFAULT '#f0f0f0',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- 卡片
CREATE TABLE cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id       INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front         TEXT NOT NULL,             -- 问题（支持 Markdown）
  back          TEXT NOT NULL,             -- 答案（支持 Markdown）
  source_note   INTEGER REFERENCES notes(id),
  tags          TEXT DEFAULT '[]',
  ease_factor   REAL DEFAULT 2.5,
  interval      INTEGER DEFAULT 0,
  repetitions   INTEGER DEFAULT 0,
  next_review   TEXT DEFAULT (datetime('now')),
  last_reviewed TEXT DEFAULT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- 复习记录
CREATE TABLE review_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id     INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  deck_id     INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  result      TEXT NOT NULL,  -- forgot/hard/good/easy
  reviewed_at TEXT DEFAULT (datetime('now'))
);

-- 模板
CREATE TABLE templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  front       TEXT DEFAULT '',
  back        TEXT DEFAULT '',
  is_default  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- 考试目标
CREATE TABLE exams (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  deck_id      INTEGER REFERENCES decks(id),
  target_date  TEXT,
  target_count INTEGER DEFAULT 0,
  status       TEXT DEFAULT 'active',
  created_at   TEXT DEFAULT (datetime('now'))
);
```

---

## 六、间隔重复算法

基于简化 SM-2 算法，4 级反馈：

| 评分 | 按钮 | repetitions | interval | ease_factor |
|------|------|-------------|----------|-------------|
| 1 | 完全忘记 | 重置为 0 | 10 分钟 | -0.20 |
| 2 | 困难 | 重置为 0 | 1 天 | -0.15 |
| 3 | 正确 | +1 | × ease_factor | 不变 |
| 4 | 简单 | +1 | × ease_factor × 1.3 | +0.15 |

- ease_factor 下限 1.3，上限无限制
- interval 上限 365 天
- 新卡首次复习时间 = now

---

## 七、API 设计

### 牌组
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/decks` | 牌组列表（分页、搜索、筛选） |
| POST | `/api/decks` | 创建牌组 |
| GET | `/api/decks/:id` | 牌组详情 |
| PUT | `/api/decks/:id` | 更新牌组 |
| DELETE | `/api/decks/:id` | 删除牌组 |

### 卡片
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/decks/:id/cards` | 牌组下卡片列表 |
| POST | `/api/decks/:id/cards` | 创建卡片 |
| POST | `/api/cards/batch` | 批量创建卡片 |
| PUT | `/api/cards/:id` | 更新卡片 |
| DELETE | `/api/cards/:id` | 删除卡片 |

### 复习
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/decks/:id/due` | 获取到期卡片 |
| POST | `/api/cards/:id/review` | 提交复习结果 |
| GET | `/api/decks/:id/review-progress` | 复习进度 |

### 笔记
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notes` | 笔记列表 |
| GET | `/api/notes/today` | 今日笔记 |
| POST | `/api/notes` | 创建笔记 |
| GET | `/api/notes/:id` | 笔记详情 |
| PUT | `/api/notes/:id` | 更新笔记 |
| DELETE | `/api/notes/:id` | 删除笔记 |
| POST | `/api/notes/:id/attachments` | 上传附件 |
| POST | `/api/notes/:id/convert-to-cards` | 笔记转为卡片 |

### 文件夹
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/folders` | 文件夹树 |
| POST | `/api/folders` | 创建文件夹 |
| PUT | `/api/folders/:id` | 重命名 |
| DELETE | `/api/folders/:id` | 删除 |

### 统计
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats/overview` | 全局概览 |
| GET | `/api/stats/calendar` | 日历视图数据 |
| GET | `/api/stats/timeline` | 时间轴数据 |
| GET | `/api/stats/deck/:id` | 单牌组统计 |

### 模板
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/templates` | 模板列表 |
| POST | `/api/templates` | 创建模板 |

### 导入导出
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/import/json` | 导入 JSON |
| GET | `/api/export/deck/:id` | 导出牌组 |
| GET | `/api/export/all` | 导出全部 |

---

## 八、组件树

```
App.vue
├── LayoutSidebar.vue            # 左侧固定侧边栏
│   ├── NavSection.vue           # 导航区域（文档/今日笔记/记忆卡片）
│   ├── SearchBar.vue            # 搜索框
│   └── CategoryFilter.vue       # 分类筛选
├── LayoutTopBar.vue             # 顶部功能区
│   ├── SubTabs.vue              # 子标签导航
│   ├── CreateButton.vue         # 新建按钮
│   ├── CalendarBar.vue          # 日历条
│   └── ToolEntries.vue          # 工具入口
└── <RouterView>                 # 主体内容
    └── 页面组件...
```

---

## 九、配色与样式

```css
:root {
  --sidebar-width:   240px;
  --topbar-height:   52px;

  --bg-primary:      #ffffff;
  --bg-secondary:    #f5f6f8;
  --bg-sidebar:      #fafbfc;
  --bg-card:         #ffffff;

  --text-primary:    #1a1a1a;
  --text-secondary:  #666666;
  --text-muted:      #999999;

  --border:          #e8e8e8;
  --shadow:          0 1px 3px rgba(0,0,0,0.08);
  --radius:          8px;

  --accent:          #4a90d9;
  --accent-hover:    #3a7bc8;
}
```

浅色简约风格，通用办公/笔记配色，无高饱和度颜色。

---

## 十、项目目录结构

```
momery2/
├── client/                          # Vue 3 前端
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       ├── styles/
│       │   └── variables.css
│       ├── router/
│       │   └── index.ts
│       ├── stores/
│       │   ├── deck.ts
│       │   ├── note.ts
│       │   └── review.ts
│       ├── api/
│       │   └── index.ts
│       ├── types/
│       │   └── index.ts
│       ├── views/
│       │   ├── DashboardHome.vue
│       │   ├── CardsHome.vue
│       │   ├── CardStats.vue
│       │   ├── ExamGoals.vue
│       │   ├── DeckDetail.vue
│       │   ├── ReviewSession.vue
│       │   ├── NotesList.vue
│       │   ├── TodayNotes.vue
│       │   ├── NoteEditor.vue
│       │   ├── SearchView.vue
│       │   └── Settings.vue
│       ├── components/
│       │   ├── layout/
│       │   │   ├── LayoutSidebar.vue
│       │   │   ├── LayoutTopBar.vue
│       │   │   ├── SearchBar.vue
│       │   │   └── CategoryFilter.vue
│       │   ├── deck/
│       │   │   ├── DeckGrid.vue
│       │   │   ├── DeckCard.vue
│       │   │   ├── CardList.vue
│       │   │   └── CardCreateForm.vue
│       │   ├── review/
│       │   │   └── ReviewCard.vue
│       │   ├── stats/
│       │   │   ├── CalendarHeatmap.vue
│       │   │   ├── StatsSummary.vue
│       │   │   └── TimelineView.vue
│       │   ├── note/
│       │   │   ├── NoteCard.vue
│       │   │   └── FolderTree.vue
│       │   └── common/
│       │       ├── Modal.vue
│       │       ├── ImportModal.vue
│       │       ├── ExportModal.vue
│       │       └── TemplateModal.vue
│       └── composables/
│           ├── useReview.ts
│           └── useStats.ts
│
├── server/                          # Node.js 后端
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── db.ts
│       ├── routes/
│       │   ├── decks.ts
│       │   ├── cards.ts
│       │   ├── review.ts
│       │   ├── notes.ts
│       │   ├── folders.ts
│       │   ├── stats.ts
│       │   ├── templates.ts
│       │   └── importExport.ts
│       └── utils/
│           ├── review.ts            # SM-2 算法
│           └── upload.ts            # 文件上传处理
│
├── uploads/                         # 上传文件存储
├── package.json                     # 根 package.json
└── DESIGN.md                        # 本文档
```

---

## 十一、实施阶段

| 阶段 | 范围 | 预计内容 |
|------|------|---------|
| **Phase 1** (MVP) | 核心记忆卡片 | 牌组/卡片 CRUD、复习模式、基础统计（数据面板）、JSON 导入导出 |
| **Phase 2** | 笔记系统 | 文件夹管理、今日笔记、Tiptap 富文本编辑、附件上传 |
| **Phase 3** | 高级功能 | 日历视图统计、时间轴、模板系统、考试与目标、全局搜索 |
| **Phase 4** | AI 增强 | AI 生成卡片、AI 问答、PDF 解析、AI 导师 |
| **Phase 5** | 社交与扩展 | 好友邀请、牌组分享、多人协作、移动端适配 |

---

## 十二、验证方案

1. `npm run dev` 启动应用，浏览器访问 `http://localhost:5173`
2. 验证流程：
   - 左侧导航切换各页面 → 路由正常
   - 创建文件夹 → 创建笔记 → 富文本编辑 → 保存为今日笔记
   - 创建牌组 → 手动添加卡片 → 从模板创建卡片 → 从笔记转换卡片
   - 进入复习 → 4 级按钮判题 → 间隔时间正确更新
   - 查看日历热力图 → 查看时间轴 → 数据面板统计正确
   - 导出牌组 JSON → 删除牌组 → 重新导入验证
3. API 测试：使用 curl 或 Postman 测试所有端点
