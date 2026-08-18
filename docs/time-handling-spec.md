# 时间处理规范 — 全链路规范与修复沉淀

> 文档定位：本文件是后端时间处理的**规范层**文档，沉淀 Stage 3b 两次修复（sm2.ts / reviewService.ts）的结论，并固化全链路的时间处理规则，供后续开发参照。
>
> 与 `stage3b-time-format-fix.md` 的关系：后者聚焦 `toSqliteUTC` 函数本身的修复与根因分析（点）；本文件聚焦**全链路规范**（面），引用后者作为具体案例。
>
> 适用范围：后端所有写入/查询 SQLite TEXT 时间字段的代码（utils / service / repo 层）。

---

## 1. 核心规范（4 条强制规则）

| # | 规则 | 要求 | 禁止 |
|---|------|------|------|
| **R1** | 统一时区为 UTC | 所有时间分量取值用 `getUTCFullYear()` / `getUTCMonth()` / `getUTCDate()` / `getUTCHours()` / `getUTCMinutes()` / `getUTCSeconds()` | `getFullYear()` / `getMonth()` / `getDate()` 等本地时区分量 |
| **R2** | 统一格式化为 `toSqliteUTC` | 凡写入 SQLite TEXT 时间字段、且后续参与 `<= / >= / BETWEEN` 与 `datetime('now')` 比较的，必须 `import { toSqliteUTC } from '../utils/sqliteTime.js'` 生成 | `toISOString()` / `toString()` / `toLocaleString()` / 手写 `${y}-${m}-${d}` 拼接 |
| **R3** | 分层职责 | 时间格式化只在 **utils 层**（sqliteTime.ts）实现 + **service 层**调用；controller 层不碰时间；repo 层用 DB 默认值 `datetime('now')` 或接收 service 传入的已格式化字符串 | 在 controller 内 `new Date()` / 在 repo 内手写时间拼接 |
| **R4** | 与 DB `datetime('now')` 字面一致 | 输出格式必须为 `YYYY-MM-DD HH:MM:SS`（空格分隔、UTC、无 `T` / 无 `Z` / 无毫秒），与 SQLite `datetime('now')` 字面一致，确保字符串字典序 = 时间先后序 | 任何带 `T` / `Z` / 毫秒的格式（会破坏字典序比较） |

---

## 2. 全链路时间处理全景

```
┌─────────────────────────────────────────────────────────────┐
│  utils/sqliteTime.ts                                        │
│  └─ toSqliteUTC(date): 'YYYY-MM-DD HH:MM:SS'（UTC）         │
│     工具源头，公共复用，所有格式化的唯一入口               │
└─────────────────────────────────────────────────────────────┘
                            ▲ import
       ┌────────────────────┼────────────────────┐
       │                    │                    │
┌──────┴───────┐    ┌───────┴────────┐    ┌──────┴──────────┐
│ utils/sm2.ts │    │ services/      │    │ （未来其它      │
│              │    │ reviewService  │    │   service 模块）│
│ calcNextState│    │ getReviewProgress│  │                 │
│ → next_review│    │ → todayStart/  │    │                 │
│ → last_reviewed│  │   todayEnd     │    │                 │
└──────┬───────┘    └───────┬────────┘    └─────────────────┘
       │                    │
       ▼ newState           ▼ UTC 范围字符串
┌──────────────────────────────────────────────────────────────┐
│  repositories 层                                             │
│  ├─ cardRepo.updateReviewState(id, newState)  ← 接收已格式化│
│  ├─ cardRepo.getDueCards(deckId)              ← datetime('now') 筛选
│  ├─ reviewLogRepo.insert({cardId,deckId,result}) ← 不传 reviewed_at
│  └─ reviewLogRepo.getByDeckInRange(deckId, from, to) ← BETWEEN UTC 范围
└──────────────────────────────────────────────────────────────┘
       │                                            │
       ▼                                            ▼
┌──────────────────────────────────────────────────────────────┐
│  SQLite DB 层                                                │
│  └─ datetime('now') 默认值 / 筛选基准（UTC，YYYY-MM-DD HH:MM:SS）│
└──────────────────────────────────────────────────────────────┘
```

### 2.1 各层职责清单

| 层 | 文件 | 时间处理方式 | 状态 |
|----|------|-------------|:----:|
| **工具** | [sqliteTime.ts](file:///d:/vscode/momery2/daima/server/src/utils/sqliteTime.ts) | `toSqliteUTC` 实现 + 导出 | ✅ 唯一源头 |
| **utils** | [sm2.ts](file:///d:/vscode/momery2/daima/server/src/utils/sm2.ts#L106-L107) | `import` + 调用 `toSqliteUTC` 生成 next_review/last_reviewed | ✅ |
| **service** | [reviewService.ts](file:///d:/vscode/momery2/daima/server/src/services/reviewService.ts#L128-L129) | `import` + `getUTC*` + `Date.UTC(...)` + `toSqliteUTC` 生成 todayStart/todayEnd | ✅ |
| **controller** | [reviewController.ts](file:///d:/vscode/momery2/daima/server/src/controllers/reviewController.ts) | 不碰时间（只校验参数 + 调 service） | ✅ 符合 R3 |
| **repo** | cardRepo / reviewLogRepo | 用 DB `datetime('now')` 默认值 / 接收 service 传入的 UTC 字符串 | ✅ |
| **DB** | migrate.ts | TEXT 字段 `DEFAULT datetime('now')`（UTC） | ✅ |

---

## 3. 本次修复沉淀（2 处点 + 1 次提取）

### 3.1 修复点 1：sm2.ts — `toISOString` → `toSqliteUTC`

| 项 | 内容 |
|----|------|
| **位置** | [sm2.ts calcNextState](file:///d:/vscode/momery2/daima/server/src/utils/sm2.ts#L106-L107) |
| **修复前** | `new Date(now.getTime() + newInterval * 60 * 1000).toISOString()` |
| **修复后** | `toSqliteUTC(new Date(now.getTime() + newInterval * 60 * 1000))` |
| **根因** | `toISOString` 输出 `...T...Z`，`'T'(0x54) > ' '(0x20)` 导致 next_review 永远大于 `datetime('now')`，到期筛选失效 |
| **影响字段** | next_review / last_reviewed |
| **详细文档** | [stage3b-time-format-fix.md](file:///d:/vscode/momery2/daima/docs/stage3b-time-format-fix.md) |

### 3.2 修复点 2：reviewService.ts — 本地时区拼接 → UTC + toSqliteUTC

| 项 | 内容 |
|----|------|
| **位置** | [reviewService.ts getReviewProgress](file:///d:/vscode/momery2/daima/server/src/services/reviewService.ts#L124-L131) |
| **修复前** | `today.getFullYear()` / `getMonth()` / `getDate()`（本地时区）+ 手写拼接 `YYYY-MM-DD 00:00:00` |
| **修复后** | `now.getUTCFullYear()` / `getUTCMonth()` / `getUTCDate()` + `Date.UTC(...)` + `toSqliteUTC(...)` |
| **根因** | 本地时区分量与 DB `reviewed_at`（`datetime('now')` UTC）时区不一致，UTC+8 凌晨 0-8 点本地"今日"与 UTC"今日"错位，导致 `reviewedToday` 统计偏差 |
| **影响字段** | todayStart / todayEnd（用于 BETWEEN 范围查询 review_logs） |
| **验证** | 端到端测试 #7 reviewedToday=4 通过 |

### 3.3 工具提取：sqliteTime.ts 独立模块

| 项 | 内容 |
|----|------|
| **动机** | toSqliteUTC 初版实现于 sm2.ts 内部（未导出），无法被其它模块复用，存在重复实现风险 |
| **提取后** | [sqliteTime.ts](file:///d:/vscode/momery2/daima/server/src/utils/sqliteTime.ts) 导出 `toSqliteUTC`，sm2.ts 改为 `import` |
| **价值** | 工具源头唯一化；reviewService.ts 直接 import 复用（见 3.2）；未来其它模块按相同方式复用 |
| **单元测试** | [sqliteTime-test.ts](file:///d:/vscode/momery2/daima/server/src/utils/sqliteTime-test.ts) 26 项全绿，覆盖 9 个边界维度 |
| **tsconfig** | `exclude` 从 `src/stage*-test.ts` 扩大为 `src/**/*-test.ts`，统一排除所有测试文件 |

---

## 4. reviewService.ts 全文检查结论

对 [reviewService.ts](file:///d:/vscode/momery2/daima/server/src/services/reviewService.ts) 全文（149 行）逐行扫描，确认**无其他本地时区时间处理逻辑**：

| 行 | 代码 | 时区状态 |
|:--:|------|:------:|
| 53 | `calcNextState(...)` | ✅ 委托 sm2（已用 toSqliteUTC） |
| 72 | `cardRepo.updateReviewState(cardId, newState)` | ✅ newState 已 UTC |
| 73-77 | `reviewLogRepo.insert({cardId, deckId, result})` | ✅ 不传 reviewed_at，用 DB `datetime('now')` |
| 102 | `cardRepo.getDueCards(deckId)` | ✅ 委托 repo，DB `datetime('now')` 筛选 |
| 127 | `const now = new Date();` | ✅ 绝对时刻（UTC 时间戳），无时区问题 |
| 128-129 | `now.getUTC*` + `Date.UTC` + `toSqliteUTC` | ✅ 已修复（见 3.2） |
| 130 | `reviewLogRepo.getByDeckInRange(...)` | ✅ 用 UTC 范围 |

**关键澄清**：`new Date()` 返回当前 UTC 时间戳（绝对时刻），本身无时区问题。时区只在以下两种操作时才相关：
- **取分量**：`getFullYear()`（本地） vs `getUTCFullYear()`（UTC）——本文件用后者 ✅
- **格式化**：`toString()`（本地） vs `toUTCString()` / `toSqliteUTC`（UTC）——本文件用后者 ✅

**禁止 API 清单**（reviewService.ts 已无任何残留）：
- `getFullYear()` / `getMonth()` / `getDate()` / `getHours()` / `getMinutes()` / `getSeconds()`（本地时区分量）
- `toISOString()` / `toString()` / `toLocaleString()` / `toLocaleDateString()`（本地/非兼容格式化）
- `getTimezoneOffset()`（时区偏移）
- 手写 `${y}-${m}-${d}` 拼接（绕过 toSqliteUTC）

---

## 5. 反模式禁止清单

下列写法均**违反规范**，禁止在新增/修改代码中出现：

### 5.1 禁止：用 toISOString 写入 TEXT 时间字段

```typescript
// ❌ 'YYYY-MM-DDTHH:MM:SS.sssZ'，T > 空格，字典序错乱
const nextReview = new Date(Date.now() + 10 * 60 * 1000).toISOString();
cardRepo.updateReviewState(id, { next_review: nextReview });
```

### 5.2 禁止：用本地时区分量拼接日期

```typescript
// ❌ getFullYear/getMonth/getDate 是本地时区，与 datetime('now') UTC 不一致
const today = new Date();
const start = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())} 00:00:00`;
```

### 5.3 禁止：在 controller 内做时间格式化

```typescript
// ❌ 违反分层，时间格式化是 service/utils 的职责
submit: asyncHandler(async (req, res) => {
  const now = new Date().toISOString();  // ❌
  ...
});
```

### 5.4 禁止：在 repo 内手写时间拼接

```typescript
// ❌ repo 应只接收 service 传入的已格式化字符串，或用 DB datetime('now')
function getByDate(date: Date) {
  const s = `${date.getFullYear()}-...`;  // ❌
  return db.prepare('... WHERE x = ?').all(s);
}
```

### 5.5 正确写法对照

```typescript
// ✅ service 层：取 UTC 分量 + Date.UTC 构造 + toSqliteUTC 格式化
import { toSqliteUTC } from '../utils/sqliteTime.js';

const now = new Date();
const todayStart = toSqliteUTC(
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
);

// ✅ utils 层：纯计算后用 toSqliteUTC 格式化
const nextReview = toSqliteUTC(new Date(Date.now() + interval * 60 * 1000));

// ✅ repo 层：不传时间字段，依赖 DB datetime('now') 默认值
reviewLogRepo.insert({ cardId, deckId, result });  // reviewed_at 走 DB 默认
```

---

## 6. 新增时间字段检查清单

后续开发新增时间字段写入时，逐项核对：

- [ ] **F1** 该字段是否参与 `<= / >= / BETWEEN` 与 `datetime('now')` 的字符串比较？
  - 否 → 格式自由（但仍建议统一）
  - 是 → 必须走 toSqliteUTC（强制 R2）
- [ ] **F2** 取分量时用的是 `getUTC*` 而非 `get*`？（R1）
- [ ] **F3** 格式化调用的是 `toSqliteUTC` 而非 `toISOString` / 手写拼接？（R2）
- [ ] **F4** 时间处理位于 utils / service 层而非 controller / repo 层？（R3）
- [ ] **F5** 输出是否为 `YYYY-MM-DD HH:MM:SS`（无 T / Z / 毫秒）？（R4）
- [ ] **F6** 是否有端到端测试覆盖"时间到达后真正到期/统计正确"的场景？
- [ ] **F7** 是否在 UTC+8 凌晨 0-8 点边界验证过（本地"今日" vs UTC"今日"）？

---

## 7. 单元测试覆盖

[sqliteTime-test.ts](file:///d:/vscode/momery2/daima/server/src/utils/sqliteTime-test.ts) 26 项，覆盖 9 个边界维度：

| # | 维度 | 关键验证点 |
|---|------|-----------|
| 1 | 基本功能 | 已知 UTC 时刻 → 格式化正确 |
| 2 | 格式正则一致性 | 所有输出匹配 `^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$` |
| 3 | 零填充 | 个位数月/日/时/分/秒补零 |
| 4 | UTC 分量正确 | `getUTC*` 与手动拼接一致 |
| 5 | 毫秒截断 | 同秒不同毫秒输出相同 |
| 6 | 跨年边界 | 年末/年初/相邻两秒跨年 |
| 7 | 闰年 | 2024-02-29 存在 / 2025-02-29 溢出 |
| 8 | **字典序=时间序** | 过去<现在<未来（核心价值，固化修复目的） |
| 9 | 无 T/Z 后缀 | 与 datetime('now') 字面一致 |

运行：`cd server && npx tsx src/utils/sqliteTime-test.ts`

---

## 8. 参考文档

- [stage3b-time-format-fix.md](file:///d:/vscode/momery2/daima/docs/stage3b-time-format-fix.md) — toSqliteUTC 函数修复的根因分析与详细实现
- [stage3b-review-api-verification.md](file:///d:/vscode/momery2/daima/docs/stage3b-review-api-verification.md) — Review API 端到端测试用例归档
- [AGENT_CONSTITUTION.md](file:///d:/vscode/momery2/daima/AGENT_CONSTITUTION.md) — 项目宪法（分层、命名、常量冻结等）
- [IMPLEMENTATION_PLAN.md](file:///d:/vscode/momery2/daima/project/IMPLEMENTATION_PLAN.md) — 项目实施计划与阶段验收标准

---

## 9. 变更日志

| 日期 | 变更 | 关联 |
|------|------|------|
| 2026-08-18 | 初版：整合 sm2.ts 修复 + sqliteTime.ts 提取 + 26 项单元测试 | stage3b-time-format-fix.md |
| 2026-08-18 | 补充：reviewService.ts getReviewProgress 本地时区修复 + 全文检查结论 | 本文 §3.2 / §4 |
