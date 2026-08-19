# 记忆学习平台 — 编码速查索引（daima 工作区）

> 本文件是 daima/word/ 六份工作副本与 daima/project/ 执行计划的索引入口。**不含规范内容本身**（唯一例外是文末「冻结常量」一行式速查）。编码时先在此定位章节，再读对应原文——所有代码必须能在下方文档中找到依据。

## 铁律（文档先行工作流）

1. 所有代码必须有 word/ 文档依据；文档未定义的，先改文档、同步检查其余 5 份一致性，再写代码。
2. 文档冲突仲裁（权威优先级）：
   - 错误码常量 → STANDARDS §6.2
   - SM-2 调度 → CHARTER §3.3 + ARCH §8
   - API 端点清单 → ARCH §6.2
   - 表结构 DDL → DB §3
   - 前端组件/路由/store → FRONTEND §3-§6
3. 文档使用中文。
4. 本目录文档为主工作副本；决策背景与历史版本见 ../word/ 归档；重大变更回写归档。
5. 编码须同时依据 project/ 执行计划（施工顺序与出口关卡）与 word/ 规范（规则）；计划不新造标准，关卡均引用规范原文。

## 文档地图

| 文档 | 定位 | 行数 |
|------|------|-----:|
| [word/PROJECT_CHARTER.md](word/PROJECT_CHARTER.md) | 立项（why）：业务规则 R1-R11、状态机、验收 | 458 |
| [word/DESIGN.md](word/DESIGN.md) | 产品设计（what）：页面、功能、API 概览 | 554 |
| [word/BACKEND_ARCHITECTURE.md](word/BACKEND_ARCHITECTURE.md) | 后端架构（how-后端）：四层、41 端点、SM-2、上传、导入导出 | 734 |
| [word/BACKEND_ENGINEERING_STANDARDS.md](word/BACKEND_ENGINEERING_STANDARDS.md) | 工程纪律（how-纪律）：命名、目录、错误码、日志 | 603 |
| [word/DATABASE_TECH_SPEC.md](word/DATABASE_TECH_SPEC.md) | 数据库（how-数据）：8 表 DDL、13 索引、8 仓库 | 493 |
| [word/FRONTEND_TECH_SPEC.md](word/FRONTEND_TECH_SPEC.md) | 前端规范（how-前端）：组件树、路由、5 stores | 601 |
| [project/IMPLEMENTATION_PLAN.md](project/IMPLEMENTATION_PLAN.md) | 执行计划（how-顺序）：9 阶段施工顺序 + 出口关卡 + 状态列 | 63 |

阅读顺序（CHARTER 附录 B）：CHARTER → DESIGN → ARCH → STANDARDS → DB → FRONTEND

技术栈（冻结）：前端 Vue 3.4 + TS 5.4 + Vite 5 + Pinia 2 + Vue Router 4 + Axios + Tiptap；后端 Node 20 + Express 4 + better-sqlite3 + winston + multer → ARCH §1.1、FRONTEND §1.1

## 高频锚点

### 后端（任务 → 章节）

| 任务 | 位置 |
|------|------|
| 新建/修改 API 端点 | ARCH §6.1 路径命名、§6.2 端点清单；STANDARDS §11 新增模块规范 |
| 响应体/错误码/异常 | STANDARDS §6、§7（权威）；ARCH §6.3、§6.4 |
| SM-2 评分计算 | CHARTER §3.3 状态机；ARCH §8.1-§8.4 |
| 上传附件 | ARCH §9；STANDARDS §4.3（静态 /uploads 服务） |
| 导入导出 | ARCH §10（导出 JSON 字段命名约定） |
| 日志 | ARCH §11；STANDARDS §8 |
| 健康检查 | ARCH §4.2、§6.2.1；STANDARDS §10.3（必须注册于 authGuard 之前） |
| 目录结构/命名/导出 | STANDARDS §5、§2；ARCH §3 |
| 建表/索引/迁移/预置数据 | DB §3、§4、§5 |
| Repository 方法 | DB §6.3（8 个 repo 清单） |
| 高频 SQL（今日到期/牌组进度/热力图/概览/时间轴/事务） | DB §7.1-§7.7 |

### 前端（任务 → 章节）

| 任务 | 位置 |
|------|------|
| 页面/路由/守卫 | FRONTEND §4；DESIGN §3 |
| 组件树与 Props/Events | FRONTEND §3.2；DESIGN §8 |
| Store 划分与操作 | FRONTEND §5.2（deck/review/note/ui/stats） |
| API 调用函数签名 | FRONTEND §6.3（client + 10 模块） |
| 类型定义 | FRONTEND §8.4（字段直接沿用 snake_case，不做映射） |
| 设计令牌/样式 | FRONTEND §7.1 |

### 验收

| 任务 | 位置 |
|------|------|
| V1 验收清单 | CHARTER §1.5；ARCH §15；STANDARDS §13；FRONTEND §9；DB §10 |

## 里程碑

| Stage | 内容 | 验收文档 | 状态 |
|-------|------|---------|:----:|
| 0 | 工程脚手架（server/ + client/ 初始化） | — | ✅ |
| 1 | 数据库层（connection + migrate + 8 repo） | [docs/stage1-database-verification.md](docs/stage1-database-verification.md) | ✅ |
| 2 | 后端横切骨架（config/logger/response/AppError/中间件/app/index） | — | ✅ |
| 3a | Deck & Card API（service/controller/routes 10 端点） | [docs/stage3-deck-card-api-verification.md](docs/stage3-deck-card-api-verification.md) | ✅ |
| 3b | Review API（SM-2 + 事务）+ importExport + stats | [docs/stage3b-review-api-verification.md](docs/stage3b-review-api-verification.md)、[docs/stage3c-import-export-stats-verification.md](docs/stage3c-import-export-stats-verification.md) | ✅ |
| 4 | 前端骨架（路由 + 布局 + 5 stores + api/client + 设计令牌） | — | ✅ |
| 5 | 前端 V1.0 页面（5a 牌组/卡片、5b 搜索筛选、复习模式、5c 数据面板+导入导出） | — | ✅ |
| 6 | V1.0 联调验收（DESIGN §12 全链路 E2E 通过，V1.0 达成） | — | ✅ |
| 7-8 | M1 增量（folder/note/exam/template/search + stats 可视化 + 前端 6 页面） | — | ✅ |

## 冻结常量速查（出处为准，编码时禁止改动）

- interval 单位 = 分钟；EF 下限 1.3；interval 上限 525600 分钟（365 天）→ ARCH §8.3
- 评分映射：forgot → 10 分钟、rep=0、EF-0.20；hard → 1 天、rep=0、EF-0.15；good → interval×EF、rep+1；easy → interval×EF×1.3、rep+1、EF+0.15 → CHARTER §3.3、ARCH §8.2
- 首次复习基线（interval=0 不套 ×EF 公式）：good→1440、easy→5760 → CHARTER §3.3、ARCH §8.3
- 错误码分段：40001-40005 / 40401-40405 / 40901-40903 / 50001-50004；401xx 为 M2 预留、禁止自创 → STANDARDS §6.2
- 未知异常兜底 = 50004 → ARCH §7.4
- 已掌握口径：repetitions ≥ 3 且 interval ≥ 30240 分钟 → CHARTER R11
- 8 表 + 13 索引 → DB §3、§4
- 删除语义：删笔记 → 附件级联删、cards.source_note 置 NULL；删牌组 → 卡片/复习记录级联删、exams.deck_id 置 NULL → DB §3.1.5、§3.1.8
- 上传白名单 7 种 MIME、单文件 10MB、按月分目录 → ARCH §9.2、DB §3.1.3
- 端点总数 41（40 业务 + 1 健康检查）→ ARCH §6.2、DESIGN §7.11
