# 记忆学习平台 — 后端架构设计文档

> 定义后端分层架构、模块职责、API 规范、中间件体系、错误处理、日志策略与运维标准。不包含具体实现代码。
>
> 工作副本（主）：决策背景与历史版本见 ../word/ 归档；重大变更回写归档。

---

## 一、技术选型与版本

### 1.1 技术选型清单

- **运行时**：Node.js ^20 LTS
- **语言**：TypeScript ^5.4（严格模式）
- **Web 框架**：Express ^4
- **数据库驱动**：better-sqlite3 ^11
- **日志**：winston ^3
- **配置管理**：dotenv ^16
- **进程管理 (开发)**：tsx ^4
- **并发启动 (开发)**：concurrently ^8
- **文件上传**：multer ^1

### 1.2 不引入的依赖（禁止清单）

- **ORM (Prisma / TypeORM / Drizzle)**：禁止引入
- **zod / joi (参数校验库)**：禁止引入
- **express-async-errors**：禁止引入
- **express-validator**：禁止引入
- **bcrypt / jsonwebtoken**：禁止引入（M2 引入）
- **Redis**：禁止引入（M3 再评估）

---

## 二、分层架构

### 2.1 四层模型

```
┌─────────────────────────────────────────────────────────┐
│                     请求进入                              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  中间件层 (middlewares/)                                  │
│  · requestLogger  — 请求日志                             │
│  · authGuard      — 权限占位（M2 启用）                   │
│  · errorHandler   — 全局异常兜底                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  路由层 (routes/)                                         │
│  职责：路径注册 + HTTP 方法映射                            │
│  规则：一行 router.get(path, controller.handler)，        │
│        不写参数校验、不写业务逻辑、不操作数据库              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  控制器层 (controllers/)                                  │
│  职责：参数提取 + 格式校验 + 调用服务层 + 组装响应           │
│  规则：不写 SQL、不调数据库、不做复杂 if-else 业务判断      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  服务层 (services/)                                       │
│  职责：核心业务逻辑（SM-2 算法、笔记转卡片、数据编排）       │
│  规则：调用 repository、不写 SQL、不碰 req/res             │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  数据访问层 (repositories/)                                │
│  职责：纯 SQL 操作、参数化查询、返回数据对象                 │
│  规则：不含业务逻辑、不含参数校验、一个 repo 对应一张主表     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  数据库层 (db/)                                           │
│  · connection.ts — SQLite 单例连接                        │
│  · migrate.ts    — 启动时幂等建表 + 预置数据               │
└─────────────────────────────────────────────────────────┘
```

### 2.2 调用链示例：复习提交

```
POST /api/cards/42/review  { result: "good" }
  │
  ├─ middlewares/requestLogger.ts      记录 method + url + ip
  ├─ middlewares/authGuard.ts          (V1.0/M1: 直接 next)
  │
  ├─ routes/review.ts                  router.post('/cards/:id/review', reviewController.submit)
  │
  ├─ controllers/reviewController.ts   submitReview(req, res)
  │   ├─ 提取 req.params.id → cardId
  │   ├─ 提取 req.body.result → 校验值在 ['forgot','hard','good','easy']
  │   ├─ 调用 reviewService.submit(cardId, result)
  │   └─ success(res, updatedCard)
  │
  ├─ services/reviewService.ts         submit(cardId, result)
  │   ├─ 调用 cardRepo.getById(cardId) → 获取当前卡片状态
  │   ├─ 调用 sm2.ts → calcNextState(currentCard, result) → 计算新状态
  │   ├─ 调用 cardRepo.updateReviewState(cardId, newState)
  │   ├─ 调用 reviewLogRepo.insert({ cardId, deckId, result })
  │   └─ 返回更新后的卡片对象
  │
  └─ repositories/
      ├─ cardRepo.ts                   updateReviewState(id, { ease_factor, interval, ... })
      └─ reviewLogRepo.ts             insert({ cardId, deckId, result })
```

### 2.3 分层违规红线

| 层 | 禁止行为 |
|----|---------|
| routes | 写参数校验逻辑、写 SQL、访问数据库 |
| controllers | 拼接 SQL、访问 req/res 之外的 IO、写复杂业务判断 |
| services | 访问 req/res、直接写 SQL |
| repositories | 写业务逻辑、校验参数、调用其他 repository |
| middlewares | 操作业务数据、修改响应体结构 |

---

## 三、目录结构

```
server/
├── package.json
├── tsconfig.json
├── .env.example                     # 环境变量模板（提交到 git）
├── .env                             # 真实配置（.gitignore）
└── src/
    ├── index.ts                     # 启动入口：加载配置 → 连接数据库 → 执行迁移 → 启动监听
    ├── app.ts                       # Express 应用组装：注册中间件 → 注册路由 → 注册错误处理
    ├── config.ts                    # 配置中心：从 .env 读取，默认值兜底，唯一配置出口
    ├── types/
    │   └── index.ts                 # 后端 TypeScript 类型定义
    │
    ├── db/
    │   ├── connection.ts            # SQLite 单例连接：getDb() 返回 Database 实例
    │   └── migrate.ts               # 建表迁移：按依赖顺序执行 8 张表 DDL + 预置数据
    │
    ├── middlewares/
    │   ├── requestLogger.ts         # 请求日志：method + url + status + duration
    │   ├── authGuard.ts             # 权限占位：直接 next()，M2 启用 JWT 校验
    │   └── errorHandler.ts          # 全局异常处理：AppError → 业务错误码，未知异常 → 500+脱敏
    │
    ├── routes/
    │   ├── index.ts                 # 路由汇总：app.use('/api', router) 挂载所有子路由
    │   ├── decks.ts                 # /api/decks
    │   ├── cards.ts                 # /api/decks/:deckId/cards  + /api/cards/:id
    │   ├── review.ts                # /api/decks/:deckId/due  + /api/cards/:id/review
    │   ├── notes.ts                 # /api/notes  + /api/notes/today  + /api/notes/:id/...
    │   ├── folders.ts              # /api/folders
    │   ├── stats.ts                # /api/stats/overview  + /api/stats/calendar  + ...
    │   ├── templates.ts            # /api/templates
    │   ├── exams.ts                # /api/exams
    │   ├── search.ts               # /api/search
    │   └── importExport.ts         # /api/import/json  + /api/export/...
    │
    ├── controllers/
    │   ├── deckController.ts
    │   ├── cardController.ts
    │   ├── reviewController.ts
    │   ├── noteController.ts
    │   ├── folderController.ts
    │   ├── statsController.ts
    │   ├── templateController.ts
    │   ├── examController.ts
    │   ├── searchController.ts
    │   └── importExportController.ts
    │
    ├── services/
    │   ├── deckService.ts           # 牌组业务：CRUD + 关联查询
    │   ├── cardService.ts           # 卡片业务：CRUD + 批量创建 + SM-2 初始化
    │   ├── reviewService.ts         # 复习业务：到期筛选 + SM-2 计算 + 记录写入（事务）
    │   ├── noteService.ts           # 笔记业务：CRUD + 转卡片 + 附件处理
    │   ├── folderService.ts         # 文件夹业务：树构建 + 删除校验
    │   ├── statsService.ts          # 统计业务：概览聚合 + 日历数据 + 时间轴
    │   ├── templateService.ts       # 模板业务：CRUD + 默认模板保护
    │   ├── examService.ts           # 考试目标业务：CRUD + 状态流转 + 进度计算
    │   ├── searchService.ts         # 搜索业务：跨牌组/笔记关键词聚合查询
    │   └── importExportService.ts   # 导入导出：JSON 序列化/反序列化 + 批量写入
    │
    ├── repositories/
    │   ├── deckRepo.ts
    │   ├── cardRepo.ts
    │   ├── reviewLogRepo.ts
    │   ├── noteRepo.ts
    │   ├── noteAttachmentRepo.ts
    │   ├── folderRepo.ts
    │   ├── templateRepo.ts
    │   └── examRepo.ts
    │
    └── utils/
        ├── logger.ts                # winston 日志配置
        ├── response.ts              # success() / created() / fail() 统一响应
        ├── AppError.ts              # 自定义业务异常类
        └── sm2.ts                   # SM-2 间隔重复算法
```

---

## 四、启动流程

### 4.1 启动时序

```
index.ts 启动
  │
  ├─ 1. 加载 config.ts        # dotenv.config() 读取 .env，合并默认值
  ├─ 2. db/connection.ts      # new Database(config.dbPath)，开启 WAL 模式 + 外键约束
  ├─ 3. db/migrate.ts         # 幂等建表 8 张 + 预置默认模板
  ├─ 4. 引入 app.ts           # 组装 Express 应用（中间件 + 路由）
  ├─ 5. app.listen(port)      # 监听端口
  └─ 6. logger.info(...)      # 输出启动信息
```

### 4.2 Express 应用组装 (`app.ts`)

```
创建 Express 实例
  │
  ├─ 全局中间件
  │   ├─ express.json()               # JSON body 解析
  │   ├─ express.urlencoded()         # URL 编码 body 解析
  │   ├─ cors({ origin: config.corsOrigin })  # 跨域
  │   └─ requestLogger                # 请求日志
  │
  ├─ 健康检查（中间件之前）
  │   └─ GET /api/health → { code: 0, message: "ok", data: { status, uptime, db } }
  │
  ├─ 路由挂载
  │   └─ app.use('/api', authGuard, router)  # 所有 /api 路由统一走 authGuard
  │       ├─ /api/decks
  │       ├─ /api/decks/:deckId/cards
  │       ├─ /api/cards
  │       ├─ /api/notes
  │       ├─ /api/folders
  │       ├─ /api/stats
  │       ├─ /api/templates
  │       ├─ /api/exams
  │       ├─ /api/search
  │       └─ /api/import  +  /api/export
  │
  └─ 错误处理（最后注册，Express 4 通过参数数量识别）
      └─ errorHandler(err, req, res, next)
```

---

## 五、配置中心

### 5.1 配置项定义

- **`port`**：服务监听端口 —— 环境变量：`PORT` —— 默认值：`3000`
- **`dbPath`**：SQLite 文件路径 —— 环境变量：`DB_PATH` —— 默认值：`./data/app.db`
- **`uploadDir`**：文件上传目录 —— 环境变量：`UPLOAD_DIR` —— 默认值：`./uploads`
- **`corsOrigin`**：允许的跨域源 —— 环境变量：`CORS_ORIGIN` —— 默认值：`http://localhost:5173`
- **`logLevel`**：日志级别 —— 环境变量：`LOG_LEVEL` —— 默认值：`info` (dev) / `warn` (prod)
- **`nodeEnv`**：运行环境 —— 环境变量：`NODE_ENV` —— 默认值：`development`

### 5.2 配置纪律

- **唯一出口**：任何模块需要配置时 `import { config } from '../config'`，禁止直接读 `process.env`
- **模板提交**：`server/.env.example` 提交到 Git，真实 `.env` 在 `.gitignore` 中
- **启动校验**：启动时检查必要配置项（`DB_PATH` 可写、`UPLOAD_DIR` 存在），失败时提前终止并输出明确错误

---

## 六、API 规范

### 6.1 路径命名

| 规则 | 示例 | 说明 |
|------|------|------|
| 前缀 `/api` | `/api/decks` | 所有业务接口统一前缀 |
| 资源名用复数 | `/api/decks` | RESTful 惯例 |
| 子资源嵌套 | `/api/decks/:deckId/cards` | 表示从属关系 |
| 动作用 HTTP 方法 | `POST /api/cards/:id/review` | 自定义动作用动词路径 |
| kebab-case 多词路径 | `/api/decks/:deckId/due` | 不用驼峰或下划线；牌组参数名统一 `:deckId` |

### 6.2 完整端点清单

#### 6.2.1 健康检查

- `GET /api/health` — 服务健康状态（运维端点，不承载业务功能）
  - 控制器：— (app.ts 内联)

#### 6.2.2 牌组

- `GET /api/decks` — 牌组列表（?search=&category=&page=&limit=）
  - 控制器：deckController.list
- `POST /api/decks` — 创建牌组
  - 控制器：deckController.create
- `GET /api/decks/:id` — 牌组详情 + 卡片/笔记计数
  - 控制器：deckController.getById
- `PUT /api/decks/:id` — 更新牌组（名称/描述/图标/颜色/文件夹）
  - 控制器：deckController.update
- `DELETE /api/decks/:id` — 删除牌组（级联删除卡片和复习记录；考试目标保留，其 `deck_id` 置 NULL）
  - 控制器：deckController.remove

#### 6.2.3 卡片

- `GET /api/decks/:deckId/cards` — 牌组下卡片列表（?page=&limit=&sort=）
  - 控制器：cardController.listByDeck
- `POST /api/decks/:deckId/cards` — 在牌组中创建单张卡片
  - 控制器：cardController.create
- `POST /api/cards/batch` — 批量创建卡片 { deckId, cards: [...] }
  - 控制器：cardController.createBatch
- `PUT /api/cards/:id` — 更新卡片内容（front/back/tags）
  - 控制器：cardController.update
- `DELETE /api/cards/:id` — 删除卡片（级联删除复习记录）
  - 控制器：cardController.remove

#### 6.2.4 复习

- `GET /api/decks/:deckId/due` — 获取到期卡片列表（按 next_review 排序）
  - 控制器：reviewController.getDueCards
- `POST /api/cards/:id/review` — 提交复习评分 { result }
  - 控制器：reviewController.submit
- `GET /api/decks/:deckId/review-progress` — 牌组复习进度（已复习/总数/正确率）
  - 控制器：reviewController.getProgress

#### 6.2.5 笔记

- `GET /api/notes` — 笔记列表（?folderId=&fileType=&isToday=&page=；`fileType` 按附件类型过滤，如 `pdf`，口径见 DESIGN §4.1）
  - 控制器：noteController.list
- `GET /api/notes/today` — 今日临时笔记
  - 控制器：noteController.today
- `GET /api/notes/:id` — 笔记详情（含附件列表）
  - 控制器：noteController.getById
- `POST /api/notes` — 创建笔记
  - 控制器：noteController.create
- `PUT /api/notes/:id` — 更新笔记（标题/正文/is_today/文件夹）
  - 控制器：noteController.update
- `DELETE /api/notes/:id` — 删除笔记（级联删除附件；关联卡片的 `source_note` 置 NULL）
  - 控制器：noteController.remove
- `POST /api/notes/:id/attachments` — 上传附件（multipart/form-data）
  - 控制器：noteController.uploadAttachment
- `POST /api/notes/:id/convert-to-cards` — 笔记转为记忆卡片
  - 控制器：noteController.convertToCards

#### 6.2.6 文件夹

- `GET /api/folders` — 完整文件夹树
  - 控制器：folderController.tree
- `POST /api/folders` — 创建文件夹
  - 控制器：folderController.create
- `PUT /api/folders/:id` — 重命名文件夹
  - 控制器：folderController.update
- `DELETE /api/folders/:id` — 删除空文件夹
  - 控制器：folderController.remove

#### 6.2.7 统计

- `GET /api/stats/overview` — 全局统计概览（「已掌握」口径：`repetitions >= 3` 且 `interval >= 30240` 分钟，见立项 R11）
  - 控制器：statsController.overview
- `GET /api/stats/calendar` — 日历视图（?year=&month=）
  - 控制器：statsController.calendar
- `GET /api/stats/timeline` — 时间轴（?page=&limit=）
  - 控制器：statsController.timeline
- `GET /api/stats/deck/:id` — 单个牌组统计
  - 控制器：statsController.deckStats

#### 6.2.8 模板

- `GET /api/templates` — 模板列表
  - 控制器：templateController.list
- `POST /api/templates` — 创建自定义模板
  - 控制器：templateController.create
- `DELETE /api/templates/:id` — 删除模板（`is_default=1` 拒绝，返回 40903）
  - 控制器：templateController.remove

#### 6.2.9 考试目标

- `GET /api/exams` — 考试目标列表（?status=active）
  - 控制器：examController.list
- `POST /api/exams` — 创建考试目标
  - 控制器：examController.create
- `PUT /api/exams/:id` — 更新考试目标（名称/日期/每日目标/状态）
  - 控制器：examController.update
- `DELETE /api/exams/:id` — 删除考试目标
  - 控制器：examController.remove

#### 6.2.10 搜索

- `GET /api/search` — 全局搜索（?q=&category=decks|notes|cards|all）
  - 控制器：searchController.search

#### 6.2.11 导入导出

- `POST /api/import/json` — 导入 JSON（{ decks: [...] }）；成功返回导入摘要：
  `{ "code": 0, "message": "ok", "data": { decksCreated, decksMerged, cardsInserted, cardsSkipped, notesInserted, templatesInserted } }`
  - 控制器：importExportController.importJson
- `GET /api/export/deck/:id` — 导出单个牌组 JSON
  - 控制器：importExportController.exportDeck
- `GET /api/export/all` — 导出全部数据 JSON
  - 控制器：importExportController.exportAll

### 6.3 统一响应格式

```
成功响应：
  HTTP 200 (或 201)
  { "code": 0, "message": "ok", "data": <任意 JSON> }

失败响应：
  HTTP 400 / 404 / 409 / 500
  { "code": <错误码>, "message": "<人可读的错误描述>", "data": null }
```

### 6.4 错误码注册表

> 常量命名与 ENGINEERING_STANDARDS §6.2 全量清单一致（本表为架构视角摘录，触发场景见该清单）。

- **0**：成功 —— HTTP 状态：200 —— 常量名：`SUCCESS`

#### 6.4.1 参数校验（HTTP 400，40001-40005）

- **40001**：缺少必填字段 —— HTTP 状态：400 —— 常量名：`MISSING_FIELD`
- **40002**：格式校验失败 —— HTTP 状态：400 —— 常量名：`INVALID_FORMAT`
- **40003**：复习结果值无效 —— HTTP 状态：400 —— 常量名：`INVALID_RESULT`
- **40004**：牌组内无卡片 —— HTTP 状态：400 —— 常量名：`EMPTY_DECK`
- **40005**：导入数据 JSON 格式错误 —— HTTP 状态：400 —— 常量名：`INVALID_JSON`

#### 6.4.2 资源不存在（HTTP 404，40401-40405）

- **40401**：牌组不存在 —— HTTP 状态：404 —— 常量名：`DECK_NOT_FOUND`
- **40402**：卡片不存在 —— HTTP 状态：404 —— 常量名：`CARD_NOT_FOUND`
- **40403**：笔记不存在 —— HTTP 状态：404 —— 常量名：`NOTE_NOT_FOUND`
- **40404**：文件夹不存在 —— HTTP 状态：404 —— 常量名：`FOLDER_NOT_FOUND`
- **40405**：模板不存在 —— HTTP 状态：404 —— 常量名：`TEMPLATE_NOT_FOUND`

#### 6.4.3 业务冲突（HTTP 409，40901-40903）

- **40901**：同名牌组已存在 —— HTTP 状态：409 —— 常量名：`DECK_DUPLICATE`
- **40902**：文件夹非空无法删除 —— HTTP 状态：409 —— 常量名：`FOLDER_NOT_EMPTY`
- **40903**：系统默认模板不可删除 —— HTTP 状态：409 —— 常量名：`DEFAULT_TEMPLATE`

#### 6.4.4 服务端错误（HTTP 500，50001-50004）

- **50001**：数据库错误 —— HTTP 状态：500 —— 常量名：`DB_ERROR`
- **50002**：文件写入失败 —— HTTP 状态：500 —— 常量名：`FILE_WRITE_ERROR`
- **50003**：文件读取失败 —— HTTP 状态：500 —— 常量名：`FILE_READ_ERROR`
- **50004**：未知内部错误 —— HTTP 状态：500 —— 常量名：`INTERNAL_ERROR`

> **预留错误码段**（当前版本不启用，M2 起生效）：
> `401xx` 未认证类（如 `40101 UNAUTHORIZED` 未登录 / 401 状态码）——注册于本清单即为正式错误码，M2 实施认证时启用，禁止临时自创。

---

## 七、中间件体系

### 7.1 中间件执行顺序

```
请求 → requestLogger → authGuard(占位) → 路由 → errorHandler(仅异常时)
```

### 7.2 requestLogger

- **触发时机**：每个请求进入时立即记录开始时间，响应结束时记录日志
- **记录字段**：method, url, status, duration (ms), timestamp
- **日志级别**：info（正常）/ error（status >= 400）
- **不记录**：请求 body、响应 body（隐私 + 体积考虑）

### 7.3 authGuard（权限占位）

- **V1.0/M1 行为**：直接 `next()`，不做任何校验
- **M2 启用**：读取 Authorization header → 验证 JWT → 注入 req.userId
- **挂载位置**：所有 `/api` 路由统一挂载，M2 时零代码改动启用

### 7.4 errorHandler

- **注册位置**：Express 应用最后注册（4 参数函数，Express 自动识别为错误处理中间件）
- **处理逻辑**：`err instanceof AppError` → 返回对应错误码 + HTTP 状态
- **未知异常**：兜底返回 `50004 + "服务器内部错误"`，原始错误通过 logger.error 记录（含 stack trace）
- **安全**：生产环境响应体绝不泄露 stack trace 或文件路径
- **文件清理**：上传请求异常时，清理已写入的临时文件

---

## 八、SM-2 间隔重复算法

### 8.1 算法输入输出

```
输入：当前卡片状态 { ease_factor, interval, repetitions }
      用户评分 result ∈ { 'forgot', 'hard', 'good', 'easy' }

输出：新状态 { ease_factor, interval, repetitions, next_review, last_reviewed }
```

### 8.2 计算规则

> **单位约定**：`interval` 一律以**分钟**为单位存储与计算。10 分钟 = 10，1 天 = 1440，21 天 = 30240。

- **forgot (1)**：完全遗忘，从头开始 —— repetitions：重置为 0 —— interval：10 分钟 —— ease_factor：-0.20
- **hard (2)**：回忆困难，缩短间隔 —— repetitions：重置为 0 —— interval：1 天 (1440 分钟) —— ease_factor：-0.15
- **good (3)**：正常回忆，间隔递进 —— repetitions：+1 —— interval：× ease_factor —— ease_factor：不变
- **easy (4)**：轻松回忆，加速递进 —— repetitions：+1 —— interval：× ease_factor × 1.3 —— ease_factor：+0.15
- **首次复习例外**：新卡（repetitions=0）首次评分不套用 × ease_factor 公式，按基线设置 —— good：1 天 (1440 分钟)；easy：4 天 (5760 分钟)（详见 §8.3）

### 8.3 边界约束

| 约束 | 值 | 说明 |
|------|-----|------|
| ease_factor 下限 | 1.3 | 防止间隔过短 |
| interval 上限 | 365 天 = 525600 分钟 | 最长一年后复习 |
| 首次复习 (repetitions=0) | 基线直接设置 | 不套用 ×EF 公式：good→1 天 (1440)、easy→4 天 (5760)；forgot/hard 按 §8.2 执行 |

### 8.4 算法位置

在 `server/src/utils/sm2.ts` 中作为纯函数实现：

```
函数签名：calcNextState(card: CardState, result: ReviewResult) => CardState
特点：纯函数，无副作用，无数据库依赖，可独立单元测试
```

在 `reviewService.submit()` 中调用该函数，将返回的新状态通过 `cardRepo.updateReviewState()` 写入数据库。

---

## 九、文件上传规范

### 9.1 上传流程

```
POST /api/notes/:id/attachments  (multipart/form-data, field: "file")
  → noteController.uploadAttachment
    1. 校验 note_id 存在（noteService.getById）
    2. multer 中间件解析文件
       - 存储路径：uploads/<YYYY-MM>/<uuid>-<原始文件名>
       - 大小限制：10MB
       - 类型白名单：image/png, image/jpeg, image/gif, image/webp, 
                     application/pdf, text/plain, application/msword
    3. 写入 note_attachments 表
    4. 返回附件记录
```

> **附件访问**：预览/下载不设独立 API 端点，通过静态文件服务 `express.static(uploadDir)` 挂载于 `/uploads` 提供（见 ENGINEERING_STANDARDS §4.3）。

### 9.2 安全措施

- **类型白名单**：multer fileFilter 校验 MIME 类型
- **大小限制**：multer limits.fileSize = 10MB
- **文件名脱敏**：存储时用 uuid 前缀，保留原始文件名供下载时使用
- **目录隔离**：按月分目录，避免单目录文件数爆炸

---

## 十、导入导出设计

### 10.1 导出格式

```json
{
  "version": 1,
  "exportedAt": "2026-06-17T10:00:00Z",
  "decks": [
    {
      "name": "生物 - 细胞学",
      "description": "",
      "cards": [
        {
          "front": "光合作用的化学方程式是？",
          "back": "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂",
          "tags": ["生物", "光合作用"],
          "ease_factor": 2.5,
          "interval": 4320,
          "repetitions": 2,
          "next_review": "2026-06-20T10:00:00Z",
          "last_reviewed": "2026-06-17T10:00:00Z"
        }
      ]
    }
  ],
  "review_logs": [
    {
      "deck_name": "生物 - 细胞学",
      "card_front": "光合作用的化学方程式是？",
      "result": "good",
      "reviewed_at": "2026-06-17T10:00:00Z"
    }
  ],
  "notes": [...],
  "templates": [...]
}
```

> **说明**：`interval` 单位为分钟（4320 分钟 = 3 天）。复习记录随导出携带，通过 `deck_name + card_front` 反查卡片归属；导入时按原 `reviewed_at` 恢复统计历史。
>
> **字段命名约定**：顶层元数据（`version` / `exportedAt`）用 camelCase，业务字段沿用数据库 snake_case（`ease_factor` / `next_review` 等），前端展示时按需映射。

### 10.2 导入策略

- **幂等检测**：同名牌组的卡片合并（追加非重复卡片）
- **进度保留**：导出时携带 SM-2 状态，导入时恢复
- **冲突策略**：同名牌组 → 追加卡片（不覆盖已有牌组元信息）
- **事务保护**：整个导入在一个事务中完成，任意步骤失败则回滚
- **校验**：导入前 JSON 结构校验，不符合 schema 的直接拒绝并给出具体错误位置

---

## 十一、日志体系

### 11.1 日志级别与使用场景

- **`error`**：未捕获异常、数据库操作失败、文件读写失败 — 需立即关注
- **`warn`**：业务冲突（同名牌组）、404 响应、上传类型被拒绝 — 正常业务但值得注意
- **`info`**：每个请求摘要、服务启动/停止、迁移完成 — 日常运维
- **`debug`**：请求参数详情、SQL 执行时间、SM-2 计算结果 — 开发调试

### 11.2 日志输出

| 环境 | 输出目标 | 格式 |
|------|---------|------|
| 开发 (development) | 仅控制台 | 带颜色的可读文本 |
| 生产 (production) | 控制台 + 文件 | 控制台可读文本，文件 JSON 格式 |

文件输出路径：
- `logs/error.log` — 仅 error 级别
- `logs/combined.log` — 全级别

### 11.3 日志内容规范

每条日志包含：
- `timestamp` — ISO 8601 格式
- `level` — 日志级别
- `message` — 简短描述
- 异常日志额外包含 `stack` (生产环境仅存文件不返回客户端)

---

## 十二、异常处理体系

### 12.1 异常分类

```
AppError (自定义业务异常)
  ├─ 参数校验失败  → code: 400xx, httpStatus: 400
  ├─ 资源不存在    → code: 404xx, httpStatus: 404
  └─ 业务冲突      → code: 409xx, httpStatus: 409

未知异常 (兜底)
  └─ 500 + 脱敏消息，原始错误记入 error 日志
```

### 12.2 异常抛出位置

- **controller**：参数校验失败 —— 示例：`throw new AppError(40001, '缺少必填字段 front')`
- **service**：资源不存在 —— 示例：`throw new AppError(40401, '牌组不存在')`
- **service**：业务冲突 —— 示例：`throw new AppError(40901, '同名牌组已存在')`
- **repository**：数据库异常 —— 示例：原生 Error 向上抛，由 errorHandler 兜底

### 12.3 事务异常保障

涉及多表写入的操作（复习提交、笔记转卡片、导入）使用 `db.transaction()` 包装：

```
事务内任意步骤抛出异常 → SQLite 自动回滚 → 异常向上传播 → errorHandler 返回 500
```

---

## 十三、TypeScript 编译配置

- **`target`**：`ES2022` —— 说明：Node.js 20 原生支持
- **`module`**：`NodeNext` —— 说明：与 Node.js ESM/CJS 互操作兼容
- **`moduleResolution`**：`NodeNext` —— 说明：配套 module
- **`outDir`**：`dist` —— 说明：编译输出目录
- **`rootDir`**：`src` —— 说明：源码目录
- **`strict`**：`true` —— 说明：全严格模式
- **`esModuleInterop`**：`true` —— 说明：兼容 CJS 模块导入
- **`forceConsistentCasingInFileNames`**：`true` —— 说明：文件名大小写一致
- **`skipLibCheck`**：`true` —— 说明：跳过 `.d.ts` 类型检查加速编译

---

## 十四、package.json 脚本

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  }
}
```

- **`dev`**：tsx 热重载开发（文件变更自动重启）
- **`build`**：TypeScript 编译到 dist/
- **`start`**：生产启动（编译后）
- **`typecheck`**：仅类型检查，不输出文件

---

## 十五、验收清单

### 15.1 启动线

- [ ] `npm run dev` 启动，控制台输出 `Server running on http://localhost:3000`
- [ ] `GET /api/health` 返回 `{ "code": 0, "message": "ok", "data": { "status": "ok", "uptime": ..., "db": "connected" } }`
- [ ] 修改 `.env` 中 `PORT=4000` 后重启，服务监听 4000

### 15.2 接口线

- [ ] 所有接口响应结构为 `{ code, message, data }`
- [ ] 参数缺失返回 `40001` + HTTP 400
- [ ] 资源不存在返回 `404xx` + HTTP 404
- [ ] 未知异常返回 `50004` + HTTP 500（不含 stack trace）

### 15.3 业务线

- [ ] routes/ 层仅路径注册，一行 router.xxx()
- [ ] controllers/ 层不包含 SQL 或数据库调用
- [ ] services/ 层不访问 req/res
- [ ] repositories/ 层纯 SQL，无业务判断
- [ ] 复习提交使用事务，cards 更新 + review_logs 写入原子执行

### 15.4 运维线

- [ ] 每个请求输出 method + url + status + duration 日志
- [ ] `logs/error.log` 包含异常记录（含 stack）
- [ ] `server/.env.example` 包含所有可配置项及其默认值
- [ ] README.md 包含完整启动步骤
