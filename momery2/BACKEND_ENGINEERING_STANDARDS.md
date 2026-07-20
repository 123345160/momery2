# 记忆学习平台 — 后端工程标准文档

> 本文档定义后端技术选型决策（含方案对比与淘汰理由）、语言工程规范、框架最佳实践、目录约束、接口/错误/日志/数据库强制性规则，以及新增模块操作流程。全体开发人员必须遵守。

---

## 一、技术选型决策

### 1.1 运行时：Node.js 20 LTS

| 维度 | 评估 |
|------|------|
| **选型理由** | 与前端共享 TypeScript 生态，全栈单一语言降低团队认知开销；事件驱动非阻塞 I/O 适合本项目的 IO 密集特征（文件上传、SQLite 同步读写）；npm 生态丰富，所有依赖均有成熟方案 |
| **淘汰方案** | — |

#### 对比淘汰

| 方案 | 淘汰理由 |
|------|---------|
| **Deno** | 生态成熟度不足；better-sqlite3 等关键依赖无原生支持；团队学习成本高 |
| **Bun** | 尚处于快速迭代期，生产稳定性存疑；better-sqlite3 兼容性未经大规模验证 |
| **Python (FastAPI)** | 前后端语言分裂，增加项目维护成本；本项目无需 Python 的 AI/数据科学优势 |
| **Go** | 性能过剩（本项目的瓶颈在磁盘 IO 而非 CPU）；前后端异构增加沟通成本 |

### 1.2 语言：TypeScript 5.4（严格模式）

| 维度 | 评估 |
|------|------|
| **选型理由** | 编译期类型检查消除第 1 类运行时错误（undefined/null/类型不匹配）；接口定义即文档，提升代码可读性；与前端共享类型定义（通过 `types/` 目录对齐） |
| **淘汰方案** | — |

#### 对比淘汰

| 方案 | 淘汰理由 |
|------|---------|
| **JavaScript (纯)** | 缺少类型约束，重构风险高；参数校验依赖人工 review，容易遗漏 |
| **JSDoc 类型注释** | 表达能力弱于 TypeScript，复杂泛型/联合类型难以描述；无编译期检查 |

#### TSConfig 强制配置

| 配置项 | 值 | 不可修改原因 |
|--------|-----|-------------|
| `strict` | `true` | 启用所有严格检查，消除隐式 any/null 漏洞 |
| `noUnusedLocals` | `true` | 禁止未使用的局部变量，保持代码整洁 |
| `noUnusedParameters` | `true` | 禁止未使用的函数参数（用 `_param` 前缀显式标记忽略） |
| `exactOptionalPropertyTypes` | `true` | 禁止 `undefined` 赋值给可选属性 |
| `noFallthroughCasesInSwitch` | `true` | 禁止 switch 穿透，防止 bug |
| `forceConsistentCasingInFileNames` | `true` | 防止跨平台文件名大小写问题 |

### 1.3 Web 框架：Express 4

| 维度 | 评估 |
|------|------|
| **选型理由** | Node.js 生态中最成熟、社区最大的 Web 框架；中间件机制简单灵活，按需组合；学习曲线平缓，文档丰富；与本项目「轻量分层而非重量级框架」的理念一致 |
| **淘汰方案** | Koa、Fastify、NestJS、Hono |

#### 对比淘汰

| 方案 | 淘汰理由 |
|------|---------|
| **Koa** | Express 的「精神继承者」但社区远小于 Express；中间件洋葱模型调试成本高；关键中间件（multer/cors）仍需兼容 Express 风格引入，混合使用增加复杂度 |
| **Fastify** | 性能优于 Express，但本项目单用户场景 QPS < 10，性能差异无意义；插件体系学习成本高；schema 校验与自行设计的错误码体系冲突 |
| **NestJS** | 重量级框架，依赖注入/装饰器/模块化体系过度工程化；本项目模块数有限（8 个业务域），不需要 DI 容器；装饰器语法与 Vue 3 Composition API 思维模式不一致，增大全栈开发的心智切换成本 |
| **Hono** | 面向 Edge/Serverless 场景设计，本项目为本地持久化服务，场景不匹配；中间件生态薄弱 |

### 1.4 数据库驱动：better-sqlite3

| 维度 | 评估 |
|------|------|
| **选型理由** | 同步 API 天然适合 SQLite（单连接、无并发写入竞争）；比异步 sqlite3 驱动快 2-5 倍；原生支持事务；无需处理连接池/异步回调 |
| **淘汰方案** | sqlite3 (异步版)、bun:sqlite、Prisma + SQLite |

#### 对比淘汰

| 方案 | 淘汰理由 |
|------|---------|
| **sqlite3 (npm 异步版)** | 回调风格异步 API 与项目同步调用风格冲突；性能劣势明显 |
| **bun:sqlite** | 依赖 Bun 运行时（已淘汰，见 1.1） |
| **Prisma + SQLite** | ORM 抽象层增加构建耗时和依赖体积；生成的 SQL 不可控，性能调优受限；本项目表结构简单，手写 SQL 更清晰 |

### 1.5 日志：winston

| 维度 | 评估 |
|------|------|
| **选型理由** | 多 transport 支持（控制台 + 文件）；日志级别过滤；结构化 JSON 输出（生产）；社区标准方案 |
| **淘汰方案** | pino、console.log |

#### 对比淘汰

| 方案 | 淘汰理由 |
|------|---------|
| **pino** | 性能优于 winston，但本项目日志量极小（< 1000 条/天），性能差异无意义；API 风格与团队偏好不一致 |
| **console.log** | 无级别控制；无文件输出；无结构化格式；生产环境无法采集 |

### 1.6 文件上传：multer

| 维度 | 评估 |
|------|------|
| **选型理由** | Express 生态标准文件上传中间件；multipart/form-data 解析成熟；支持文件大小/类型过滤 |
| **淘汰方案** | formidable、busboy（底层）、express-fileupload |

#### 对比淘汰

| 方案 | 淘汰理由 |
|------|---------|
| **formidable** | API 设计过时，Promise 支持不原生 |
| **busboy** | multer 底层已封装 busboy，直接用 busboy 增加样板代码 |
| **express-fileupload** | 将文件缓冲在内存，大文件风险高；multer 支持磁盘流式写入 |

---

## 二、TypeScript 语言工程规范（强制）

### 2.1 类型定义

- **所有变量/函数/参数必须有显式类型**，禁止依赖类型推断（除非是立即调用的箭头函数且上下文明确）
- **禁止 `any`**：仅在 `express` 中间件签名与第三方库类型兼容时使用 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 加上注释说明原因
- **禁止 `as` 类型断言**：使用类型守卫 (`typeof`/`instanceof`/自定义 type guard) 替代；仅在 API 响应数据处理时允许 `as` 配合明确注释
- **接口优先于 type**：数据模型使用 `interface`（可扩展），联合类型/交叉类型使用 `type`
- **文件命名**：`kebab-case.ts`；类型文件 `types.ts`（非 `index.ts`，避免 IDE 标签页混乱）

### 2.2 导出规范

- **禁止 `export default`**：全部使用命名导出 `export function x()` / `export class X`，确保 IDE 自动导入和重构安全
- **每个文件只导出一个核心概念**：一个文件对应一个类/一个函数集合（如 `cardRepo.ts` 只导出 `cardRepo` 对象）

### 2.3 异步处理

- **禁止 callback 风格**：所有异步操作使用 `async/await`
- **不混用 Promise.then 和 await**：统一用 `await`
- **顶层 await 允许**（tsx 支持）

### 2.4 不可变性

- 函数参数使用 `readonly` 修饰（如 `readonly cards: Card[]`）
- 返回数组/对象时优先返回新对象，不修改入参

---

## 三、Express 框架最佳实践（强制）

### 3.1 路由注册

```text
规则：路由文件只做路径注册，一行一个端点，不写逻辑

正确示例（架构层面）：
  router.get('/decks', deckController.list)
  router.post('/decks', deckController.create)
  router.get('/decks/:id', deckController.getById)

错误示例：
  router.get('/decks', (req, res) => {
    // 直接在回调里写逻辑 — 违反分层
  })
```

### 3.2 中间件使用

| 中间件 | 作用域 | 说明 |
|--------|--------|------|
| `express.json()` | 全局 | 解析 JSON body，限制 `limit: '1mb'` |
| `express.urlencoded()` | 全局 | 解析 URL 编码 body |
| `cors()` | 全局 | 仅允许 `CORS_ORIGIN` 配置的源 |
| `requestLogger` | 全局 | 每个请求自动记录 |
| `authGuard` | `/api` 路由组 | Phase 1 为空中间件，Phase 2 启用 |
| `multer` | 指定端点 | 仅上传接口使用，不作为全局中间件 |
| `errorHandler` | 全局（最后） | 4 参数错误处理中间件 |

### 3.3 路由按资源分组

```text
src/routes/
├── index.ts         # 汇总：router.use('/decks', deckRoutes)
├── decks.ts         # /api/decks 所有端点
├── cards.ts         # /api/cards 和 /api/decks/:deckId/cards
├── review.ts        # /api/cards/:id/review 和 /api/decks/:deckId/due
├── notes.ts         # /api/notes 所有端点
├── folders.ts       # /api/folders 所有端点
├── stats.ts         # /api/stats 所有端点
├── templates.ts     # /api/templates 所有端点
└── importExport.ts  # /api/import 和 /api/export
```

每个资源文件导出一个 `Router` 实例。

### 3.4 不使用 Express 内置的错误处理

- 不在路由回调中调用 `next(err)`（除了 async wrapper）
- 统一用 `throw new AppError()` + 全局 `errorHandler` 中间件
- async 路由处理器用包装器捕获异常（避免 Express 4 不自动捕获 Promise rejection）

---

## 四、框架最大化利用原则

### 4.1 中间件组合 > 代码重复

- 所有路由共用的逻辑（日志/权限/CORS）必须走中间件，禁止在每个 controller 中重复
- 单路由特殊逻辑用 `router.use('/specific-path', specificMiddleware)` 精确挂载

### 4.2 Router 链式组织 > 散落注册

```text
正确：src/routes/decks.ts
  const router = Router()
  router.get('/', deckController.list)
  router.post('/', deckController.create)
  router.get('/:id', deckController.getById)
  ...
  export default router

错误：在 app.ts 中逐个 app.get('/api/decks', ...)
```

### 4.3 Express 原生能力优先于第三方库

| 场景 | 方案 | 说明 |
|------|------|------|
| 静态文件 | `express.static('uploads')` | 附件预览直接通过 Express 暴露 |
| 请求参数 | `req.params` / `req.query` / `req.body` | 不使用额外的 param 解析库 |
| 响应设置 | `res.status().json()` | 不使用额外的响应格式化库 |

### 4.4 错误处理中间件 — Express 4 参数识别

- Express 通过**参数数量**识别错误处理中间件（4 个参数）
- errorHandler 必须是 4 参数签名 `(err, req, res, next)`
- 必须注册在所有路由之后（`app.use(routes)` 之后 `app.use(errorHandler)`）

### 4.5 子路由挂载

- 所有 `/api/*` 路由统一挂载在一个 `Router` 实例下
- `app.ts` 中一行 `app.use('/api', authGuard, apiRouter)` 完成所有 API 路由注册

---

## 五、目录约束（强制）

### 5.1 必须遵守的目录结构

```
server/src/
├── index.ts                     # 唯一入口：加载配置 → 连接 DB → 迁移 → 启动
├── app.ts                       # Express 应用组装（中间件注册顺序不可随意变更）
├── config.ts                    # 配置唯一出口，禁止其他文件读 process.env
│
├── db/                          # 数据库相关（仅连接 + 迁移，不包含业务查询）
│   ├── connection.ts            # 单例 getDb()，禁止多处创建连接
│   └── migrate.ts               # 建表语句 + 预置数据
│
├── middlewares/                  # 全局中间件，每个文件导出一个中间件函数
│   ├── requestLogger.ts
│   ├── authGuard.ts             # 权限占位（Phase 2 启用）
│   └── errorHandler.ts          # 必须最后注册
│
├── routes/                      # 路由层 — 仅路径注册
│   ├── index.ts                 # 汇总所有子路由
│   ├── decks.ts
│   ├── cards.ts
│   ├── review.ts
│   ├── notes.ts
│   ├── folders.ts
│   ├── stats.ts
│   ├── templates.ts
│   └── importExport.ts
│
├── controllers/                 # 控制器层 — 参数提取 + 校验 + 响应
│   ├── deckController.ts
│   ├── cardController.ts
│   ├── reviewController.ts
│   ├── noteController.ts
│   ├── folderController.ts
│   ├── statsController.ts
│   ├── templateController.ts
│   └── importExportController.ts
│
├── services/                    # 服务层 — 业务逻辑
│   ├── deckService.ts
│   ├── cardService.ts
│   ├── reviewService.ts
│   ├── noteService.ts
│   ├── folderService.ts
│   ├── statsService.ts
│   ├── templateService.ts
│   └── importExportService.ts
│
├── repositories/                # 数据访问层 — 纯 SQL
│   ├── deckRepo.ts
│   ├── cardRepo.ts
│   ├── reviewLogRepo.ts
│   ├── noteRepo.ts
│   ├── folderRepo.ts
│   ├── templateRepo.ts
│   └── examRepo.ts
│
├── utils/                       # 工具函数（纯函数，无副作用）
│   ├── logger.ts                # winston 实例
│   ├── response.ts              # success() / created() / fail()
│   ├── AppError.ts              # 自定义异常类
│   └── sm2.ts                   # SM-2 算法
│
└── types/
    └── index.ts                 # 后端共享类型定义
```

### 5.2 目录纪律

- **禁止跨层引用**：controller 不能 import repository；service 不能 import controller
- **禁止循环引用**：任何文件之间不能形成 import 环
- **禁止在非 routes/ 目录中调用 `Router()`**
- **禁止在 non-middleware 目录中访问 `req`/`res` 对象**
- **utils/ 中只允许纯函数**，禁止调用数据库、文件系统（logger 除外，因为它是配置单例）

### 5.3 文件大小约束

| 文件类型 | 最大行数 | 超过时的处理 |
|----------|---------|-------------|
| controller | 80 行 | 拆分母服务 |
| service | 120 行 | 拆分子服务 |
| repository | 100 行 | 拆分子查询模块 |
| route | 40 行 | 每个资源一个路由文件已足够 |

---

## 六、接口响应规则（强制）

### 6.1 统一响应体结构

```typescript
// 成功：HTTP 200 或 201
{
  code: 0,
  message: "ok",
  data: T                    // T 为接口返回的数据类型
}

// 失败：HTTP 400 / 404 / 409 / 500
{
  code: number,              // 业务错误码（见 6.2）
  message: string,           // 人可读的错误描述（中文）
  data: null
}
```

- `code` 字段**永远存在**，前端通过 `code === 0` 判断成功
- `data` 成功时为具体数据，失败时为 `null`
- **不允许**返回 `{ success: true/false }` 或其他自定义顶层字段

### 6.2 错误码全量表

| code | HTTP | 常量标识 | message | 触发场景 |
|------|------|---------|---------|---------|
| 0 | 200 | `SUCCESS` | ok | 所有正常响应 |
| 40001 | 400 | `MISSING_FIELD` | 缺少必填字段：`{field}` | controller 层参数校验 |
| 40002 | 400 | `INVALID_FORMAT` | 格式校验失败：`{detail}` | 值类型错误、长度超限 |
| 40003 | 400 | `INVALID_RESULT` | 复习结果值无效，允许值：forgot/hard/good/easy | 复习结果不在枚举范围 |
| 40004 | 400 | `EMPTY_DECK` | 牌组内无卡片 | 进入空牌组的复习模式 |
| 40005 | 400 | `INVALID_JSON` | 导入数据 JSON 格式错误 | 导入接口 body 解析失败 |
| 40401 | 404 | `DECK_NOT_FOUND` | 牌组不存在 | 查询/操作不存在的牌组 |
| 40402 | 404 | `CARD_NOT_FOUND` | 卡片不存在 | 查询/操作不存在的卡片 |
| 40403 | 404 | `NOTE_NOT_FOUND` | 笔记不存在 | 查询/操作不存在的笔记 |
| 40404 | 404 | `FOLDER_NOT_FOUND` | 文件夹不存在 | 查询/操作不存在的文件夹 |
| 40405 | 404 | `TEMPLATE_NOT_FOUND` | 模板不存在 | 查询不存在的模板 |
| 40901 | 409 | `DECK_DUPLICATE` | 同名牌组已存在 | 创建牌组时名称冲突 |
| 40902 | 409 | `FOLDER_NOT_EMPTY` | 文件夹非空，无法删除 | 删除含子文件夹/笔记的文件夹 |
| 40903 | 409 | `DEFAULT_TEMPLATE` | 系统默认模板不可删除 | 删除 is_default=1 的模板 |
| 50001 | 500 | `DB_ERROR` | 数据库操作失败 | SQL 执行异常 |
| 50002 | 500 | `FILE_WRITE_ERROR` | 文件写入失败 | 上传文件磁盘写入异常 |
| 50003 | 500 | `FILE_READ_ERROR` | 文件读取失败 | 导出/读取文件异常 |
| 50004 | 500 | `INTERNAL_ERROR` | 服务器内部错误 | 未知异常兜底 |

### 6.3 响应工具函数（强制使用）

- 所有 controller **必须**通过 `utils/response.ts` 中的工具函数发送响应
- **禁止**直接调用 `res.json()` 或 `res.status().json()`

```text
工具函数（仅描述签名）：
  success<T>(res, data: T, message?: string)
  created<T>(res, data: T)
  fail(res, code: number, message: string, httpStatus?: number)
```

---

## 七、错误处理规则（强制）

### 7.1 异常体系

```text
AppError (utils/AppError.ts)
  ├─ 属性：code (业务错误码), message (描述), httpStatus (HTTP 状态码，默认 400)
  ├─ 继承自 Error，保留 stack trace
  └─ 用于所有可预期的业务异常

未知 Error
  └─ 未被 AppError 捕获的异常 → errorHandler 兜底 → 50004 + 脱敏消息
```

### 7.2 异常抛出规则

| 层 | 可抛出的异常 | 示例 |
|----|------------|------|
| controller | 参数校验异常 | `throw new AppError(40001, '缺少必填字段 front')` |
| service | 资源不存在 / 业务冲突 | `throw new AppError(40401, '牌组不存在')` |
| service | 业务冲突 | `throw new AppError(40901, '同名牌组已存在')` |
| repository | — | **不主动抛 AppError**，让数据库原生异常向上传播 |
| utils | — | 纯函数不抛异常（SM-2 算法内部做边界约束） |

### 7.3 异常传播链

```text
controller 调用 service → service 抛出 AppError
  → controller 中的 try-catch (或 async wrapper) 捕获
  → 调用 next(error) 传递给 Express
  → errorHandler 中间件处理：
      ├─ AppError → fail(res, err.code, err.message, err.httpStatus)
      └─ 其他    → logger.error(stack) → fail(res, 50004, '服务器内部错误', 500)
```

### 7.4 async 路由包装器（强制）

- 所有 async controller handler **必须**通过包装器调用，确保 Promise rejection 被正确传递给 Express error handler
- Express 4 不会自动捕获 async 函数中的异常

### 7.5 事务异常保障

- 复习提交 (`reviewService.submit`) 和导入 (`importExportService.importJson`) 使用 `db.transaction()` 包装
- 事务内任何异常 → SQLite 自动回滚 → 异常向上传播

---

## 八、日志规则（强制）

### 8.1 日志级别使用规范

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| `error` | 需要立即关注的异常：数据库错误、文件读写失败、未捕获异常 | `logger.error('数据库写入失败', { error: err.message, stack: err.stack })` |
| `warn` | 预期内的业务失败：资源不存在、校验失败、业务冲突 | `logger.warn('牌组不存在', { deckId: 42 })` |
| `info` | 正常业务流程：请求摘要、服务启动、迁移完成 | `logger.info('请求完成', { method, url, status, duration })` |
| `debug` | 开发调试信息：请求体、SQL 参数、SM-2 计算中间值 | `logger.debug('SM-2 计算', { input, output })` |

### 8.2 必须记录日志的节点

| 节点 | 级别 | 说明 |
|------|------|------|
| 服务启动 | info | 端口号、环境、数据库路径 |
| 数据库迁移 | info | 迁移完成的表数量 |
| 每个 HTTP 请求 | info | method + url + status + duration（由 requestLogger 中间件自动处理） |
| 业务异常 | warn | 错误码 + 消息 + 请求参数 |
| 未捕获异常 | error | 错误消息 + stack trace + 请求上下文 |
| 文件操作失败 | error | 文件路径 + 错误详情 |

### 8.3 日志格式

| 环境 | 格式 | 目标 |
|------|------|------|
| development | 带颜色可读文本 | 控制台 |
| production | JSON（每行一条） | 控制台 + `logs/combined.log` |

### 8.4 禁止行为

- **禁止** `console.log`（统一用 logger）
- **禁止**在日志中记录密码/token/密钥
- **禁止**在日志中记录完整文件内容（仅记录文件路径和大小）

---

## 九、数据库连接规则（强制）

### 9.1 连接方式

- **单例模式**：整个应用生命周期只有一个 `better-sqlite3` Database 实例
- **获取方式**：`import { getDb } from './db/connection'` — 全局唯一入口
- **禁止**在其他文件直接 `new Database(...)`，严禁多处创建连接

### 9.2 连接配置

| 配置 | 值 | 说明 |
|------|-----|------|
| WAL 模式 | `PRAGMA journal_mode=WAL` | 提升并发读取性能（即使单用户也启用，为后续扩展留基础） |
| 外键约束 | `PRAGMA foreign_keys=ON` | 强制外键完整性（SQLite 默认关闭，必须手动开启） |
| 繁忙超时 | `PRAGMA busy_timeout=5000` | 5 秒超时，避免并发写入时的 `SQLITE_BUSY` 错误 |

### 9.3 连接生命周期

```
应用启动 → getDb() → 检查 data/ 目录是否存在，不存在则创建
                  → 创建 Database 实例
                  → 执行 PRAGMA 配置
                  → 执行迁移
                  → 服务启动
应用退出 → process.on('SIGINT') → db.close() → process.exit(0)
```

### 9.4 查询规范

- **参数化查询**：所有 SQL 使用 `?` 占位符 + 参数数组，禁止字符串拼接
- **禁止**模板字符串拼接 SQL（`SELECT * FROM cards WHERE id = ${id}` — 即使本地无注入风险，也作为工程纪律执行）
- **禁止**在 repository 之外编写 SQL 语句

---

## 十、权限校验入口（强制）

### 10.1 当前阶段（Phase 1）

- `authGuard` 中间件已创建并挂载在所有 `/api` 路由上
- 当前行为：**直接调用 `next()`**，不做任何校验
- 目的：预留架构插槽，Phase 2 启用时零路由改动

### 10.2 设计预留

```text
middlewares/authGuard.ts 当前签名：
  (req, res, next) => { next() }

Phase 2 启用后的预期行为：
  1. 读取 req.headers.authorization
  2. 解析 Bearer <token>
  3. 验证 JWT 有效性
  4. 注入 req.userId = decoded.sub
  5. 验证失败 → throw new AppError(40101, '未登录', 401)
```

### 10.3 挂载位置

```text
app.ts 中的注册顺序：
  app.use('/api', authGuard, apiRouter)
                     ↑
              所有 /api 请求都必须经过 authGuard
              包括 /api/health（如果需要鉴权）或单独在 authGuard 之前注册
```

- `/api/health` 可能需要在 `authGuard` 之前单独注册（便于负载均衡器健康检查）
- 其余所有 API 端点统一走 `authGuard`

---

## 十一、新增模块操作规范

### 11.1 判断是否需要新建模块

以下情况需要新增独立模块（routes + controller + service + repository 全套）：
- 新增一个**独立的资源类型**（如：标签、评论、学习计划）
- 新增一个**独立的业务场景**（如：拼写测试模式、听力模式）

以下情况只需在现有模块内扩展：
- 对已有资源的字段扩展（如：卡片增加「难度」字段）→ 扩展 `cardService` + `cardRepo`
- 对已有资源的查询扩展（如：按标签筛选卡片）→ 扩展 `cardController` + `cardService`

### 11.2 新增模块步骤（按顺序执行）

#### Step 1：定义类型

在 `src/types/index.ts` 中添加：
- 数据模型接口（如 `Tag`）
- DTO 接口（`CreateTagDto`、`UpdateTagDto`）
- 如有 API 特有响应类型也在此定义

#### Step 2：创建 Repository

在 `src/repositories/` 中创建文件：
- 文件命名：`<资源名>Repo.ts`（如 `tagRepo.ts`）
- 导出对象，包含方法：`getAll` / `getById` / `insert` / `update` / `remove`
- 只包含纯 SQL 操作，使用参数化查询
- 不包含业务规则

#### Step 3：创建 Service

在 `src/services/` 中创建文件：
- 文件命名：`<资源名>Service.ts`（如 `tagService.ts`）
- 导出对象，包含业务逻辑方法
- 调用 repository 并编排多表操作
- 负责抛出 `AppError`（资源不存在、业务冲突）

#### Step 4：创建 Controller

在 `src/controllers/` 中创建文件：
- 文件命名：`<资源名>Controller.ts`
- 导出对象，每个方法签名 `(req, res) => void`
- 提取 `req.params` / `req.query` / `req.body`
- 参数校验（必填/格式）→ 校验失败 `throw new AppError`
- 调用 service → 用 `success()` / `created()` 返回

#### Step 5：创建 Route

在 `src/routes/` 中创建文件：
- 文件命名：`<资源名>.ts`
- 导出 `Router` 实例
- 一行一个端点注册：`router.get('/', controller.list)`

#### Step 6：注册路由

在 `src/routes/index.ts` 中：
- import 新路由
- `router.use('/<资源名>', <资源名>Routes)`

#### Step 7：前端对接

在 `client/src/api/` 中添加对应的 API 模块，函数签名对齐后端端点。

### 11.3 新增模块检查清单

- [ ] types/index.ts 已添加新类型
- [ ] repository 已创建，方法使用参数化查询
- [ ] service 已创建，业务逻辑与 repository 分离
- [ ] controller 已创建，参数校验完整
- [ ] route 已创建并注册到 routes/index.ts
- [ ] 错误码如需要已在错误码表中注册
- [ ] 没有跨层引用（controller → repo / service → req/res 等）

---

## 十二、开发环境与脚本

### 12.1 必须可用的脚本

| 脚本 | 命令 | 说明 |
|------|------|------|
| dev | `tsx watch src/index.ts` | 热重载开发 |
| build | `tsc` | TypeScript 编译 |
| start | `node dist/index.js` | 生产启动 |
| typecheck | `tsc --noEmit` | 仅类型检查（CI 使用） |

### 12.2 环境变量

- `.env.example` 提交到 Git（包含所有可配置项及默认值）
- `.env` 不提交（`.gitignore` 中声明）
- 配置加载在 `config.ts` 中集中完成，启动时校验必要配置项

---

## 十三、验收清单

### 技术选型
- [ ] 所有引入依赖有明确的选型理由文档记录
- [ ] 所有淘汰方案有明确的对比淘汰理由

### 分层架构
- [ ] 无跨层 import（controller ∉ → repo，service ∉ → req/res）
- [ ] 无循环引用
- [ ] 无 `console.log`（统一用 logger）
- [ ] 无直接 `res.json()`（统一用 `success`/`created`/`fail`）
- [ ] 无 `any` 类型（除明确豁免且注释说明的少数场景）

### 接口规范
- [ ] 所有响应结构为 `{ code, message, data }`
- [ ] 错误码在错误码表中已注册，无临时自创错误码
- [ ] async controller handler 使用包装器

### 数据库
- [ ] WAL 模式 + 外键约束已开启
- [ ] 所有查询使用参数化占位符，无字符串拼接 SQL
- [ ] 单例 `getDb()`，无重复连接

### 权限
- [ ] authGuard 已挂载到 `/api` 路由组
- [ ] `/api/health` 路由位置正确（authGuard 之前或内部放行）

### 日志
- [ ] 服务启动/停止有 info 日志
- [ ] 每个 HTTP 请求有 info 日志（含 method/url/status/duration）
- [ ] 异常日志含 stack trace（仅存文件不返回客户端）

### 新增模块
- [ ] 按 11.2 定义的 7 步流程执行
- [ ] 通过 11.3 的检查清单全部条目
