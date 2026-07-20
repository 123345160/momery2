# 记忆学习平台 — 后端架构设计文档

> 定义后端分层架构、模块职责、API 规范、中间件体系、错误处理、日志策略与运维标准。不包含具体实现代码。

---

## 一、技术选型与版本

| 类别 | 选型 | 版本 | 说明 |
|------|------|------|------|
| 运行时 | Node.js | ^20 LTS | 稳定长期支持版本 |
| 语言 | TypeScript | ^5.4 | 严格模式，全链路类型安全 |
| Web 框架 | Express | ^4 | 成熟稳定，中间件生态丰富 |
| 数据库驱动 | better-sqlite3 | ^11 | 同步 API，单用户场景性能最优 |
| 日志 | winston | ^3 | 结构化日志，多 transport 支持 |
| 配置管理 | dotenv | ^16 | 加载 .env 到 process.env |
| 进程管理 (开发) | tsx | ^4 | TypeScript 热重载开发 |
| 并发启动 (开发) | concurrently | ^8 | 同时启动前后端 |
| 文件上传 | multer | ^1 | multipart/form-data 解析 |

### 不引入的依赖（与理由）

| 不引入 | 理由 |
|--------|------|
| ORM (Prisma / TypeORM / Drizzle) | SQLite 原生 SQL 足够清晰，ORM 增加学习成本和性能开销 |
| zod / joi (参数校验库) | 接口量小（40+ 端点），controller 层条件判断即可，避免过度工程化 |
| express-async-errors | 自行封装 try-catch 包装器，显式控制异常流 |
| express-validator | 同类理由，简单校验不需要额外抽象层 |
| bcrypt / jsonwebtoken | Phase 1 无用户认证，Phase 2 再引入 |
| Redis | 单用户场景无需缓存，Phase 4 再评估 |

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
│  · authGuard      — 权限占位（Phase 2 启用）               │
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
  ├─ middlewares/authGuard.ts          (Phase 1: 直接 next)
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
    │   ├── authGuard.ts             # 权限占位：直接 next()，Phase 2 启用 JWT 校验
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
    │   └── importExportService.ts   # 导入导出：JSON 序列化/反序列化 + 批量写入
    │
    ├── repositories/
    │   ├── deckRepo.ts
    │   ├── cardRepo.ts
    │   ├── reviewLogRepo.ts
    │   ├── noteRepo.ts
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
  │   └─ GET /api/health → { code: 0, data: { status, uptime, db } }
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
  │       └─ /api/import  +  /api/export
  │
  └─ 错误处理（最后注册，Express 4 通过参数数量识别）
      └─ errorHandler(err, req, res, next)
```

---

## 五、配置中心

### 5.1 配置项定义

| 配置项 | 环境变量 | 默认值 | 说明 |
|--------|---------|--------|------|
| `port` | `PORT` | `3000` | 服务监听端口 |
| `dbPath` | `DB_PATH` | `./data/app.db` | SQLite 文件路径 |
| `uploadDir` | `UPLOAD_DIR` | `./uploads` | 文件上传目录 |
| `corsOrigin` | `CORS_ORIGIN` | `http://localhost:5173` | 允许的跨域源 |
| `logLevel` | `LOG_LEVEL` | `info` (dev) / `warn` (prod) | 日志级别 |
| `nodeEnv` | `NODE_ENV` | `development` | 运行环境 |

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
| kebab-case 多词路径 | `/api/decks/:id/due-cards` | 不用驼峰或下划线 |

### 6.2 完整端点清单

#### 健康检查

| 方法 | 路径 | 控制器 | 说明 |
|------|------|--------|------|
| GET | `/api/health` | — (app.ts 内联) | 服务健康状态 |

#### 牌组

| 方法 | 路径 | 控制器 | 说明 |
|------|------|--------|------|
| GET | `/api/decks` | deckController.list | 牌组列表（?search=&category=&page=&limit=） |
| POST | `/api/decks` | deckController.create | 创建牌组 |
| GET | `/api/decks/:id` | deckController.getById | 牌组详情 + 卡片/笔记计数 |
| PUT | `/api/decks/:id` | deckController.update | 更新牌组（名称/描述/图标/颜色/文件夹） |
| DELETE | `/api/decks/:id` | deckController.remove | 删除牌组（级联删除卡片和复习记录） |

#### 卡片

| 方法 | 路径 | 控制器 | 说明 |
|------|------|--------|------|
| GET | `/api/decks/:deckId/cards` | cardController.listByDeck | 牌组下卡片列表（?page=&limit=&sort=） |
| POST | `/api/decks/:deckId/cards` | cardController.create | 在牌组中创建单张卡片 |
| POST | `/api/cards/batch` | cardController.createBatch | 批量创建卡片 { deckId, cards: [...] } |
| PUT | `/api/cards/:id` | cardController.update | 更新卡片内容（front/back/tags） |
| DELETE | `/api/cards/:id` | cardController.remove | 删除卡片（级联删除复习记录） |

#### 复习

| 方法 | 路径 | 控制器 | 说明 |
|------|------|--------|------|
| GET | `/api/decks/:deckId/due` | reviewController.getDueCards | 获取到期卡片列表（按 next_review 排序） |
| POST | `/api/cards/:id/review` | reviewController.submit | 提交复习评分 { result } |
| GET | `/api/decks/:deckId/review-progress` | reviewController.getProgress | 牌组复习进度（已复习/总数/正确率） |

#### 笔记

| 方法 | 路径 | 控制器 | 说明 |
|------|------|--------|------|
| GET | `/api/notes` | noteController.list | 笔记列表（?folderId=&isToday=&page=） |
| GET | `/api/notes/today` | noteController.today | 今日临时笔记 |
| GET | `/api/notes/:id` | noteController.getById | 笔记详情（含附件列表） |
| POST | `/api/notes` | noteController.create | 创建笔记 |
| PUT | `/api/notes/:id` | noteController.update | 更新笔记（标题/正文/is_today/文件夹） |
| DELETE | `/api/notes/:id` | noteController.remove | 删除笔记（级联删除附件） |
| POST | `/api/notes/:id/attachments` | noteController.uploadAttachment | 上传附件（multipart/form-data） |
| POST | `/api/notes/:id/convert-to-cards` | noteController.convertToCards | 笔记转为记忆卡片 |

#### 文件夹

| 方法 | 路径 | 控制器 | 说明 |
|------|------|--------|------|
| GET | `/api/folders` | folderController.tree | 完整文件夹树 |
| POST | `/api/folders` | folderController.create | 创建文件夹 |
| PUT | `/api/folders/:id` | folderController.update | 重命名文件夹 |
| DELETE | `/api/folders/:id` | folderController.remove | 删除空文件夹 |

#### 统计

| 方法 | 路径 | 控制器 | 说明 |
|------|------|--------|------|
| GET | `/api/stats/overview` | statsController.overview | 全局统计概览 |
| GET | `/api/stats/calendar` | statsController.calendar | 日历视图（?year=&month=） |
| GET | `/api/stats/timeline` | statsController.timeline | 时间轴（?page=&limit=） |
| GET | `/api/stats/deck/:id` | statsController.deckStats | 单个牌组统计 |

#### 模板

| 方法 | 路径 | 控制器 | 说明 |
|------|------|--------|------|
| GET | `/api/templates` | templateController.list | 模板列表 |
| POST | `/api/templates` | templateController.create | 创建自定义模板 |

#### 导入导出

| 方法 | 路径 | 控制器 | 说明 |
|------|------|--------|------|
| POST | `/api/import/json` | importExportController.importJson | 导入 JSON（{ decks: [...] }） |
| GET | `/api/export/deck/:id` | importExportController.exportDeck | 导出单个牌组 JSON |
| GET | `/api/export/all` | importExportController.exportAll | 导出全部数据 JSON |

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

| 错误码 | HTTP 状态 | 常量名 | 说明 |
|--------|----------|--------|------|
| 0 | 200 | `SUCCESS` | 成功 |
| 40001 | 400 | `ERR_MISSING_FIELD` | 缺少必填字段 |
| 40002 | 400 | `ERR_INVALID_FORMAT` | 格式校验失败 |
| 40003 | 400 | `ERR_INVALID_RESULT` | 复习结果值无效 |
| 40004 | 400 | `ERR_EMPTY_DECK` | 牌组内无卡片 |
| 40401 | 404 | `ERR_DECK_NOT_FOUND` | 牌组不存在 |
| 40402 | 404 | `ERR_CARD_NOT_FOUND` | 卡片不存在 |
| 40403 | 404 | `ERR_NOTE_NOT_FOUND` | 笔记不存在 |
| 40404 | 404 | `ERR_FOLDER_NOT_FOUND` | 文件夹不存在 |
| 40405 | 404 | `ERR_TEMPLATE_NOT_FOUND` | 模板不存在 |
| 40901 | 409 | `ERR_DECK_DUPLICATE` | 同名牌组已存在 |
| 40902 | 409 | `ERR_FOLDER_NOT_EMPTY` | 文件夹非空无法删除 |
| 40903 | 409 | `ERR_DEFAULT_TEMPLATE` | 系统默认模板不可删除 |
| 50001 | 500 | `ERR_DATABASE` | 数据库错误 |
| 50002 | 500 | `ERR_FILE_WRITE` | 文件写入失败 |
| 50003 | 500 | `ERR_FILE_READ` | 文件读取失败 |
| 50004 | 500 | `ERR_INTERNAL` | 未知内部错误 |

---

## 七、中间件体系

### 7.1 中间件执行顺序

```
请求 → requestLogger → authGuard(占位) → 路由 → errorHandler(仅异常时)
```

### 7.2 requestLogger

| 属性 | 说明 |
|------|------|
| 触发时机 | 每个请求进入时立即记录开始时间，响应结束时记录日志 |
| 记录字段 | method, url, status, duration (ms), timestamp |
| 日志级别 | info（正常）/ error（status >= 400） |
| 不记录 | 请求 body、响应 body（隐私 + 体积考虑） |

### 7.3 authGuard（权限占位）

| 属性 | 说明 |
|------|------|
| Phase 1 行为 | 直接 `next()`，不做任何校验 |
| Phase 2 启用 | 读取 Authorization header → 验证 JWT → 注入 req.userId |
| 挂载位置 | 所有 `/api` 路由统一挂载，Phase 2 时零代码改动启用 |

### 7.4 errorHandler

| 属性 | 说明 |
|------|------|
| 注册位置 | Express 应用最后注册（4 参数函数，Express 自动识别为错误处理中间件） |
| 处理逻辑 | `err instanceof AppError` → 返回对应错误码 + HTTP 状态 |
| 未知异常 | 兜底返回 `50001 + "服务器内部错误"`，原始错误通过 logger.error 记录（含 stack trace） |
| 安全 | 生产环境响应体绝不泄露 stack trace 或文件路径 |
| 文件清理 | 上传请求异常时，清理已写入的临时文件 |

---

## 八、SM-2 间隔重复算法

### 8.1 算法输入输出

```
输入：当前卡片状态 { ease_factor, interval, repetitions }
      用户评分 result ∈ { 'forgot', 'hard', 'good', 'easy' }

输出：新状态 { ease_factor, interval, repetitions, next_review, last_reviewed }
```

### 8.2 计算规则

| 评分 | repetitions | interval | ease_factor | 说明 |
|------|-------------|----------|-------------|------|
| forgot (1) | 重置为 0 | 10 分钟 | -0.20 | 完全遗忘，从头开始 |
| hard (2) | 重置为 0 | 1 天 | -0.15 | 回忆困难，缩短间隔 |
| good (3) | +1 | × ease_factor | 不变 | 正常回忆，间隔递进 |
| easy (4) | +1 | × ease_factor × 1.3 | +0.15 | 轻松回忆，加速递进 |

### 8.3 边界约束

| 约束 | 值 | 说明 |
|------|-----|------|
| ease_factor 下限 | 1.3 | 防止间隔过短 |
| interval 上限 | 365 天 | 最长一年后复习 |
| 首次复习 (repetitions=0) | 不计 interval 递进 | 新卡首次复习判定基于评分直接设置 interval |

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

### 9.2 安全措施

| 措施 | 说明 |
|------|------|
| 类型白名单 | multer fileFilter 校验 MIME 类型 |
| 大小限制 | multer limits.fileSize = 10MB |
| 文件名脱敏 | 存储时用 uuid 前缀，保留原始文件名供下载时使用 |
| 目录隔离 | 按月分目录，避免单目录文件数爆炸 |

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
          "interval": 3,
          "repetitions": 2,
          "next_review": "2026-06-20T10:00:00Z",
          "last_reviewed": "2026-06-17T10:00:00Z"
        }
      ]
    }
  ],
  "notes": [...],
  "templates": [...]
}
```

### 10.2 导入策略

| 规则 | 说明 |
|------|------|
| 幂等检测 | 同名牌组的卡片合并（追加非重复卡片） |
| 进度保留 | 导出时携带 SM-2 状态，导入时恢复 |
| 冲突策略 | 同名牌组 → 追加卡片（不覆盖已有牌组元信息） |
| 事务保护 | 整个导入在一个事务中完成，任意步骤失败则回滚 |
| 校验 | 导入前 JSON 结构校验，不符合 schema 的直接拒绝并给出具体错误位置 |

---

## 十一、日志体系

### 11.1 日志级别与使用场景

| 级别 | 使用场景 |
|------|---------|
| `error` | 未捕获异常、数据库操作失败、文件读写失败 — 需立即关注 |
| `warn` | 业务冲突（同名牌组）、404 响应、上传类型被拒绝 — 正常业务但值得注意 |
| `info` | 每个请求摘要、服务启动/停止、迁移完成 — 日常运维 |
| `debug` | 请求参数详情、SQL 执行时间、SM-2 计算结果 — 开发调试 |

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

| 层 | 抛出场景 | 示例 |
|----|---------|------|
| controller | 参数校验失败 | `throw new AppError(40001, '缺少必填字段 front')` |
| service | 资源不存在 | `throw new AppError(40401, '牌组不存在')` |
| service | 业务冲突 | `throw new AppError(40901, '同名牌组已存在')` |
| repository | 数据库异常 | 原生 Error 向上抛，由 errorHandler 兜底 |

### 12.3 事务异常保障

涉及多表写入的操作（复习提交、笔记转卡片、导入）使用 `db.transaction()` 包装：

```
事务内任意步骤抛出异常 → SQLite 自动回滚 → 异常向上传播 → errorHandler 返回 500
```

---

## 十三、TypeScript 编译配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `target` | `ES2022` | Node.js 20 原生支持 |
| `module` | `NodeNext` | 与 Node.js ESM/CJS 互操作兼容 |
| `moduleResolution` | `NodeNext` | 配套 module |
| `outDir` | `dist` | 编译输出目录 |
| `rootDir` | `src` | 源码目录 |
| `strict` | `true` | 全严格模式 |
| `esModuleInterop` | `true` | 兼容 CJS 模块导入 |
| `forceConsistentCasingInFileNames` | `true` | 文件名大小写一致 |
| `skipLibCheck` | `true` | 跳过 `.d.ts` 类型检查加速编译 |

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

| 脚本 | 说明 |
|------|------|
| `dev` | tsx 热重载开发（文件变更自动重启） |
| `build` | TypeScript 编译到 dist/ |
| `start` | 生产启动（编译后） |
| `typecheck` | 仅类型检查，不输出文件 |

---

## 十五、验收清单

### 启动线
- [ ] `npm run dev` 启动，控制台输出 `Server running on http://localhost:3000`
- [ ] `GET /api/health` 返回 `{ "code": 0, "data": { "status": "ok", "uptime": ..., "db": "connected" } }`
- [ ] 修改 `.env` 中 `PORT=4000` 后重启，服务监听 4000

### 接口线
- [ ] 所有接口响应结构为 `{ code, message, data }`
- [ ] 参数缺失返回 `40001` + HTTP 400
- [ ] 资源不存在返回 `404xx` + HTTP 404
- [ ] 未知异常返回 `50001` + HTTP 500（不含 stack trace）

### 业务线
- [ ] routes/ 层仅路径注册，一行 router.xxx()
- [ ] controllers/ 层不包含 SQL 或数据库调用
- [ ] services/ 层不访问 req/res
- [ ] repositories/ 层纯 SQL，无业务判断
- [ ] 复习提交使用事务，cards 更新 + review_logs 写入原子执行

### 运维线
- [ ] 每个请求输出 method + url + status + duration 日志
- [ ] `logs/error.log` 包含异常记录（含 stack）
- [ ] `server/.env.example` 包含所有可配置项及其默认值
- [ ] README.md 包含完整启动步骤
