# Stage 3 Deck & Card API — 测试用例归档

> **归档时间**: 2026-08-18
> **验收结果**: 17 项测试全绿，0 失败
> **对应规范**: ARCH §6.2.2 牌组 / §6.2.3 卡片 / STANDARDS §13.2-§13.6
> **实施计划**: IMPLEMENTATION_PLAN.md Stage 3

---

## 1. 文件索引

| 文件 | 位置 | 用途 |
|------|------|------|
| types/index.ts | [server/src/types/index.ts](file:///d:/vscode/momery2/daima/server/src/types/index.ts) | Deck/Card 实体 + DTO + PaginatedResult |
| deckService.ts | [server/src/services/deckService.ts](file:///d:/vscode/momery2/daima/server/src/services/deckService.ts) | 牌组业务逻辑（list/getById/create/update/remove） |
| cardService.ts | [server/src/services/cardService.ts](file:///d:/vscode/momery2/daima/server/src/services/cardService.ts) | 卡片业务逻辑（listByDeck/create/createBatch/update/remove） |
| deckController.ts | [server/src/controllers/deckController.ts](file:///d:/vscode/momery2/daima/server/src/controllers/deckController.ts) | 牌组请求处理（类型守卫 + 调 service + response） |
| cardController.ts | [server/src/controllers/cardController.ts](file:///d:/vscode/momery2/daima/server/src/controllers/cardController.ts) | 卡片请求处理 |
| deckRoutes.ts | [server/src/routes/deckRoutes.ts](file:///d:/vscode/momery2/daima/server/src/routes/deckRoutes.ts) | 7 端点（Deck CRUD 5 + 嵌套 Card 2） |
| cardRoutes.ts | [server/src/routes/cardRoutes.ts](file:///d:/vscode/momery2/daima/server/src/routes/cardRoutes.ts) | 3 端点（batch/update/remove） |
| routes/index.ts | [server/src/routes/index.ts](file:///d:/vscode/momery2/daima/server/src/routes/index.ts) | 路由注册表 |
| app.ts | [server/src/app.ts](file:///d:/vscode/momery2/daima/server/src/app.ts) | 中间件组装 + 路由挂载 |
| stage3-api-test.ts | [server/src/stage3-api-test.ts](file:///d:/vscode/momery2/daima/server/src/stage3-api-test.ts) | Node.js fetch 测试脚本（17 项） |

---

## 2. 端点清单

### 2.1 Deck 端点（5 个）

| 方法 | 路径 | Controller | Service | 说明 |
|------|------|-----------|---------|------|
| GET | `/api/decks` | deckController.list | deckService.list(?search,?page,?limit) | 牌组列表（分页+搜索+计数） |
| POST | `/api/decks` | deckController.create | deckService.create(dto) | 创建牌组 |
| GET | `/api/decks/:id` | deckController.getById | deckService.getById(id) | 牌组详情（+card_count+due_count） |
| PUT | `/api/decks/:id` | deckController.update | deckService.update(id, dto) | 更新牌组 |
| DELETE | `/api/decks/:id` | deckController.remove | deckService.remove(id) | 删除牌组（级联删除卡片） |

### 2.2 Card 端点（5 个）

| 方法 | 路径 | Controller | Service | 说明 |
|------|------|-----------|---------|------|
| GET | `/api/decks/:deckId/cards` | cardController.listByDeck | cardService.listByDeck(deckId, ?page,?limit,?sort) | 牌组下卡片列表 |
| POST | `/api/decks/:deckId/cards` | cardController.create | cardService.create(deckId, dto) | 在指定牌组下创建卡片 |
| POST | `/api/cards/batch` | cardController.createBatch | cardService.createBatch({deckId, cards}) | 批量创建卡片 |
| PUT | `/api/cards/:id` | cardController.update | cardService.update(id, dto) | 更新卡片 |
| DELETE | `/api/cards/:id` | cardController.remove | cardService.remove(id) | 删除卡片（级联删除复习日志） |

### 2.3 路由挂载结构

```
app.use('/api', authGuard, apiRoutes)
  ├── GET /api/health               ← app.get() 直接注册（在 authGuard 之前）
  └── apiRoutes (Router)
       ├── /decks → deckRoutes
       │   ├── GET  /                 → deckController.list
       │   ├── POST /                 → deckController.create
       │   ├── GET  /:id              → deckController.getById
       │   ├── PUT  /:id              → deckController.update
       │   ├── DELETE /:id            → deckController.remove
       │   ├── GET  /:deckId/cards    → cardController.listByDeck
       │   └── POST /:deckId/cards    → cardController.create
       └── /cards → cardRoutes
           ├── POST /batch            → cardController.createBatch
           ├── PUT  /:id              → cardController.update
           └── DELETE /:id            → cardController.remove
```

---

## 3. 测试用例清单

### 3.1 Deck CRUD 正向流程（7 项）

| # | 测试名 | 方法 | 路径 | 请求体 | 期望 HTTP | 期望 code | 关键断言 |
|---|--------|------|------|--------|:---------:|:---------:|---------|
| 1 | 空牌组列表 | GET | /api/decks | — | 200 | 0 | `items:[], total:0, page:1, limit:20` |
| 2 | 创建牌组 | POST | /api/decks | `{name:"Test Deck", description:"for testing"}` | 201 | 0 | `data:{id:1}` |
| 3 | 1 项牌组列表 | GET | /api/decks | — | 200 | 0 | `total:1` |
| 4 | 牌组详情 | GET | /api/decks/1 | — | 200 | 0 | `card_count:0, due_count:0` |
| 5 | 更新牌组 | PUT | /api/decks/1 | `{name:"Updated Deck", description:"updated"}` | 200 | 0 | `data:{id:1}` |
| 11 | 删除牌组 | DELETE | /api/decks/1 | — | 200 | 0 | `data:{id:1}` |
| 12 | 删后空列表 | GET | /api/decks | — | 200 | 0 | `total:0` |

### 3.2 Card CRUD 正向流程（5 项）

| # | 测试名 | 方法 | 路径 | 请求体 | 期望 HTTP | 期望 code | 关键断言 |
|---|--------|------|------|--------|:---------:|:---------:|---------|
| 6 | 创建卡片 | POST | /api/decks/1/cards | `{front:"1+1=?", back:"2"}` | 201 | 0 | `data:{id:1}` |
| 7 | 牌组下卡片列表 | GET | /api/decks/1/cards | — | 200 | 0 | `total:1, limit:50` |
| 8 | 批量创建卡片 | POST | /api/cards/batch | `{deckId:1, cards:[{front:"2+2=?",back:"4"},{front:"3+3=?",back:"6"}]}` | 201 | 0 | `data:{ids:[2,3]}` |
| 9 | 更新卡片 | PUT | /api/cards/1 | `{front:"1+1=?", back:"equals 2"}` | 200 | 0 | `data:{id:1}` |
| 10 | 删除卡片 | DELETE | /api/cards/1 | — | 200 | 0 | `data:{id:1}` |

### 3.3 错误场景（5 项）

| # | 测试名 | 方法 | 路径 | 请求体 | 期望 HTTP | 期望 code | 错误码 | 验证点 |
|---|--------|------|------|--------|:---------:|:---------:|--------|--------|
| 13 | 空牌组名称 | POST | /api/decks | `{name:""}` | 400 | 40001 | MISSING_FIELD | name 为空字符串 |
| 14 | 牌组名称为数字 | POST | /api/decks | `{name:123}` | 400 | 40001 | MISSING_FIELD | typeof name !== 'string' 守卫 |
| 15 | 牌组不存在 | GET | /api/decks/999 | — | 404 | 40401 | DECK_NOT_FOUND | getById 返回 null |
| 16 | 批量创建 deckId 不存在 | POST | /api/cards/batch | `{deckId:999, cards:[]}` | 404 | 40401 | DECK_NOT_FOUND | deck 校验先于 cards 校验 |
| 17 | 非法 deckId | POST | /api/decks/abc/cards | `{front:"x", back:"y"}` | 400 | 40002 | INVALID_FORMAT | Number.isInteger 守卫 |

---

## 4. Controller 层校验规则

### 4.1 类型守卫（Controller 层负责）

| 字段 | 守卫规则 | 错误码 | 测试 # |
|------|---------|--------|--------|
| deckId (params) | `!Number.isInteger(id) \|\| id <= 0` | 40002 INVALID_FORMAT | #17 |
| name (create) | `!name \|\| typeof name !== 'string' \|\| !name.trim()` | 40001 MISSING_FIELD | #13, #14 |
| name (update) | `name !== undefined && (name === null \|\| typeof name !== 'string' \|\| !name.trim())` | 40001 MISSING_FIELD | — |
| folderId | `folderId !== undefined && folderId !== null && (!Number.isInteger(folderId) \|\| folderId <= 0)` | 40002 INVALID_FORMAT | — |
| front | `!front \|\| typeof front !== 'string' \|\| !front.trim()` | 40001 MISSING_FIELD | — |
| back | `!back \|\| typeof back !== 'string' \|\| !back.trim()` | 40001 MISSING_FIELD | — |
| page (query) | `!Number.isFinite(Number(page)) \|\| Number(page) <= 0` | 忽略，用默认值 | #1, #3 |
| limit (query) | `!Number.isFinite(Number(limit)) \|\| Number(limit) <= 0` | 忽略，用默认值 | #1, #3 |
| batch cards 元素 | `typeof card.front !== 'string' \|\| !card.front.trim()` | 40001 MISSING_FIELD | #8 |

### 4.2 业务规则（Service 层负责）

| 规则 | 校验 | 错误码 | 测试 # |
|------|------|--------|--------|
| 牌组名称长度 | `name.length > 100` | 40002 INVALID_FORMAT | — |
| 牌组存在性 | `deckRepo.getById(id) === null` | 40401 DECK_NOT_FOUND | #4, #5, #11, #15 |
| 卡片内容长度 | `front.length > 10000 \|\| back.length > 10000` | 40002 INVALID_FORMAT | — |
| 卡片存在性 | `cardRepo.getById(id) === null` | 40402 CARD_NOT_FOUND | #9, #10 |
| 批量创建 deck 存在 | 先校验 deck 存在 | 40401 DECK_NOT_FOUND | #16 |
| 批量创建数组非空 | `cards.length === 0` | 40004 EMPTY_DECK | — |
| 批量创建逐条校验 | 位置前缀 `第 N 张:` | 40001/40002 | #8 |

---

## 5. 级联删除验证

| 操作 | 级联目标 | 验证方式 |
|------|---------|---------|
| DELETE /api/decks/:id | cards 表 + review_logs 表（FK ON DELETE CASCADE） | #11 删除牌组后 #12 列表为空 |
| DELETE /api/cards/:id | review_logs 表（FK ON DELETE CASCADE） | #10 删除卡片成功 |

---

## 6. 运行方式

```bash
# 1. 启动服务（终端 1）
cd server
npm run dev

# 2. 运行测试（终端 2）
cd server
npx tsx src/stage3-api-test.ts
```

### 运行环境

| 项 | 值 |
|----|-----|
| Node.js | v22+ |
| SQLite | 3.49.2 |
| 测试脚本 | [stage3-api-test.ts](file:///d:/vscode/momery2/daima/server/src/stage3-api-test.ts) |
| 测试方式 | Node.js fetch（绕过 PowerShell 引号问题） |
| 数据库 | 文件模式 ./data/app.db（非内存） |

---

## 7. 验收结论

| 分类 | 测试数 | 通过 | 失败 |
|------|:------:|:----:|:----:|
| Deck CRUD 正向 | 7 | 7 | 0 |
| Card CRUD 正向 | 5 | 5 | 0 |
| 错误场景 | 5 | 5 | 0 |
| **合计** | **17** | **17** | **0** |

### 规范符合性

| 规范条目 | 验收项 | 结果 |
|----------|--------|:----:|
| ARCH §6.2.2 | Deck 5 端点全实现 | ✅ |
| ARCH §6.2.3 | Card 5 端点全实现 | ✅ |
| ARCH §7.4 | 错误码统一（AppError → code+message） | ✅ |
| STANDARDS §6.3 | 响应体统一（success/created/fail） | ✅ |
| STANDARDS §7.4 | asyncHandler 包装所有 controller | ✅ |
| STANDARDS §10.3 | authGuard 挂载 /api，health 在前 | ✅ |
| STANDARDS §11 | 七步流程完整（types→repo→service→controller→routes→index→app） | ✅ |
