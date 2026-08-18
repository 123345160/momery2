# Stage 3b Review API — 测试用例归档

> **归档时间**: 2026-08-18
> **验收结果**: 20 项测试全绿，0 失败
> **对应规范**: ARCH §6.2.4 复习 / DB §7.7 复习日志 / STANDARDS §13.2-§13.6
> **实施计划**: IMPLEMENTATION_PLAN.md Stage 3b
> **关联文档**: [stage3b-time-format-fix.md](file:///d:/vscode/momery2/daima/docs/stage3b-time-format-fix.md) / [time-handling-spec.md](file:///d:/vscode/momery2/daima/docs/time-handling-spec.md)

---

## 1. 文件索引

| 文件 | 位置 | 用途 |
|------|------|------|
| types/index.ts | [server/src/types/index.ts](file:///d:/vscode/momery2/daima/server/src/types/index.ts) | ReviewResult / CardState / CardNextState / ReviewProgress |
| sm2.ts | [server/src/utils/sm2.ts](file:///d:/vscode/momery2/daima/server/src/utils/sm2.ts) | SM-2 纯函数（calcNextState）+ toSqliteUTC 调用 |
| sqliteTime.ts | [server/src/utils/sqliteTime.ts](file:///d:/vscode/momery2/daima/server/src/utils/sqliteTime.ts) | toSqliteUTC 工具（时间格式统一） |
| reviewLogRepo.ts | [server/src/repositories/reviewLogRepo.ts](file:///d:/vscode/momery2/daima/server/src/repositories/reviewLogRepo.ts) | 复习日志数据访问（insert / getByDeckInRange / countByResult） |
| cardRepo.ts | [server/src/repositories/cardRepo.ts](file:///d:/vscode/momery2/daima/server/src/repositories/cardRepo.ts) | 卡片数据访问（updateReviewState / getDueCards） |
| reviewService.ts | [server/src/services/reviewService.ts](file:///d:/vscode/momery2/daima/server/src/services/reviewService.ts) | 复习业务（submitReview / getDueCards / getReviewProgress + 事务） |
| reviewController.ts | [server/src/controllers/reviewController.ts](file:///d:/vscode/momery2/daima/server/src/controllers/reviewController.ts) | 请求处理（参数校验 + 调 service + response） |
| reviewRoutes.ts | [server/src/routes/reviewRoutes.ts](file:///d:/vscode/momery2/daima/server/src/routes/reviewRoutes.ts) | 3 端点路由 |
| routes/index.ts | [server/src/routes/index.ts](file:///d:/vscode/momery2/daima/server/src/routes/index.ts) | 路由注册表（挂载 reviewRoutes） |
| stage3b-review-api-test.ts | [server/src/stage3b-review-api-test.ts](file:///d:/vscode/momery2/daima/server/src/stage3b-review-api-test.ts) | Node.js fetch 测试脚本（20 项） |

---

## 2. 端点清单

### 2.1 Review 端点（3 个）

| 方法 | 路径 | Controller | Service | 说明 |
|------|------|-----------|---------|------|
| POST | `/api/cards/:id/review` | reviewController.submit | reviewService.submitReview(cardId, result) | 提交复习评分（SM-2 计算 + 事务写入） |
| GET | `/api/decks/:deckId/due` | reviewController.getDueCards | reviewService.getDueCards(deckId) | 获取到期卡片列表 |
| GET | `/api/decks/:deckId/review-progress` | reviewController.getProgress | reviewService.getReviewProgress(deckId) | 牌组复习进度统计 |

### 2.2 路由挂载结构

```
app.use('/api', authGuard, apiRoutes)
  └── apiRoutes (Router)
       ├── /decks → deckRoutes           (Stage 3)
       │   └── ... (5 Deck + 2 嵌套 Card 端点)
       ├── /cards → cardRoutes           (Stage 3)
       │   └── ... (3 Card 端点)
       └── / → reviewRoutes              (Stage 3b)
            ├── POST /cards/:id/review              → reviewController.submit
            ├── GET  /decks/:deckId/due             → reviewController.getDueCards
            └── GET  /decks/:deckId/review-progress → reviewController.getProgress
```

> 注：review 端点跨 `/cards` 与 `/decks` 两个前缀，故 reviewRoutes 挂载于根 `/`，路径前缀写在每条路由中。

---

## 3. 测试用例清单

### 3.1 准备测试数据（5 项）

| # | 测试名 | 方法 | 路径 | 请求体 | 期望 HTTP | 期望 code | 关键断言 |
|---|--------|------|------|--------|:---------:|:---------:|---------|
| 0a | 创建牌组 | POST | /api/decks | `{name:"Review Test Deck"}` | 201 | 0 | `data:{id}` |
| 0b-0e | 创建 4 张卡片 | POST | /api/decks/:deckId/cards | `{front:"Q${i}=?", back:"A${i}"}` | 201 | 0 | `data:{id}` × 4 |

### 3.2 到期筛选（2 项）

| # | 测试名 | 方法 | 路径 | 期望 HTTP | 期望 code | 关键断言 |
|---|--------|------|------|:---------:|:---------:|---------|
| 1 | 复习前到期卡片 | GET | /api/decks/:deckId/due | 200 | 0 | `data.length === 4`（新建卡片 next_review=now 默认到期） |
| 6 | 复习后到期卡片 | GET | /api/decks/:deckId/due | 200 | 0 | `data.length === 0`（4 张均提交评分后 next_review 推后） |

### 3.3 SM-2 四种评分计算（4 项）

| # | 测试名 | 方法 | 路径 | 请求体 | 期望 HTTP | 期望 code | 关键断言 |
|---|--------|------|------|--------|:---------:|:---------:|---------|
| 2 | good（首次） | POST | /api/cards/:id/review | `{result:"good"}` | 201 | 0 | `repetitions=1, interval=1440, ease_factor=2.5, last_reviewed≠null` |
| 3 | easy（首次） | POST | /api/cards/:id/review | `{result:"easy"}` | 201 | 0 | `repetitions=1, interval=5760, ease_factor=2.65(+0.15)` |
| 4 | hard | POST | /api/cards/:id/review | `{result:"hard"}` | 201 | 0 | `repetitions=0, interval=1440, ease_factor=2.35(-0.15)` |
| 5 | forgot | POST | /api/cards/:id/review | `{result:"forgot"}` | 201 | 0 | `repetitions=0, interval=10, ease_factor=2.3(-0.2)` |

### 3.4 进度统计（1 项）

| # | 测试名 | 方法 | 路径 | 期望 HTTP | 期望 code | 关键断言 |
|---|--------|------|------|:---------:|:---------:|---------|
| 7 | 复习进度 | GET | /api/decks/:deckId/review-progress | 200 | 0 | `totalCards=4, dueCards=0, reviewedToday=4, accuracy=50` |

> accuracy = (good + easy) / total × 100 = (2/4) × 100 = 50

### 3.5 错误场景（7 项）

| # | 测试名 | 方法 | 路径 | 请求体 | 期望 HTTP | 期望 code | 错误码 | 验证点 |
|---|--------|------|------|--------|:---------:|:---------:|--------|--------|
| 8 | 卡片不存在 | POST | /api/cards/999/review | `{result:"good"}` | 404 | 40402 | CARD_NOT_FOUND | cardRepo.getById 返回 null |
| 9 | 无效 result | POST | /api/cards/:id/review | `{result:"invalid"}` | 400 | 40002 | INVALID_FORMAT | VALID_RESULTS.includes 守卫 |
| 10 | result 缺失 | POST | /api/cards/:id/review | `{}` | 400 | 40002 | INVALID_FORMAT | result === undefined 守卫 |
| 11 | 无效 cardId | POST | /api/cards/abc/review | `{result:"good"}` | 400 | 40002 | INVALID_FORMAT | Number.isInteger 守卫 |
| 12 | 牌组不存在（due） | GET | /api/decks/999/due | — | 404 | 40401 | DECK_NOT_FOUND | deckRepo.getById 返回 null |
| 13 | 无效 deckId（due） | GET | /api/decks/abc/due | — | 400 | 40002 | INVALID_FORMAT | Number.isInteger 守卫 |
| 14 | 牌组不存在（progress） | GET | /api/decks/999/review-progress | — | 404 | 40401 | DECK_NOT_FOUND | deckRepo.getById 返回 null |

### 3.6 清理（1 项）

| # | 测试名 | 方法 | 路径 | 期望 HTTP | 期望 code | 关键断言 |
|---|--------|------|------|:---------:|:---------:|---------|
| - | 级联清理 | DELETE | /api/decks/:deckId | 200 | 0 | 删除牌组（级联删 cards + review_logs） |

---

## 4. SM-2 算法预期值表

> 初始状态：`ease_factor=2.5, interval=0, repetitions=0`（新建卡片默认值）

| result | repetitions | interval（分钟） | ease_factor | next_review 偏移 | 说明 |
|--------|:-----------:|:----------------:|:-----------:|:----------------:|------|
| **good**（首次） | 1 | 1440（1天） | 2.5（不变） | +1 天 | 首次 good 进入正常复习循环 |
| **easy**（首次） | 1 | 5760（4天） | 2.65（+0.15） | +4 天 | 首次 easy 间隔更长，ef 提升 |
| **hard** | 0 | 1440（1天） | 2.35（-0.15） | +1 天 | 重置 repetitions，ef 下降 |
| **forgot** | 0 | 10（10分钟） | 2.3（-0.2） | +10 分钟 | 重置 repetitions，间隔最短，ef 下降最多 |

### 算法约束（sm2.ts 冻结常量）

| 常量 | 值 | 作用 |
|------|----|------|
| MIN_EASE_FACTOR | 1.3 | ef 下限（forgot 连续也不会低于 1.3） |
| MAX_INTERVAL | 525600 | interval 上限（365 天） |
| INTERVAL_FORGOT | 10 | forgot → 10 分钟 |
| INTERVAL_HARD | 1440 | hard → 1 天 |
| INTERVAL_FIRST_GOOD | 1440 | 首次 good → 1 天 |
| INTERVAL_FIRST_EASY | 5760 | 首次 easy → 4 天 |
| EF_DELTA_FORGOT | -0.20 | forgot 的 ef 调整 |
| EF_DELTA_HARD | -0.15 | hard 的 ef 调整 |
| EF_DELTA_EASY | +0.15 | easy 的 ef 调整 |
| EASY_MULTIPLIER | 1.3 | easy 间隔乘数（非首次） |

---

## 5. 校验规则

### 5.1 Controller 层类型守卫（reviewController.ts）

| 字段 | 守卫规则 | 错误码 | 测试 # |
|------|---------|--------|--------|
| cardId (params) | `!Number.isInteger(cardId) \|\| cardId <= 0` | 40002 INVALID_FORMAT | #11 |
| deckId (params) | `!Number.isInteger(deckId) \|\| deckId <= 0` | 40002 INVALID_FORMAT | #13 |
| result (body) | `result === undefined \|\| null \|\| typeof !== 'string' \|\| !VALID_RESULTS.includes(result)` | 40002 INVALID_FORMAT | #9, #10 |

### 5.2 Service 层业务规则（reviewService.ts）

| 规则 | 校验 | 错误码 | 测试 # |
|------|------|--------|--------|
| 卡片存在性 | `cardRepo.getById(cardId) === null` | 40402 CARD_NOT_FOUND | #8 |
| 评分合法性（再守一道） | `!VALID_RESULTS.includes(result)` | 40002 INVALID_FORMAT | #9 |
| 牌组存在性（due/progress） | `deckRepo.getById(deckId) === null` | 40401 DECK_NOT_FOUND | #12, #14 |

---

## 6. 事务原子性 + 级联验证

### 6.1 事务原子性（DB §7.7）

`submitReview` 使用 `runInTransaction` 保证以下两步原子执行：

```
runInTransaction(() => {
  cardRepo.updateReviewState(cardId, newState);   // 1. 更新卡片 SM-2 状态
  reviewLogRepo.insert({ cardId, deckId, result }); // 2. 写入复习日志
});
```

| 验证点 | 方式 |
|--------|------|
| 卡片状态已更新 | #2-#5 返回的 data 含新 repetitions/interval/ease_factor |
| 复习日志已写入 | #7 reviewedToday=4（今日范围内查到 4 条记录） |
| 任一步失败则回滚 | 事务保证（SQLite transaction） |

### 6.2 级联删除

| 操作 | 级联目标 | 验证方式 |
|------|---------|---------|
| DELETE /api/decks/:id | cards 表 + review_logs 表（FK ON DELETE CASCADE） | 清理步骤删除牌组成功 |

---

## 7. 时间格式验证（关联 stage3b-time-format-fix.md）

| 验证点 | 测试 # | 结果 |
|--------|--------|:----:|
| next_review 格式 = `YYYY-MM-DD HH:MM:SS`（无 T/Z/毫秒） | #2-#5 | ✅ |
| next_review 与 datetime('now') 字典序兼容（到期筛选有效） | #1, #6 | ✅ |
| reviewedToday 统计基于 UTC 今日范围（与时区无关） | #7 | ✅ |

详见 [stage3b-time-format-fix.md](file:///d:/vscode/momery2/daima/docs/stage3b-time-format-fix.md) 与 [time-handling-spec.md](file:///d:/vscode/momery2/daima/docs/time-handling-spec.md)。

---

## 8. 运行方式

```bash
# 1. 启动服务（终端 1）
cd server
npm run dev

# 2. 运行测试（终端 2）
cd server
npx tsx src/stage3b-review-api-test.ts
```

### 运行环境

| 项 | 值 |
|----|-----|
| Node.js | v22+ |
| SQLite | 3.49.2 |
| 测试脚本 | [stage3b-review-api-test.ts](file:///d:/vscode/momery2/daima/server/src/stage3b-review-api-test.ts) |
| 测试方式 | Node.js fetch（绕过 PowerShell 引号问题） |
| 数据库 | 文件模式 ./data/app.db（非内存） |
| SM-2 实现 | [sm2.ts](file:///d:/vscode/momery2/daima/server/src/utils/sm2.ts) calcNextState 纯函数 |

---

## 9. 验收结论

| 分类 | 测试数 | 通过 | 失败 |
|------|:------:|:----:|:----:|
| 准备测试数据 | 5 | 5 | 0 |
| 到期筛选 | 2 | 2 | 0 |
| SM-2 四评分计算 | 4 | 4 | 0 |
| 进度统计 | 1 | 1 | 0 |
| 错误场景 | 7 | 7 | 0 |
| 清理（级联删除） | 1 | 1 | 0 |
| **合计** | **20** | **20** | **0** |

### 规范符合性

| 规范条目 | 验收项 | 结果 |
|----------|--------|:----:|
| ARCH §6.2.4 | Review 3 端点全实现（submit/due/progress） | ✅ |
| DB §7.7 | 复习日志写入 + 事务原子性 | ✅ |
| ARCH §7.4 | 错误码统一（40402 CARD_NOT_FOUND / 40401 DECK_NOT_FOUND / 40002 INVALID_FORMAT） | ✅ |
| STANDARDS §6.3 | 响应体统一（success/created） | ✅ |
| STANDARDS §7.4 | asyncHandler 包装所有 controller | ✅ |
| SM-2 算法 | 四种评分的 interval/repetitions/ease_factor 计算正确 | ✅ |
| 时间规范 | next_review 格式与 datetime('now') 一致（toSqliteUTC） | ✅ |
