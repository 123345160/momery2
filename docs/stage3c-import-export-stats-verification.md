# Stage 3c 导入导出 + 统计概览 — 测试用例归档

> **归档时间**: 2026-08-18
> **验收结果**: 28 项测试全绿，0 失败
> **对应规范**: ARCH §6.2.7 / §6.2.11 / §10 / DB §7.4 / CHARTER R10-R11
> **实施计划**: IMPLEMENTATION_PLAN.md Stage 3（importExport + stats 基础收尾）
> **关联文档**: [time-handling-spec.md](time-handling-spec.md) / [stage3b-review-api-verification.md](stage3b-review-api-verification.md)

---

## 1. 文件索引

| 文件 | 位置 | 用途 |
|------|------|------|
| types/index.ts | [server/src/types/index.ts](file:///d:/vscode/momery2/daima/server/src/types/index.ts) | ExportPayload/ExportDeck/ExportCard/ExportReviewLog/ImportSummary/StatsOverview |
| importExportRepo.ts | [server/src/repositories/importExportRepo.ts](file:///d:/vscode/momery2/daima/server/src/repositories/importExportRepo.ts) | 导出查询 + 导入幂等查询 + 导入全字段写入 |
| statsRepo.ts | [server/src/repositories/statsRepo.ts](file:///d:/vscode/momery2/daima/server/src/repositories/statsRepo.ts) | 5 个全局聚合查询（含 streakDays 倒推） |
| importExportService.ts | [server/src/services/importExportService.ts](file:///d:/vscode/momery2/daima/server/src/services/importExportService.ts) | exportAll/exportDeck/importJson（事务+校验+幂等） |
| statsService.ts | [server/src/services/statsService.ts](file:///d:/vscode/momery2/daima/server/src/services/statsService.ts) | overview() 聚合 5 指标 |
| importExportController.ts | [server/src/controllers/importExportController.ts](file:///d:/vscode/momery2/daima/server/src/controllers/importExportController.ts) | 3 端点请求处理 |
| statsController.ts | [server/src/controllers/statsController.ts](file:///d:/vscode/momery2/daima/server/src/controllers/statsController.ts) | overview 请求处理 |
| importExportRoutes.ts | [server/src/routes/importExportRoutes.ts](file:///d:/vscode/momery2/daima/server/src/routes/importExportRoutes.ts) | 3 端点路由（跨 /export 与 /import 前缀） |
| statsRoutes.ts | [server/src/routes/statsRoutes.ts](file:///d:/vscode/momery2/daima/server/src/routes/statsRoutes.ts) | 1 端点路由（/stats 前缀，M1 三端点注释占位） |
| routes/index.ts | [server/src/routes/index.ts](file:///d:/vscode/momery2/daima/server/src/routes/index.ts) | 挂载 importExportRoutes + statsRoutes |
| stage3c-import-export-stats-test.ts | [server/src/stage3c-import-export-stats-test.ts](file:///d:/vscode/momery2/daima/server/src/stage3c-import-export-stats-test.ts) | Node.js fetch 测试脚本（28 项） |

---

## 2. 端点清单

### 2.1 importExport 端点（3 个，ARCH §6.2.11）

| 方法 | 路径 | Controller | Service | 说明 |
|------|------|-----------|---------|------|
| GET | /api/export/all | exportAll | exportAll() | 全量导出 JSON（decks+cards+review_logs） |
| GET | /api/export/deck/:id | exportDeck | exportDeck(id) | 单牌组导出 JSON |
| POST | /api/import/json | importJson | importJson(payload) | 导入 JSON（校验+幂等+事务） |

### 2.2 stats 端点（V1.0 只做 overview，ARCH §6.2.7）

| 方法 | 路径 | Controller | Service | 阶段 |
|------|------|-----------|---------|:----:|
| GET | /api/stats/overview | overview | overview() | V1.0 |
| GET | /api/stats/calendar | calendar | — | M1（Stage 7） |
| GET | /api/stats/timeline | timeline | — | M1（Stage 7） |
| GET | /api/stats/deck/:id | deckStats | — | M1（Stage 7） |

### 2.3 路由挂载结构

```
app.use('/api', authGuard, apiRoutes)
  └── apiRoutes (Router)
       ├── /decks → deckRoutes           (Stage 3)
       ├── /cards → cardRoutes           (Stage 3)
       ├── / → reviewRoutes              (Stage 3b)
       ├── / → importExportRoutes        (Stage 3c)
       │   ├── GET  /export/all
       │   ├── GET  /export/deck/:id
       │   └── POST /import/json
       └── /stats → statsRoutes          (Stage 3c)
            └── GET /overview
```

---

## 3. 测试用例清单（28 项）

### 3.1 准备数据（3 项）

| # | 测试名 | 方法 | 路径 | 请求体 | 期望 HTTP | 关键断言 |
|---|--------|------|------|--------|:---------:|---------|
| 1 | 创建牌组 | POST | /api/decks | `{name:"Export Test Deck"}` | 201 | data.id 存在 |
| 2 | 创建 2 张卡片 | POST | /api/decks/:id/cards | `{front,back,tags}` ×2 | 201 | 两个 data.id |
| 3 | 提交 2 次复习 | POST | /api/cards/:id/review | `{result:"good"}` + `{result:"easy"}` | 201 | 生成 review_logs |

### 3.2 exportAll（7 项）

| # | 测试名 | 方法 | 路径 | 期望 HTTP | 关键断言 |
|---|--------|------|------|:---------:|---------|
| 4 | exportAll 200 | GET | /api/export/all | 200 | code=0 |
| 5 | version=1 | - | - | - | data.version === 1 |
| 6 | decks 是数组且非空 | - | - | - | Array.isArray && length>=1 |
| 7 | review_logs.length>=2 | - | - | - | 含本次 2 条（可能含遗留） |
| 8 | Export Test Deck 含 2 卡片 | - | - | - | decks.find(name).cards.length=2 |
| 9 | cards[0].tags 是数组 | - | - | - | Array.isArray（DB JSON 字符串已转数组） |
| 10 | review_logs[0] 含反查字段 | - | - | - | deck_name + card_front 存在 |

### 3.3 exportDeck（4 项）

| # | 测试名 | 方法 | 路径 | 期望 HTTP | 期望 code | 关键断言 |
|---|--------|------|------|:---------:|:---------:|---------|
| 11 | exportDeck 200 | GET | /api/export/deck/:id | 200 | 0 | 单牌组结构 |
| 12 | 单牌组只含 1 deck + 2 cards | - | - | - | - | decks.length=1, cards.length=2 |
| 13 | 不存在 → 404 | GET | /api/export/deck/99999 | 404 | 40401 | DECK_NOT_FOUND |
| 14 | 无效 id → 400 | GET | /api/export/deck/abc | 400 | 40002 | INVALID_FORMAT |

### 3.4 importJson（7 项）

| # | 测试名 | 方法 | 路径 | 请求体 | 期望 HTTP | 期望 code | 关键断言 |
|---|--------|------|------|--------|:---------:|:---------:|---------|
| 15 | importJson 200 | POST | /api/import/json | 完整 ExportPayload | 200 | 0 | 导入成功 |
| 16 | 导入 1 牌组 + 1 卡片 | - | - | - | - | - | decksCreated+decksMerged=1, cardsInserted+cardsSkipped=1 |
| 17 | 导入的牌组可查询 | GET | /api/decks | - | 200 | - | items.find(name) 存在 |
| 18 | 幂等：再次导入 | POST | /api/import/json | 同上 | 200 | - | decksMerged=1, cardsSkipped=1（R10） |
| 19 | decks 非数组 → 400 | POST | /api/import/json | `{decks:"x"}` | 400 | 40005 | INVALID_JSON |
| 20 | 缺 name → 400 | POST | /api/import/json | `{decks:[{cards:[]}]}` | 400 | 40005 | INVALID_JSON |
| 21 | name 非字符串 → 400 | POST | /api/import/json | `{decks:[{name:123}]}` | 400 | 40005 | INVALID_JSON |

### 3.5 stats overview（6 项）

| # | 测试名 | 方法 | 路径 | 期望 HTTP | 关键断言 |
|---|--------|------|------|:---------:|---------|
| 22 | overview 200 | GET | /api/stats/overview | 200 | code=0 |
| 23 | totalCards=5 (>=3) | - | - | - | 含 Export Test 2 + Imported 1 + 遗留 |
| 24 | masteredCards=0 | - | - | - | 无卡片满足 R11 口径 |
| 25 | dueToday=0 | - | - | - | 卡片 next_review 均在未来 |
| 26 | streakDays=1 (>=1) | - | - | - | 今天有复习记录 |
| 27 | accuracy=100 (0-100) | - | - | - | 全部 good+easy，无 forgot/hard |

### 3.6 清理（1 项）

| # | 测试名 | 方法 | 路径 | 期望 HTTP | 关键断言 |
|---|--------|------|------|:---------:|---------|
| 28 | 清理牌组（级联删除） | DELETE | /api/decks/:id ×2 | 200 | 删除测试牌组 + 导入牌组 |

---

## 4. 导出 JSON 格式（ARCH §10.1）

```json
{
  "version": 1,
  "exportedAt": "2026-08-18T14:00:00.000Z",
  "decks": [
    {
      "name": "Export Test Deck",
      "description": "测试导出",
      "cards": [
        {
          "front": "Q1", "back": "A1",
          "tags": ["t1"],
          "ease_factor": 2.5, "interval": 1440, "repetitions": 1,
          "next_review": "2026-08-19T14:00:00.000Z",
          "last_reviewed": "2026-08-18T14:00:00.000Z"
        }
      ]
    }
  ],
  "review_logs": [
    { "deck_name": "Export Test Deck", "card_front": "Q1", "result": "good", "reviewed_at": "..." }
  ],
  "notes": [],
  "templates": []
}
```

| 设计要点 | 说明 |
|----------|------|
| 顶层元数据 camelCase | version / exportedAt |
| 业务字段 snake_case | ease_factor / next_review（与 DB 一致） |
| tags 数组 | DB 存 JSON 字符串，导出时 JSON.parse 转数组 |
| 时间字段 ISO | DB toSqliteUTC 格式 → ISO（sqliteToISO 转换） |
| notes/templates 空数组 | V1.0 占位，M1 实现后填充 |

---

## 5. 导入策略（ARCH §10.2 + R10）

| 策略 | 实现 | 测试 # |
|------|------|:------:|
| 幂等检测（R10） | 同名牌组 → decksMerged，同 front 卡片 → cardsSkipped | 16, 18 |
| 进度保留 | insertCardWithState 恢复 SM-2 全字段 | 16 |
| 冲突策略 | 同名牌组追加卡片，不覆盖元信息 | 18 |
| 事务保护 | runInTransaction 包裹整个导入 | 15 |
| 校验 | isObject + Array.isArray + typeof 逐字段校验 → 40005 | 19-21 |
| review_logs 反查 | deck_name + card_front → getDeckByName + getCardByDeckAndFront | 15 |

---

## 6. stats overview 字段（DB §7.4 + R11）

| 字段 | SQL/逻辑 | 测试 # |
|------|---------|:------:|
| totalCards | SELECT COUNT(*) FROM cards | 23 |
| masteredCards | repetitions >= 3 AND interval >= 30240（R11：21 天） | 24 |
| dueToday | next_review <= datetime('now') | 25 |
| streakDays | review_logs 按日期去重，UTC 倒推连续 | 26 |
| accuracy | (good + easy) / total × 100，total=0 时返回 0 | 27 |

---

## 7. 时间格式验证

| 方向 | 转换 | 函数 |
|------|------|------|
| 导出 DB → JSON | toSqliteUTC 格式 → ISO | sqliteToISO(s + 'Z').toISOString() |
| 导入 JSON → DB | ISO → toSqliteUTC 格式 | isoToSqlite = toSqliteUTC(new Date(s)) |

遵循 [time-handling-spec.md](time-handling-spec.md) R2：DB 时间字段统一 toSqliteUTC 格式。

---

## 8. 运行方式

```bash
# 1. 启动服务（终端 1）
cd server
npm run dev

# 2. 运行测试（终端 2）
cd server
npx tsx src/stage3c-import-export-stats-test.ts
```

| 项 | 值 |
|----|-----|
| 测试脚本 | [stage3c-import-export-stats-test.ts](file:///d:/vscode/momery2/daima/server/src/stage3c-import-export-stats-test.ts) |
| 测试方式 | Node.js fetch（绕过 PowerShell 引号问题） |
| 数据库 | 文件模式 ./data/app.db |

---

## 9. 验收结论

| 分类 | 测试数 | 通过 | 失败 |
|------|:------:|:----:|:----:|
| 准备数据 | 3 | 3 | 0 |
| exportAll | 7 | 7 | 0 |
| exportDeck | 4 | 4 | 0 |
| importJson | 7 | 7 | 0 |
| stats overview | 6 | 6 | 0 |
| 清理 | 1 | 1 | 0 |
| **合计** | **28** | **28** | **0** |

### 规范符合性

| 规范条目 | 验收项 | 结果 |
|----------|--------|:----:|
| ARCH §6.2.11 | importExport 3 端点全实现 | ✅ |
| ARCH §6.2.7 | stats overview 实现（V1.0 范围） | ✅ |
| ARCH §10.1 | 导出 JSON 格式（version/decks/review_logs/notes/templates） | ✅ |
| ARCH §10.2 | 导入策略（幂等/事务/校验/进度保留） | ✅ |
| CHARTER R10 | 同名牌组追加卡片不覆盖 | ✅ |
| CHARTER R11 | 已掌握口径 repetitions>=3 且 interval>=30240 | ✅ |
| DB §7.4 | overview 5 指标 SQL 逻辑 | ✅ |
| STANDARDS §6.2 | 错误码 40005 INVALID_JSON + 40401 DECK_NOT_FOUND | ✅ |
| time-handling-spec R2 | 导入导出时间格式转换（ISO ↔ toSqliteUTC） | ✅ |

### Stage 3 收尾完成

| 业务域 | 状态 | 验收文档 |
|--------|:----:|---------|
| deck | ✅ | stage3-deck-card-api-verification.md |
| card | ✅ | stage3-deck-card-api-verification.md |
| review | ✅ | stage3b-review-api-verification.md |
| **importExport** | ✅ | **本文档** |
| **stats 基础** | ✅ | **本文档** |

Stage 3 出口关卡（ARCH §15.2 接口线 + §15.3 业务线）全绿，可进入 Stage 4（前端骨架）。
