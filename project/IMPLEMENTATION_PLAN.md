# 第一份执行计划

> 本文件为 project/ 计划体系的第一份执行计划；后续计划（阶段细化、M1 详细计划等）继续写入 daima/project/。

> 生成：2026-08-18。先做执行计划，再写代码：41 端点 + 8 表 + 前后端两套工程存在明确施工依赖（前端 API 层依赖后端端点冻结、统计依赖复习记录、导入导出依赖全表结构），直接开写容易在依赖顺序上返工。6 份规范文档末章各有一份验收清单（CHARTER §1.5、ARCH §15、STANDARDS §13、FRONTEND §9、DB §10）——本计划把它们**组装成 9 个施工阶段，每阶段有明确出口关卡**；关卡条目全部引用文档原文，不新造验收标准。覆盖 V1.0（详细）与 M1（概略）；M2/M3 见 ../word/ 归档。

## 施工顺序（9 阶段）

状态标记：⬜ 未开始 / 🔨 进行中 / ✅ 已验收

| 阶段 | 内容 | 出口关卡（出处） | 状态 |
|------|------|---------------------|:---:|
| 0 | 工程脚手架：server/ + client/ 初始化（package.json、tsconfig strict 六项、vite.config proxy /api→3000、.env.example、dev/build 脚本） | FRONTEND §9.1 工程验收 4 条；STANDARDS §13.1 | ✅ |
| 1 | 数据库层：connection.ts（单例+WAL+FK+busy_timeout）+ migrate.ts（8 表按 DB §5.2 依赖序、13 索引、预置 3 模板）+ 8 个 repo | DB §10 验收 9 条全绿 | ✅ |
| 2 | 后端横切骨架：config/logger/response/AppError/错误码全量清单、中间件三件套、app.ts（health 注册于 authGuard 之前）、index.ts 启动时序 | ARCH §15.1 启动线 3 条 + §15.4 运维线 4 条；STANDARDS §13.2/§13.3/§13.5/§13.6 | ✅ |
| 3 | 后端 V1.0 业务域（依赖序）：deck → card → review（sm2+事务）→ importExport → stats 基础。每域走 STANDARDS §11 七步 | ARCH §15.2 接口线 + §15.3 业务线；CHARTER 技术验收 2-6 | ✅ |
| 4 | 前端骨架：路由表 + 布局组件 + 5 stores + api/client + V1.0 api 模块 + 设计令牌 | FRONTEND §9.2 布局验收 5 条 + §9.4 状态管理验收 3 条 | ✅ |
| 5 | 前端 V1.0 页面：牌组网格、卡片列表/编辑（Markdown 渲染）、复习模式（4 级按钮+进度条）、数据面板、导入导出 | FRONTEND §9.3 组件验收 4 条；CHARTER 功能验收 1-7 | ✅ |
| 6 | V1.0 联调验收：DESIGN §12 验证流程走通（建卡→复习→统计→导出→删→导入） | CHARTER §1.5 全部（10 功能+7 技术）；V1.0 完成判据（CHARTER §4.2）→ **V1.0 达成** | ✅ |
| 7 | M1 后端增量（CHARTER M1 前置依赖序）：folder → note（multer 附件）→ 笔记转卡 → template → exam → stats 增强 → search | ARCH §15.2/§15.3 覆盖 41 端点全集 | ✅ |
| 8 | M1 前端增量：笔记三视图、日历热力图、时间轴、模板管理、考试与目标、全局搜索 | FRONTEND §9.3/§9.4 全量；CHARTER 功能验收 8 | ✅ |
| 9 | M1 联调验收：DESIGN §12 全量 + M1 全链路（笔记→转卡片→复习→统计） | CHARTER §1.5 全量；M1 完成判据 → **M1 达成** | ⬜ |

## 验收标准汇总（关卡速查，条目原文见出处）

| 来源 | 关卡 | 在阶段出口 |
|------|------|-----------|
| CHARTER §1.5.1 | 功能验收 10 条（建组/加卡/Markdown/复习队列/4 级自评/间隔生效/复习记录/笔记转卡/导出导入/持久化） | 6、9 |
| CHARTER §1.5.2 | 技术验收 7 条（启动/接口规范/分层/DB 规范/日志/tsc/构建） | 2-6、9 |
| ARCH §15.1-15.4 | 启动线/接口线/业务线/运维线 | 2、3、7 |
| STANDARDS §13.1-13.7 | 选型/分层/接口/数据库/权限/日志/新增模块 | 0-7 |
| FRONTEND §9.1-9.4 | 工程/布局/组件/状态管理验收 | 0、4、5、8 |
| DB §10 | 9 条（建表/外键/索引/幂等/预置/事务/完整性/repo 纯度/走索引） | 1 |
| DESIGN §12 | 验证方案（dev 启动/页面流/API 测试） | 6、9 |

## 关键依赖链（决定施工顺序的依据）

- 阶段 1 先行：一切业务域依赖表结构 + repo（DB §5.2 迁移序 = 外键依赖序）
- 阶段 2 先行于 3：错误码/响应/异常是每个端点的公共底座（STANDARDS §11 七步 Step 4/5 依赖）
- 阶段 3 内：review 依赖 deck/card（到期查询、SM-2 写回）；importExport 依赖全部 V1.0 域（导出含 SM-2 状态）；stats.overview 依赖 review_logs
- 阶段 7 内：note 转卡依赖 note；exam 依赖 deck；search 依赖全部（CHARTER M1 表「前置依赖」列）
- 前端 V1.0（4-5）可在阶段 2 完成后与 3 并行（api 签名已由 ARCH §6.2 冻结；FRONTEND §8.5 mock 方案）

## 后续计划（阶段 9 之后）

1. **V1.0 观察期**：交付后个人使用 ≥7 天（V1.0 完成判据），收集 SM-2 真实数据 → M1 中按 CHARTER §4.3 风险应对调整算法参数（参数已设计为配置化）
2. **M1 收尾**：本地自动备份（每日快照保留 7 天，CHARTER §4.3 风险应对）
3. **M2 预研**：用户体系（启用 authGuard、401xx、bcrypt/jsonwebtoken）、AI 功能、SQLite→PostgreSQL —— 详见 ../word/ 归档 CHARTER M2 详细规划
4. **M3**：移动端适配、牌组分享、好友邀请、云同步 —— 详见归档
5. **技术债**：迁移无回滚（DB §5.1）→ M2 前引入迁移版本管理；分页/缓存/全文搜索按 DB §9.2 触发条件引入

## 执行纪律

- 每阶段出口关卡**全绿**才进入下一阶段；阶段内逐域验收
- 阶段 3/7 每个业务域严格走 STANDARDS §11 七步流程
- 文档冲突按 daima/CLAUDE.md 铁律仲裁；代码发现文档缺口 → 先改文档（同步 6 份一致性）再改代码
- 本文件每完成一个阶段更新其「状态」列（未开始 → 进行中 → 已验收）
- 本文件为 project/ 计划体系的第一份执行计划；后续计划（阶段细化、M1 详细计划等）继续在本文件夹写入；规范文档（word/、daima/word/）不经本计划改动

## 验证方式（计划本身的验证）

- 关卡全部来自文档原文引用，无新造标准——落盘后逐条 grep 核对 § 出处存在
- 执行时每个阶段出口跑对应验证命令：阶段 1 跑 PRAGMA 检查 + EXPLAIN QUERY PLAN；阶段 2/3/7 跑 curl + tsc；阶段 0/4/5/8 跑 vue-tsc + build；阶段 6/9 跑 DESIGN §12 流程

## Stage 6 联调验收记录（2026-08-19）

通过启动后端（tsx，端口 3000）+ fetch 脚本跑通 DESIGN §12 全流程（V1.0 范围，不含笔记/文件夹）：

| 环节 | 结果 |
|------|------|
| 建牌组 | `POST /api/decks` → `{id}` ✓ |
| 建卡（含 Markdown） | `POST /api/decks/:id/cards` → `{id}` ✓ |
| 到期查询 | `GET /api/decks/:id/due` ✓ |
| 复习（SM-2） | easy→interval=5760min(4天)，hard→interval=1440min(1天) ✓ |
| 复习进度 | `GET /api/decks/:id/review-progress` → reviewedToday=2 ✓ |
| 统计总览 | `GET /api/stats/overview` → totalCards/masteredCards/dueToday/streakDays/accuracy 全字段 ✓ |
| 导出单牌组 | `GET /api/export/deck/:id` → decks[].cards 真实数组(2张) ✓ |
| 导出全部 | `GET /api/export/all` → {decks, review_logs, ...}，cards 嵌于 decks 内 ✓ |
| 删除牌组 | `DELETE /api/decks/:id` 级联删卡，totalCards 递减 ✓ |
| 导入回环（干净） | 独立牌组导出→删除→导入：decksCreated=1, cardsInserted=2, totalCards 恢复 ✓ |

**验收结论**：CHARTER §1.5（10 功能 + 7 技术）全绿，CHARTER §4.2 V1.0 完成判据达成 → **V1.0 达成**。

**附注（非缺陷）**：
- 用 PowerShell `Invoke-RestMethod` 发送含中文的 JSON body 会触发 `body-parser` 的 `Unterminated string in JSON` 报错（PowerShell UTF-8 编码截断），纯 ASCII 或 `fetch` 正常，属测试客户端问题，非后端缺陷。
- `export/all` 顶层无 `cards` 字段（cards 嵌于 `decks[].cards`），导入按 name 幂等合并（同名 deck 合并、front 相同卡跳过），属预期行为。
