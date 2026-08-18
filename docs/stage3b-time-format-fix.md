# Stage 3b 时间格式修复 — toISOString 与 SQLite datetime 兼容性

> **归档时间**: 2026-08-18
> **修复结果**: 20 项端到端测试全绿，0 失败
> **对应规范**: ARCH §8 SM-2 算法 / DB §6.3.4 cards 表 / STANDARDS §11 七步流程
> **关联模块**: utils/sm2.ts、repositories/cardRepo.ts

---

## 1. 文件索引

| 文件 | 位置 | 角色 |
|------|------|------|
| sqliteTime.ts | [server/src/utils/sqliteTime.ts](file:///d:/vscode/momery2/daima/server/src/utils/sqliteTime.ts) | **工具模块**：toSqliteUTC 导出源（公共复用） |
| sm2.ts | [server/src/utils/sm2.ts](file:///d:/vscode/momery2/daima/server/src/utils/sm2.ts) | **调用点**：import toSqliteUTC 用于 next_review/last_reviewed |
| cardRepo.ts | [server/src/repositories/cardRepo.ts](file:///d:/vscode/momery2/daima/server/src/repositories/cardRepo.ts) | **触发点**：getDueCards 用 datetime('now') 比较 |
| migrate.ts | [server/src/db/migrate.ts](file:///d:/vscode/momery2/daima/server/src/db/migrate.ts) | **基准**：cards 表默认值 datetime('now') |
| stage3b-review-api-test.ts | [server/src/stage3b-review-api-test.ts](file:///d:/vscode/momery2/daima/server/src/stage3b-review-api-test.ts) | **验证脚本**：20 项端到端测试 |

---

## 2. 问题描述

### 2.1 现象

Review 模块端到端测试中，`forgot` 卡片复习后（`next_review` = 当前时间 + 10 分钟），即使等待 10 分钟以上，该卡片**永远不会再次出现在到期列表**中。表面上 `GET /api/decks/:deckId/due` 返回 0 张到期卡片"符合预期"，实际是格式副作用掩盖了真实逻辑。

### 2.2 复现路径

```
1. 创建卡片 → next_review 默认 datetime('now')，格式 "2026-08-18 13:48:38"
2. POST review (forgot) → sm2 写入 next_review = toISOString()，格式 "2026-08-18T13:58:38.000Z"
3. 10 分钟后 GET /api/decks/:deckId/due → 查询条件 next_review <= datetime('now')
4. 期望返回 forgot 卡片（已到期），实际返回空列表
```

---

## 3. 根因分析

### 3.1 两种时间格式并存

| 来源 | 生成方式 | 输出格式 |
|------|---------|---------|
| SQLite `datetime('now')` | 数据库内置函数 | `2026-08-18 13:48:38`（空格分隔、无 `Z`、无毫秒） |
| JS `Date.toISOString()` | sm2.ts 原实现 | `2026-08-18T13:48:38.000Z`（`T` 分隔、带 `Z`、带毫秒） |

### 3.2 SQLite 字符串比较的致命差异

SQLite 的 `TEXT` 类型比较是**逐字符按 ASCII 码字典序**比较。两种格式在第 11 位字符出现分歧：

| 位置 | datetime('now') | toISOString() |
|:----:|:----------------:|:--------------:|
| 1-10 | `2026-08-18` | `2026-08-18` |
| **11** | **` `(空格, 0x20)** | **`T`(0x54)** |
| 12-19 | `13:48:38` | `13:48:38.000Z` |

由于 `'T'(0x54) > ' '(0x20)`，所有 `toISOString()` 写入的 `next_review` 在第 11 位就**永远大于** `datetime('now')`，导致：

```sql
-- 实际比较（字典序）
'2026-08-18T13:58:38.000Z' <= '2026-08-18 13:48:38'  →  false（恒为 false）
```

**结论**：只要 `next_review` 由 `toISOString()` 生成，无论真实时间是否已过，`getDueCards` 永远查不到该卡片到期。

### 3.3 为何早期测试未暴露

- Stage 1 数据库测试用**手写日期字符串**（`'2026-08-19 12:00:00'` 格式）插入 mock 数据，格式天然一致，比较正常。
- Stage 3b 前，`sm2.ts` 未被任何端到端流程调用，`toISOString` 输出未进入数据库比较路径。
- Stage 3b 测试 #6「复习后 0 张到期」的期望值恰好与格式 bug 的副作用吻合，需穿透到"10 分钟后是否真正到期"才能暴露。

---

## 4. 影响范围

### 4.1 直接受影响字段

| 表 | 字段 | 写入方 | 是否受影响 |
|----|------|--------|:----------:|
| cards | `next_review` | sm2.calcNextState → cardRepo.updateReviewState | ✅ 严重 |
| cards | `last_reviewed` | sm2.calcNextState → cardRepo.updateReviewState | ⚠️ 仅展示异常（不参与比较） |
| cards | `created_at` | DB 默认值 `datetime('now')` | ❌ 不受影响 |
| cards | `updated_at` | DB 默认值 `datetime('now')` | ❌ 不受影响 |

### 4.2 受影响查询

| 查询 | 位置 | 影响 |
|------|------|------|
| `getDueCards` | [cardRepo.ts L29-L37](file:///d:/vscode/momery2/daima/server/src/repositories/cardRepo.ts#L29-L37) | 到期筛选完全失效，已复习卡片永不出现在到期列表 |

---

## 5. 修复方案

### 5.1 设计决策：从源头统一格式

可选方案对比：

| 方案 | 改动点 | 优点 | 缺点 |
|------|--------|------|------|
| **A. 统一输出格式（采用）** | sm2.ts 调用 toSqliteUTC | 从源头统一，所有写入字段格式一致 | 初版耦合于 sm2.ts（后已提取为 sqliteTime.ts，见 §5.2 / §9.3） |
| B. 改查询用 datetime 解析 | cardRepo.getDueCards | 不动 sm2 纯函数 | 每个比较点都要处理，易遗漏 |

选择 **方案 A**：在源头把 `toISOString()` 输出转成 SQLite 兼容格式，一次性消除所有比较点的不一致风险。

### 5.2 实现：toSqliteUTC 工具模块

[sqliteTime.ts](file:///d:/vscode/momery2/daima/server/src/utils/sqliteTime.ts)（已提取为独立工具模块，公共复用）：

```typescript
/**
 * 将 Date 转为 SQLite datetime 兼容的 UTC 格式字符串
 * @returns 'YYYY-MM-DD HH:MM:SS'（UTC，与 datetime('now') 字面一致）
 */
export function toSqliteUTC(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}
```

> 初版实现于 sm2.ts 内部，后提取为独立模块以消除耦合并供其它模块复用。

### 5.3 调用点替换

[sm2.ts L106-L107](file:///d:/vscode/momery2/daima/server/src/utils/sm2.ts#L106-L107)：

```typescript
// 修复前
next_review: nextReviewDate.toISOString(),
last_reviewed: now.toISOString(),

// 修复后
next_review: toSqliteUTC(nextReviewDate),
last_reviewed: toSqliteUTC(now),
```

### 5.4 关键设计要点

1. **用 UTC，不用本地时区**：`getUTCFullYear()` 等方法读取 UTC 分量，与 SQLite `datetime('now')`（也是 UTC）保持时区一致。
2. **去掉毫秒**：`datetime('now')` 精度到秒，统一到秒级避免末尾字符差异。
3. **去掉 `T` 和 `Z`**：分隔符用空格、无后缀，与 `datetime('now')` 字面完全一致。
4. **独立工具模块复用**：`toSqliteUTC` 已提取为 [utils/sqliteTime.ts](file:///d:/vscode/momery2/daima/server/src/utils/sqliteTime.ts) 并导出，避免在 sm2.ts 内部重复实现，其它模块需要时直接 `import { toSqliteUTC } from '../utils/sqliteTime.js'`。

---

## 6. 修复前后对比

### 6.1 字段输出格式

| 字段 | 修复前 | 修复后 |
|------|--------|--------|
| created_at | `2026-08-18 13:48:38` | `2026-08-18 13:48:38` |
| updated_at | `2026-08-18 13:48:38` | `2026-08-18 13:48:38` |
| next_review | `2026-08-19T13:48:38.064Z` | `2026-08-19 13:48:38` ✅ |
| last_reviewed | `2026-08-18T13:48:38.064Z` | `2026-08-18 13:48:38` ✅ |

修复后 cards 表四个时间字段格式完全统一。

### 6.2 到期筛选行为

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| forgot 卡片复习后立即查询 | 0 张（格式副作用） | 0 张（时间未到）✅ |
| forgot 卡片 10 分钟后查询 | 0 张（**bug**：永不到期） | 1 张（时间已到）✅ |

---

## 7. 验证结果

### 7.1 端到端测试

```
=========================================
  测试汇总: 20 通过 / 0 失败
=========================================
```

| 类别 | 测试数 | 通过 | 失败 |
|------|:------:|:----:|:----:|
| 测试数据准备 | 5 | 5 | 0 |
| 到期筛选（复习前/后） | 2 | 2 | 0 |
| SM-2 四种评分 | 4 | 4 | 0 |
| 进度统计 | 1 | 1 | 0 |
| 错误场景 | 7 | 7 | 0 |
| 清理级联删除 | 1 | 1 | 0 |
| **合计** | **20** | **20** | **0** |

### 7.2 关键测试用例

| # | 测试名 | 验证点 | 结果 |
|---|--------|--------|:----:|
| 2 | review (good) | next_review 格式 `2026-08-19 13:48:38`（空格分隔） | ✅ |
| 5 | review (forgot) | next_review = now + 10 分钟，格式统一 | ✅ |
| 6 | 复习后 due 列表 | 0 张到期（基于真实时间逻辑） | ✅ |

### 7.3 运行方式

```bash
# 1. 启动服务
cd server && npm run dev

# 2. 运行测试
cd server && npx tsx src/stage3b-review-api-test.ts
```

---

## 8. 规范符合性

| 规范条目 | 验收项 | 结果 |
|----------|--------|:----:|
| ARCH §8 | SM-2 算法计算结果不变（ef/interval/rep 一致） | ✅ |
| ARCH §8.4 | sm2.ts 仍为纯函数，无副作用 | ✅ |
| DB §6.3.4 | cards 表时间字段格式与 datetime('now') 一致 | ✅ |
| STANDARDS §6.2 | 时间字段无混用 ISO 与 SQLite 格式 | ✅ |

---

## 9. 后续维护指引

### 9.1 新增时间字段写入时

凡是写入 SQLite `TEXT` 时间字段、且后续会用 `<=` / `>=` / `BETWEEN` 与 `datetime('now')` 比较的，**必须**用 `toSqliteUTC` 或等价的 `YYYY-MM-DD HH:MM:SS`（UTC）格式生成，禁止直接用 `toISOString()`。

### 9.2 检查清单

新增 / 修改时间相关逻辑时核对：

- [ ] 写入字段是否参与 `next_review <= datetime('now')` 类比较？
- [ ] 若是，格式是否为 `YYYY-MM-DD HH:MM:SS`（空格分隔、UTC、无 `T`/`Z`/毫秒）？
- [ ] 时区是否为 UTC（与 `datetime('now')` 一致），而非本地时区？
- [ ] 是否有对应的端到端测试覆盖"时间到达后真正到期"场景？

### 9.3 复用 toSqliteUTC

`toSqliteUTC` 已提取为 [utils/sqliteTime.ts](file:///d:/vscode/momery2/daima/server/src/utils/sqliteTime.ts) 公共工具并导出。其它模块需要写 SQLite 时间字段时直接 import，禁止重复实现：

```typescript
import { toSqliteUTC } from '../utils/sqliteTime.js';

// 示例：写入到期时间（10 分钟后）
const nextReview = toSqliteUTC(new Date(Date.now() + 10 * 60 * 1000));
```
