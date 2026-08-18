# 记忆学习平台（Memory Learning Platform）

> 单用户本地 Web 应用：笔记管理 + 间隔重复（SM-2）记忆卡片。
>
> 技术栈：Vue 3.4 + TypeScript 5.4 + Vite 5 / Node 20 + Express 4 + better-sqlite3 / Pinia 2 + Vue Router 4 + Axios + Tiptap

---

## 文档索引

> 编码时先在 [CLAUDE.md](CLAUDE.md)（编码速查索引）定位章节，再读对应原文。所有代码必须能在文档中找到依据。

### 1. 规范文档（word/）— 编码主依据

| 文档 | 定位 | 用途 |
|------|------|------|
| [PROJECT_CHARTER.md](word/PROJECT_CHARTER.md) | 立项（why） | 业务规则 R1-R11、状态机、验收 |
| [DESIGN.md](word/DESIGN.md) | 产品设计（what） | 页面、功能、API 概览 |
| [BACKEND_ARCHITECTURE.md](word/BACKEND_ARCHITECTURE.md) | 后端架构（how-后端） | 四层、41 端点、SM-2、上传、导入导出 |
| [BACKEND_ENGINEERING_STANDARDS.md](word/BACKEND_ENGINEERING_STANDARDS.md) | 工程纪律（how-纪律） | 命名、目录、错误码、日志 |
| [DATABASE_TECH_SPEC.md](word/DATABASE_TECH_SPEC.md) | 数据库（how-数据） | 8 表 DDL、13 索引、8 仓库 |
| [FRONTEND_TECH_SPEC.md](word/FRONTEND_TECH_SPEC.md) | 前端规范（how-前端） | 组件树、路由、5 stores |

### 2. 项目计划（project/）— 施工顺序

| 文档 | 定位 | 用途 |
|------|------|------|
| [IMPLEMENTATION_PLAN.md](project/IMPLEMENTATION_PLAN.md) | 执行计划 | 9 阶段施工顺序 + 出口关卡 + 状态 |

### 3. 开发规则（根目录）— 编码约束

| 文档 | 定位 | 用途 |
|------|------|------|
| [AGENT_CONSTITUTION.md](AGENT_CONSTITUTION.md) | Agent 宪法 v3.1 | 架构/设计/真源/验收最高规则 |
| [CLAUDE.md](CLAUDE.md) | 编码速查索引 | word/ 文档章节定位 + 铁律 + 冻结常量速查 |

### 4. 测试归档（docs/）— 验收用例

| 文档 | 阶段 | 测试数 | 用途 |
|------|------|:------:|------|
| [stage1-database-verification.md](docs/stage1-database-verification.md) | Stage 1 | 47 | 数据库连接 + 迁移 + 8 表 DDL + 索引 + 级联 |
| [stage3-deck-card-api-verification.md](docs/stage3-deck-card-api-verification.md) | Stage 3 | 17 | Deck CRUD + Card CRUD + 错误场景 |
| [stage3b-review-api-verification.md](docs/stage3b-review-api-verification.md) | Stage 3b | 20 | Review API（SM-2 + 到期筛选 + 进度统计 + 错误） |

### 5. 修复沉淀（docs/）— 经验记录

| 文档 | 主题 | 用途 |
|------|------|------|
| [stage3b-time-format-fix.md](docs/stage3b-time-format-fix.md) | toSqliteUTC 修复 | toISOString 与 datetime('now') 格式不一致根因分析 |
| [time-handling-spec.md](docs/time-handling-spec.md) | 时间处理规范 | 全链路 UTC + toSqliteUTC + 反模式禁止清单 |

---

## 目录结构

```
daima/
├── word/                  # 规范文档（编码主依据）
│   ├── PROJECT_CHARTER.md
│   ├── DESIGN.md
│   ├── BACKEND_ARCHITECTURE.md
│   ├── BACKEND_ENGINEERING_STANDARDS.md
│   ├── DATABASE_TECH_SPEC.md
│   └── FRONTEND_TECH_SPEC.md
├── project/
│   └── IMPLEMENTATION_PLAN.md   # 9 阶段施工计划
├── server/               # 后端（Express + better-sqlite3）
│   └── src/
│       ├── controllers/  # 请求处理 + 类型守卫
│       ├── services/     # 业务逻辑 + 事务
│       ├── repositories/  # 数据访问（参数化查询）
│       ├── routes/       # 路由注册
│       ├── db/           # 连接 + 迁移 + Stage 1 测试
│       ├── middlewares/  # authGuard / errorHandler / requestLogger
│       ├── utils/        # AppError / response / logger / sm2 / sqliteTime
│       └── types/        # 共享类型定义
├── client/               # 前端骨架（Vue 3 + Vite）
├── docs/                 # 测试归档 + 修复沉淀
├── AGENT_CONSTITUTION.md # Agent 宪法（编码最高规则）
├── CLAUDE.md             # 编码速查索引
└── package.json
```

---

## 快速启动

### 后端

```bash
cd server
npm install
npm run dev          # 启动开发服务（tsx watch）
# http://localhost:3000
```

### 前端

```bash
cd client
npm install
npm run dev          # 启动 Vite 开发服务
```

### 测试

```bash
# Stage 1 数据库测试（47 项）
cd server && npx tsx src/db/stage1-mock-test.ts

# Stage 3 Deck & Card API（17 项，需先启动服务）
cd server && npx tsx src/stage3-api-test.ts

# Stage 3b Review API（20 项，需先启动服务）
cd server && npx tsx src/stage3b-review-api-test.ts

# toSqliteUTC 单元测试（44 项）
cd server && npx tsx src/utils/sqliteTime-test.ts
```

---

## 阶段进度

| 阶段 | 内容 | 状态 | 验收文档 |
|------|------|:----:|---------|
| Stage 1 | 数据库（连接 + 迁移 + 8 表） | ✅ | [stage1-database-verification.md](docs/stage1-database-verification.md) |
| Stage 2 | 后端骨架（config/logger/response/middleware） | ✅ | — |
| Stage 3 | Deck & Card API（CRUD + 嵌套路由） | ✅ | [stage3-deck-card-api-verification.md](docs/stage3-deck-card-api-verification.md) |
| Stage 3b | Review API（SM-2 + 到期筛选 + 进度统计） | ✅ | [stage3b-review-api-verification.md](docs/stage3b-review-api-verification.md) |
| Stage 4+ | 笔记/模板/考试/导入导出/前端 | ⏳ 待开发 | — |

详见 [IMPLEMENTATION_PLAN.md](project/IMPLEMENTATION_PLAN.md)。
