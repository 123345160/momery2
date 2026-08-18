# 记忆学习平台 — 前端搭建技术文档

> 本文档为前端工程搭建规范，不包含具体代码实现。聚焦项目初始化、工程配置、组件架构、路由设计、状态管理、样式体系与开发工作流。
>
> 工作副本（主）：决策背景与历史版本见 ../word/ 归档；重大变更回写归档。

---

## 一、技术选型与版本

### 1.1 技术选型

1. **核心框架｜Vue 3 (Composition API)｜^3.4**
2. **类型系统｜TypeScript｜^5.4**
3. **构建工具｜Vite｜^5**
4. **路由｜Vue Router｜^4**
5. **状态管理｜Pinia｜^2**
6. **HTTP 客户端｜Axios｜^1**
7. **Markdown 渲染｜marked｜^9**
8. **代码高亮｜highlight.js｜^11**
9. **富文本编辑器｜Tiptap｜^2**
10. **CSS 方案｜Scoped CSS + CSS Variables｜—**
11. **图标方案｜内联 SVG 组件｜—**

### 1.2 不引入的依赖（禁止清单）

- **UI 组件库 (Element Plus / Naive UI 等)**：禁止引入
- **Tailwind CSS / UnoCSS**：禁止引入
- **图表库 (ECharts / Chart.js)**：禁止引入
- **zod / joi**：禁止引入

---

## 二、项目初始化规范

### 2.1 脚手架方式

使用 `npm create vite@latest` 创建，选择 Vue + TypeScript 模板，后续按目录结构手动扩展。

### 2.2 初始目录结构（创建时最小集）

```
client/
├── index.html                     # Vite 入口 HTML
├── package.json                   # 依赖与脚本
├── vite.config.ts                 # Vite 配置
├── tsconfig.json                  # TypeScript 配置（应用代码）
├── tsconfig.node.json             # TypeScript 配置（Vite/Node 端）
├── env.d.ts                       # 环境类型声明（.vue 模块等）
└── src/
    ├── main.ts                    # 应用入口：createApp + use(router) + use(pinia) + mount
    ├── App.vue                    # 根组件：布局壳（侧边栏 + 顶部栏 + RouterView）
    └── styles/
        └── variables.css          # 全局 CSS 变量
```

### 2.3 Vite 配置要点 (`vite.config.ts`)

- **`plugins`**：`[vue()]`
- **`resolve.alias`**：`@` → `./src`，便于组件内 `import X from '@/components/...'`
- **`server.port`**：5173（默认）
- **`server.proxy`**：`/api` → `http://localhost:3000`，开发时透明代理后端请求
- **`build.outDir`**：`dist`
- **`build.assetsDir`**：`assets`

### 2.4 TypeScript 配置要点 (`tsconfig.json`)

- **`compilerOptions.target`**：`ESNext`
- **`compilerOptions.module`**：`ESNext`
- **`compilerOptions.moduleResolution`**：`bundler`（Vite 推荐）
- **`compilerOptions.strict`**：`true`
- **`compilerOptions.jsx`**：`preserve`
- **`compilerOptions.paths`**：`{ "@/*": ["./src/*"] }`（配合 Vite alias）
- **`include`**：`src/**/*.ts`, `src/**/*.d.ts`, `src/**/*.vue`, `env.d.ts`

---

## 三、组件架构

### 3.1 组件分类原则

> **与产品文档的关系**：页面布局的视觉设计（区域划分、侧边栏 240px、顶部栏 52px）定义在 [DESIGN.md](DESIGN.md) 第二章「页面布局架构」。本文档只负责该布局的**组件实现映射**（哪些组件、什么 Props/Events、哪些 CSS 变量控制尺寸），不重复画布局图。

```
src/components/
├── layout/          # 布局壳组件 — 仅定义页面骨架，不含业务逻辑
├── deck/            # 牌组与卡片相关组件
├── review/          # 复习交互组件
├── stats/           # 统计可视化组件
├── note/            # 笔记系统组件
└── common/          # 通用基础组件（弹窗、按钮、图标等）
```

### 3.2 组件树（含 Props / Events 约定）

#### 3.2.1 布局类

- **App.vue** — 子组件：LayoutSidebar.vue、LayoutTopBar.vue、`<RouterView />`
- **LayoutSidebar.vue** — Props: (无 — 全局布局组件不需要外部传参)；State: activeNav (当前选中导航), filterCategory (当前分类筛选)；子组件：SearchBar.vue、CategoryFilter.vue
- **SearchBar.vue** — Events: @search(query: string) — 触发全局搜索
- **CategoryFilter.vue** — Props: options: FilterOption[]；Events: @change(category: string) —— 类别枚举：全部 / 文件夹 / 标签 / PDF；筛选实现（文件夹/PDF 走后端参数、标签本地过滤）与 PDF 口径见 DESIGN §4.1
- **LayoutTopBar.vue** — Props: tabs: TabItem[] (当前模块的子标签列表)；State: activeTab (当前激活子标签)；Slots: #actions (右侧操作区插槽)；Events: @tab-change(tabKey: string)；子组件：SubTabs.vue、CreateButton.vue、CalendarBar.vue
- **SubTabs.vue** — Props: tabs: TabItem[], activeTab: string；Events: @select(key: string)
- **CreateButton.vue** — Props: menuItems: MenuItem[] (新建类型下拉菜单)；Events: @create(type: 'deck' | 'note' | 'folder')
- **CalendarBar.vue** — State: selectedDate: string；Events: @date-change(date: string)
- **`<RouterView />`** — 主体内容区，所有页面在此渲染；Props: (无)

#### 3.2.2 牌组类

- **CardsHome.vue** — 子组件：DeckGrid.vue
- **DeckGrid.vue** — Props: decks: Deck[], loading: boolean；Events: @deck-click(deckId: number), @deck-delete(deckId: number)；子组件：DeckCard.vue
- **DeckCard.vue**（v-for）— Props: deck: Deck；Computed: cardCount, dueCount, progressPercent；Events: @click, @contextmenu
- **DeckDetail.vue** — 子组件：CardList.vue、CardCreateForm.vue

#### 3.2.3 卡片类

- **CardList.vue** — Props: cards: Card[], deckName: string；Events: @edit(cardId: number), @delete(cardId: number)
- **CardCreateForm.vue** — Props: visible: boolean, templates: Template[], editCard?: Card；Events: @submit(data: CardFormData), @cancel；State: front (string), back (string), previewMode ('edit' | 'preview' | 'split')；子组件：MarkdownPreview.vue
- **MarkdownPreview.vue**（内联子组件 — 渲染 marked 输出）

#### 3.2.4 复习类

- **ReviewSession.vue** — 子组件：ReviewProgress.vue、ReviewCard.vue
- **ReviewProgress.vue**（进度条 + 剩余卡片数）
- **ReviewCard.vue** — Props: card: Card, currentIndex: number, totalCount: number；State: showAnswer: boolean；Events: @rate(result: 'forgot' | 'hard' | 'good' | 'easy')；子组件：MarkdownPreview.vue
- **MarkdownPreview.vue**（复用）

#### 3.2.5 统计类

- **CardStats.vue** — 子组件：StatsSummary.vue、CalendarHeatmap.vue、TimelineView.vue
- **StatsSummary.vue** — Props: stats: StatsOverview；展示总卡片数 / 已掌握 / 待复习 / 今日待复习 / 正确率 / 连续天数
- **CalendarHeatmap.vue** — Props: data: CalendarDay[], year: number, month: number；Events: @day-click(date: string)；月历网格，每格按 reviewCount 着色（0-4 层深浅）
- **TimelineView.vue** — Props: items: TimelineItem[]；Events: @item-click(item: TimelineItem)；纵向时间线，展示笔记/卡片创建 + 复习记录

#### 3.2.6 笔记类

- **NotesList.vue** — 子组件：FolderTree.vue、NoteCard.vue
- **FolderTree.vue** — Props: tree: FolderNode[], selectedFolder: number | null；Events: @folder-select(id: number), @folder-create(name: string), @folder-delete(id: number)
- **NoteCard.vue**（v-for）— Props: note: Note, folderName: string；Events: @click, @move-to-folder(noteId, folderId)
- **TodayNotes.vue** — 子组件：TodayHeader.vue、NoteCard.vue
- **TodayHeader.vue**（日期 + 快速创建按钮）
- **NoteCard.vue**（v-for — 复用）
- **NoteEditor.vue** — Props: noteId: number | null (null = 新建)；State: title, content (Tiptap JSON), isToday, tags；Events: @save, @convert-to-cards；子组件：TiptapEditor.vue
- **TiptapEditor.vue** — Props: modelValue: object, editable: boolean；Events: @update:modelValue

#### 3.2.7 公共类

- **Modal.vue** — Props: visible: boolean, title: string, width: string, closable: boolean；Slots: #default (内容), #footer (底部按钮)；Events: @close
- **ImportModal.vue** — State: file: File | null, preview: ImportPreview | null, loading: boolean；Events: @import(data)
- **ExportModal.vue** — Props: decks: Deck[]；Events: @export(deckId: number | 'all')
- **TemplateModal.vue** — Props: templates: Template[]；Events: @select(template: Template)

### 3.3 组件设计规范

- **Props 优先**：父传子用 Props，子传父用 Events，跨组件共享用 Pinia Store
- **v-model 双绑**：表单类组件统一使用 `defineModel`，保持 Vue 3.4+ 新语法一致性
- **Slots 粒度**：每个组件最多 2-3 个具名插槽，避免过度抽象
- **单文件组件**：所有组件保持在 200 行以内，超出则拆分子组件
- **无副作用**：组件不在 `setup` 外执行副作用，数据获取集中在页面组件的 `onMounted` 或 Store 的 action

---

## 四、路由设计

### 4.1 路由表定义

1. **`/`**（home / DashboardHome）—— 首页总览仪表盘；meta.title: 首页；meta.tabGroup: —
2. **`/cards`**（cards / CardsHome）—— 牌组网格页；meta.title: 记忆卡片；meta.tabGroup: cards
3. **`/cards/stats`**（card-stats / CardStats）—— 统计视图页；meta.title: 卡片统计；meta.tabGroup: cards
4. **`/cards/exam`**（exam-goals / ExamGoals）—— 考试目标页；meta.title: 考试与目标；meta.tabGroup: cards
5. **`/cards/deck/:deckId`**（deck-detail / DeckDetail）—— 牌组内卡片列表；meta.title: 牌组详情；meta.tabGroup: —
6. **`/cards/review/:deckId`**（review / ReviewSession）—— 复习模式全屏；meta.title: 复习；meta.tabGroup: —
7. **`/notes`**（notes / NotesList）—— 文件夹+笔记列表；meta.title: 文档；meta.tabGroup: notes
8. **`/notes/today`**（today-notes / TodayNotes）—— 今日临时笔记；meta.title: 今日笔记；meta.tabGroup: notes
9. **`/notes/:id`**（note-editor / NoteEditor）—— 笔记编辑器；meta.title: 编辑笔记；meta.tabGroup: —
10. **`/search`**（search / SearchView）—— 全局搜索结果；meta.title: 搜索；meta.tabGroup: —
11. **`/settings`**（settings / Settings）—— 个性化设置；meta.title: 设置；meta.tabGroup: —

### 4.2 路由结构

采用**扁平路由**结构（不嵌套 `children`），`App.vue` 中 Layout 组件固定渲染，`<RouterView>` 替换中间内容区。理由：

- 侧边栏和顶部栏不随路由变化，不需要嵌套布局
- 扁平路由使路由守卫和 meta 管理更直观
- `meta.tabGroup` 字段控制顶部 SubTabs 的渲染，而非靠路由嵌套推断

### 4.3 路由守卫

| 守卫 | 用途 | 当前行为 |
|------|------|---------|
| `beforeEach` (全局) | 设置 `document.title` | 读取 `to.meta.title` 拼接到页面标题 |
| `beforeEach` (全局) | 权限校验占位 | 直接 `next()`，M2 启用认证检查 |

### 4.4 路由与侧边栏联动

侧边栏通过当前路由 `path` 推断激活项：
- 以 `/cards` 开头 → 高亮「记忆卡片」
- 以 `/notes` 开头 → 高亮「文档与文件夹」
- 精确匹配 `/` → 无高亮（仪表盘模式）

---

## 五、状态管理 (Pinia)

### 5.1 Store 划分原则

每个 Store 对应一个**业务域**，不按页面划分：

| Store | 文件 | 职责 | 持久化 |
|-------|------|------|--------|
| `useDeckStore` | `stores/deck.ts` | 牌组列表、当前牌组、CRUD 操作 | 否（数据来自服务端） |
| `useReviewStore` | `stores/review.ts` | 当前复习队列、进度、提交结果 | 否 |
| `useNoteStore` | `stores/note.ts` | 笔记列表、当前笔记、文件夹树 | 否 |
| `useStatsStore` | `stores/stats.ts` | 统计概览、日历数据、时间轴 | 否 |
| `useUIStore` | `stores/ui.ts` | 侧边栏折叠状态、当前路由上下文、toast 队列 | 是 (localStorage) |

### 5.2 各 Store 状态与操作

#### 5.2.1 useDeckStore

**state**：
- decks: Deck[]
- currentDeck: Deck | null
- loading: boolean

**actions**：
- fetchDecks(params?: DeckQueryParams) → GET /api/decks
- fetchDeck(id) → GET /api/decks/:id
- createDeck(data) → POST /api/decks
- updateDeck(id, data) → PUT /api/decks/:id
- deleteDeck(id) → DELETE /api/decks/:id

**getters**：
- dueCountByDeck(id) — 到期卡片数
- totalCards — 全部卡片总数

#### 5.2.2 useReviewStore

**state**：
- queue: Card[] # 当前复习队列
- currentIndex: number # 当前位置
- sessionStats: { reviewed, forgot, hard, good, easy }

**actions**：
- fetchDueCards(deckId) → GET /api/decks/:deckId/due
- submitReview(cardId, result) → POST /api/cards/:id/review
- nextCard() → currentIndex++（若结束则统计结算）

**getters**：
- currentCard: Card | null
- progress: { done, total, percent }
- isSessionEnd: boolean

#### 5.2.3 useNoteStore

**state**：
- notes: Note[]
- currentNote: Note | null
- folderTree: FolderNode[]
- loading: boolean

**actions**：
- fetchNotes(folderId?)
- fetchTodayNotes()
- fetchNote(id)
- saveNote(data)
- deleteNote(id)
- moveNoteToFolder(noteId, folderId)
- convertToCards(noteId)
- uploadAttachment(noteId, file) → POST /api/notes/:id/attachments
- fetchFolderTree()
- createFolder(name, parentId?)
- renameFolder(id, name) → PUT /api/folders/:id
- deleteFolder(id)

**getters**：
- todayNotes — 过滤 is_today=1 的笔记
- noteCountByFolder

#### 5.2.4 useUIStore

**state**：
- sidebarCollapsed: boolean
- currentTabGroup: 'cards' | 'notes' | null
- toasts: ToastItem[]

**actions**：
- toggleSidebar()
- setTabGroup(group)
- showToast(message, type)
- dismissToast(id)

#### 5.2.5 useStatsStore

**state**：
- overview: StatsOverview | null
- calendarData: { year: number, month: number, days: CalendarDay[] }
- timeline: TimelineItem[]
- loading: boolean

**actions**：
- fetchOverview() → GET /api/stats/overview
- fetchCalendar(year, month) → GET /api/stats/calendar
- fetchTimeline(params?) → GET /api/stats/timeline
- fetchDeckStats(deckId) → GET /api/stats/deck/:id

**getters**：
- masteredCount — 已掌握卡片数（口径见立项 R11：repetitions>=3 且 interval>=30240 分钟）
- dueToday — 今日待复习数

### 5.3 Store 使用规范

- 页面组件只调用 Store 的 **actions**，不直接操作 state
- 组件通过 **getters** 派生数据，不在组件内二次计算
- Store 之间不互相引用（如需要跨域数据，在页面组件中组合调用）
- API 调用封装在 `client/src/api/` 目录，Store action 调用 api 函数，不在 Store 内直接使用 axios

---

## 六、API 集成层

### 6.1 分层结构

```
视图组件 (Views)
    │  调用 Store actions
    ▼
Pinia Store (stores/)
    │  调用 api 模块函数
    ▼
API 模块 (api/*.ts)
    │  使用 client 实例
    ▼
Axios 客户端 (api/client.ts)
    │  baseURL + 拦截器 + 超时
    ▼
后端 /api/*
```

### 6.2 Axios 客户端配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `baseURL` | `/api` | Vite proxy 转发到 `localhost:3000` |
| `timeout` | 10000 ms | 超时触发全局错误提示 |
| `headers['Content-Type']` | `application/json` | 默认 JSON |

#### 6.2.1 响应拦截器行为

- `code === 0` → 提取 `data` 字段返回给调用方
- `code !== 0` → `Promise.reject(new Error(message))`，统一 toast 提示
- 网络错误（无响应）→ toast「网络连接失败，请检查网络」
- 超时 → toast「请求超时，请稍后重试」

#### 6.2.2 请求拦截器行为

- V1.0/M1：无额外 header
- M2：注入 `Authorization: Bearer <token>`

### 6.3 API 模块函数签名

每个 `api/*.ts` 文件导出纯函数，返回 Promise：

1. **`api/decks.ts`**：
   - getDecks(params?: DeckQueryParams): Promise<Deck[]>
   - getDeck(id: number): Promise<Deck>
   - createDeck(data: CreateDeckDto): Promise<Deck>
   - updateDeck(id: number, data: UpdateDeckDto): Promise<Deck>
   - deleteDeck(id: number): Promise<void>

2. **`api/cards.ts`**：
   - getCards(deckId: number): Promise<Card[]>
   - createCard(deckId: number, data: CreateCardDto): Promise<Card>
   - createCardBatch(deckId: number, data: CreateCardDto[]): Promise<Card[]>
   - updateCard(id: number, data: UpdateCardDto): Promise<Card>
   - deleteCard(id: number): Promise<void>

3. **`api/review.ts`**：
   - getDueCards(deckId: number): Promise<Card[]>
   - submitReview(cardId: number, result: ReviewResult): Promise<Card>
   - getReviewProgress(deckId: number): Promise<ReviewProgress>

4. **`api/notes.ts`**：
   - getNotes(params?: NoteQueryParams): Promise<Note[]>
   - getTodayNotes(): Promise<Note[]>
   - getNote(id: number): Promise<Note>
   - createNote(data: CreateNoteDto): Promise<Note>
   - updateNote(id: number, data: UpdateNoteDto): Promise<Note>
   - deleteNote(id: number): Promise<void>
   - uploadAttachment(noteId: number, file: File): Promise<Attachment>
   - convertToCards(noteId: number): Promise<Card[]>

5. **`api/folders.ts`**：
   - getFolderTree(): Promise<FolderNode[]>
   - createFolder(data: CreateFolderDto): Promise<FolderNode>
   - updateFolder(id: number, data: UpdateFolderDto): Promise<FolderNode>
   - deleteFolder(id: number): Promise<void>

6. **`api/stats.ts`**：
   - getOverview(): Promise<StatsOverview>
   - getCalendar(year: number, month: number): Promise<CalendarDay[]>
   - getTimeline(params?: TimelineParams): Promise<TimelineItem[]>
   - getDeckStats(deckId: number): Promise<DeckStats>

7. **`api/templates.ts`**：
   - getTemplates(): Promise<Template[]>
   - createTemplate(data: CreateTemplateDto): Promise<Template>
   - deleteTemplate(id: number): Promise<void>（设置页模板管理调用；后端 `40903` 保护默认模板）

8. **`api/exams.ts`**：
   - getExams(params?: { status?: 'active' | 'completed' }): Promise<Exam[]>
   - createExam(data: CreateExamDto): Promise<Exam>
   - updateExam(id: number, data: UpdateExamDto): Promise<Exam>
   - deleteExam(id: number): Promise<void>

9. **`api/search.ts`**：
   - search(q: string, category?: 'decks' | 'notes' | 'cards' | 'all'): Promise<SearchResult>

10. **`api/importExport.ts`**：
   - importJson(data: ImportJsonDto): Promise<ImportSummary>
   - exportDeck(deckId: number): Promise<Blob>
   - exportAll(): Promise<Blob>

---

## 七、样式体系

### 7.1 设计令牌 (Design Tokens)

统一在 `src/styles/variables.css` 中定义，作为全局 CSS 变量：

```
:root {
  /* 布局尺寸 */
  --sidebar-width: 240px;
  --topbar-height: 52px;

  /* 背景色 */
  --bg-primary: #ffffff;       /* 页面主背景 */
  --bg-secondary: #f5f6f8;     /* 内容区浅灰底 */
  --bg-sidebar: #fafbfc;       /* 侧边栏背景 */
  --bg-card: #ffffff;          /* 卡片底色 */
  --bg-hover: #f0f2f5;         /* 悬停态背景 */

  /* 文字色 */
  --text-primary: #1a1a1a;     /* 主标题/正文 */
  --text-secondary: #666666;   /* 辅助说明 */
  --text-muted: #999999;       /* 占位/禁用/时间戳 */

  /* 边框与阴影 */
  --border-color: #e8e8e8;     /* 分割线/卡片边框 */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.10);

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* 强调色 — 低饱和度蓝，仅用于主操作按钮 / 链接 / 选中态 */
  --accent: #4a90d9;
  --accent-hover: #3a7bc8;
  --accent-light: #e8f0fb;

  /* 功能色 — 复习结果 */
  --color-forgot: #e07070;     /* 完全忘记 — 浅红 */
  --color-hard: #e0a060;       /* 困难 — 浅橙 */
  --color-good: #70b070;       /* 正确 — 浅绿 */
  --color-easy: #60a0d0;       /* 简单 — 浅蓝 */

  /* 日历热力图密度色阶 */
  --heat-0: #f0f0f0;           /* 无复习 */
  --heat-1: #d6e8d0;           /* 少量 */
  --heat-2: #a3d19b;           /* 中等 */
  --heat-3: #6bb566;           /* 较多 */
  --heat-4: #4a9440;           /* 大量 */

  /* 字体 */
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-mono: "SF Mono", "Fira Code", "Consolas", monospace;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
}
```

### 7.2 文件组织

```
client/src/styles/
├── variables.css          # 全局 CSS 变量（上述定义）
├── reset.css              # 浏览器默认样式重置（margin/padding/box-sizing）
├── base.css               # 基础元素样式（body/html/a/button/input 默认态）
├── layout.css             # 布局相关（侧边栏/顶部栏/内容区的 flex 布局）
├── typography.css         # 排版（标题层级、markdown 渲染区、代码块）
└── utilities.css          # 工具类（.text-muted, .flex-center, .truncate 等极少量）
```

以上文件在 `main.ts` 中按序全局引入。

### 7.3 组件级样式规范

- 全部使用 `<style scoped>`，不使用 CSS Modules
- 类名遵循 **BEM 风格**：`.block__element--modifier`
  - 示例：`.review-card__header` / `.review-card__answer--visible` / `.stats-panel__metric-value`
- 禁止使用 `!important`
- 禁止内联样式（除动态计算的尺寸/位置）
- 颜色、间距、字号必须引用 CSS 变量：`color: var(--text-primary)`，不写死色值
- Markdown 渲染区（`MarkdownPreview` 的内部 HTML）用 `:deep()` 穿透 scoped 设置样式

### 7.4 响应式策略（V1.0/M1）

- 固定宽度布局：侧边栏 240px，内容区自适应 `flex: 1`
- 最小屏幕宽度：1024px（低于此宽度不保证布局完整）
- M3 再做移动端适配

---

## 八、开发工作流

### 8.1 启动命令

```
npm run dev              # 同时启动前端 (5173) + 后端 (3000)
npm run dev:client       # 仅启动前端
npm run dev:server       # 仅启动后端
npm run build            # 前端生产构建 → client/dist/
npm run preview          # 预览生产构建
```

### 8.2 新增页面流程

1. 在 `src/views/` 创建页面 `*.vue`
2. 在 `src/router/index.ts` 注册路由
3. 如需 Store，在 `src/stores/` 创建对应 Store 文件
4. 如需 API，在 `src/api/` 创建对应模块，添加函数签名
5. 在侧边栏或顶栏添加导航入口（如属于已有模块则跳过）

### 8.3 新增组件流程

1. 确定所属分类（layout / deck / review / stats / note / common）
2. 创建 `*.vue` 文件，定义 Props 和 Events
3. 如有跨组件共享状态，提取到对应 Store
4. 在父组件中引用并注册

### 8.4 类型定义规范

所有共享 TypeScript 类型集中在 `src/types/index.ts`：

```
数据模型类型：Deck, Card, Note, Folder, FolderNode, Template, Exam,
              Attachment, ReviewLog, CalendarDay, TimelineItem
DTO 类型：     CreateDeckDto, UpdateDeckDto, CreateCardDto, CreateExamDto,
              UpdateExamDto, ReviewResult...
API 响应类型：  ApiResponse<T>, PaginatedData<T>, SearchResult
查询参数类型： DeckQueryParams, NoteQueryParams, TimelineParams
组件 Props 类型：在组件文件中直接定义 interface（不导出，除非复用）
```

**字段命名约定**：后端 JSON 字段为数据库 snake_case（如 `next_review`、`ease_factor`），前端 TS 类型字段与之同名直接沿用（不做映射转换）；响应拦截器只解包 `data`，不重命名字段。

### 8.5 Mock 数据方案（后端未就绪时）

在 `client/src/api/` 同级创建 `mock/` 目录，包含对应模块的 mock 数据：
- 每个 api 模块导出同名的硬编码数据数组
- 开发早期前端可独立运行，后端 API 就绪后切换到真实请求
- Mock 开关通过 `vite.config.ts` 中的环境变量 `VITE_USE_MOCK` 控制

---

## 九、验收标准

### 9.1 工程验收

- [ ] `npm create vite@latest` 初始化成功，`npm run dev` 能在 5173 端口启动
- [ ] TypeScript 严格模式 `strict: true`，`vue-tsc` 类型检查零错误
- [ ] `npm run build` 构建成功，产物 `dist/` 目录结构完整
- [ ] Vite proxy 正确转发 `/api` 请求到后端 3000 端口

### 9.2 布局验收

- [ ] 侧边栏 240px 固定宽度，内容区自适应剩余宽度
- [ ] 顶部栏 52px 高度，stick 在页面顶部
- [ ] 侧边栏导航点击切换路由，对应区域高亮
- [ ] 顶部子标签随路由 meta.tabGroup 显示/隐藏
- [ ] 浅色主题 CSS 变量全部生效，无硬编码色值残留

### 9.3 组件验收

- [ ] 每个组件 `<script setup lang="ts">` 格式正确
- [ ] Props 有 TypeScript 类型声明
- [ ] 样式使用 `<style scoped>`，类名符合 BEM
- [ ] 组件不超过 200 行

### 9.4 状态管理验收

- [ ] 5 个 Pinia Store 结构完整（state / getters / actions）
- [ ] API 调用在 api 模块层，Store 不直接使用 axios
- [ ] UI Store 的 sidebarCollapsed 持久化到 localStorage
