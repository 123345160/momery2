/**
 * review.ts store 单元测试 — 复习流程状态机（Stage 6 复习闭环）
 *
 * 运行方式：npx tsx src/stores/review-store-test.ts
 *
 * 测试策略：
 *   覆盖 axios adapter 扩展点拦截 HTTP 请求（零新增依赖、不发真实网络请求），
 *   复用 client.ts 真实响应拦截器链路（code===0 解包 data），
 *   验证 API 层 + store 层完整闭环。
 *
 * 覆盖维度：
 *   1. fetchDueCards — 队列加载 / 索引重置 / 统计重置 / 请求路由与参数
 *   2. currentCard getter — 首张 / 空队列 / 会话结束后越界
 *   3. progress getter — 0% / 50% / 100% / 空队列兜底
 *   4. isSessionEnd — 会话中 false / 结束 true
 *   5. submitReview — 统计累加（reviewed + 四级分布）/ 请求体携带 result
 *   6. nextCard — 索引前进
 *   7. resetSession — 全量清空
 *   8. 完整会话模拟 — 2 张卡 good + easy（复刻浏览器验收场景）
 *   9. 业务失败（code!==0）— reject 且统计不变
 */

import { createPinia, setActivePinia } from 'pinia';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import client from '../api/client';
import { useReviewStore } from './review';
import type { Card } from '../types';

// ===== 颜色 + 格式（沿用 server/src/utils/sqliteTime-test.ts 约定） =====
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;

function section(title: string): void {
  console.log(`\n${BOLD}${CYAN}━━━ ${title} ━━━${RESET}`);
}

function assert(condition: boolean, message: string, detail?: string): void {
  if (condition) {
    console.log(`  ${GREEN}[PASS]${RESET} ${message}`);
    passed++;
  } else {
    console.log(`  ${RED}[FAIL]${RESET} ${message}`);
    if (detail) console.log(`         ${RED}→ ${detail}${RESET}`);
    failed++;
  }
}

function eq<T>(actual: T, expected: T, label: string): void {
  const ok = actual === expected;
  assert(ok, label, ok ? undefined : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/** 断言 Promise 被 reject */
async function expectReject(p: Promise<unknown>, label: string): Promise<void> {
  try {
    await p;
    assert(false, label, 'expected rejection but resolved');
  } catch {
    assert(true, label);
  }
}

// ===== Mock 数据 =====

function makeCard(overrides: Partial<Card> & Pick<Card, 'id' | 'front' | 'back'>): Card {
  return {
    deck_id: 17,
    source_note: null,
    tags: '[]',
    ease_factor: 2.5,
    interval: 0,
    repetitions: 0,
    next_review: '2026-08-19 00:00:00',
    last_reviewed: null,
    created_at: '2026-08-19 00:00:00',
    updated_at: '2026-08-19 00:00:00',
    ...overrides,
  };
}

const CARD_1 = makeCard({ id: 37, front: '什么是 Vue 3 的 Composition API？', back: '## 定义\n\nVue 3 引入的 API 风格。' });
const CARD_2 = makeCard({ id: 38, front: '12', back: '123' });
const QUEUE = [CARD_1, CARD_2];

// ===== axios adapter 拦截 =====

/** 最近一次请求的配置（用于断言请求路由与请求体） */
let lastConfig: InternalAxiosRequestConfig | null = null;

/** 访问器：函数内读取捕获变量使用声明类型，绕开模块级 null 收窄 */
function lastRequest(): InternalAxiosRequestConfig | null {
  return lastConfig;
}

type MockResult = { status: number; body: unknown };

/** 当前生效的路由处理器：按 method + url 返回 mock 响应体 */
let route: (config: InternalAxiosRequestConfig) => MockResult = () => ({
  status: 200,
  body: { code: 0, message: 'ok', data: null },
});

const mockAdapter: AxiosAdapter = async (config) => {
  lastConfig = config;
  const { status, body } = route(config);
  const response: AxiosResponse = {
    data: body,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config,
  };
  return response;
};

client.defaults.adapter = mockAdapter;

/** 设置路由：GET /decks/:id/due → 队列；POST /cards/:id/review → 更新后卡片 */
function useHappyRoutes(): void {
  route = (config) => {
    const url = config.url ?? '';
    if (config.method === 'get' && /^\/decks\/\d+\/due$/.test(url)) {
      return { status: 200, body: { code: 0, message: 'ok', data: QUEUE } };
    }
    if (config.method === 'post' && /^\/cards\/\d+\/review$/.test(url)) {
      return { status: 200, body: { code: 0, message: 'ok', data: CARD_1 } };
    }
    return { status: 404, body: { code: 40400, message: 'not found', data: null } };
  };
}

/** 每个测试段使用全新 pinia 实例，隔离 store 状态 */
function freshStore(): ReturnType<typeof useReviewStore> {
  setActivePinia(createPinia());
  return useReviewStore();
}

// ===== 测试开始 =====

section('1. fetchDueCards — 队列加载 / 索引与统计重置 / 请求路由');
{
  useHappyRoutes();
  const store = freshStore();
  // 预置脏状态，验证 fetchDueCards 会重置
  store.queue = [CARD_1];
  store.currentIndex = 5;
  store.sessionStats = { reviewed: 9, forgot: 9, hard: 9, good: 9, easy: 9 };

  await store.fetchDueCards(17);

  eq(store.queue.length, 2, '队列加载 2 张卡片');
  eq(store.currentIndex, 0, 'currentIndex 重置为 0');
  eq(store.sessionStats.reviewed, 0, '统计重置：reviewed = 0');
  eq(store.sessionStats.forgot, 0, '统计重置：forgot = 0');
  eq(store.sessionStats.easy, 0, '统计重置：easy = 0');
  assert(lastRequest() !== null, '请求已发出');
  eq(lastRequest()?.method, 'get', '请求方法为 GET');
  eq(lastRequest()?.url, '/decks/17/due', '请求路由为 /decks/17/due');
}

section('2. currentCard getter — 首张 / 空队列 / 越界');
{
  useHappyRoutes();
  const store = freshStore();

  eq(store.currentCard, null, '空队列时 currentCard 为 null');

  await store.fetchDueCards(17);
  eq(store.currentCard?.id, 37, '队列加载后指向首张（id=37）');

  store.nextCard();
  store.nextCard();
  eq(store.currentCard, null, '会话结束后越界返回 null');
}

section('3. progress getter — 0% / 50% / 100% / 空队列');
{
  useHappyRoutes();
  const store = freshStore();

  let p = store.progress;
  eq(p.done, 0, '空队列：done = 0');
  eq(p.total, 0, '空队列：total = 0');
  eq(p.percent, 0, '空队列：percent 兜底为 0（不除零）');

  await store.fetchDueCards(17);
  p = store.progress;
  eq(p.done, 0, '起始：done = 0');
  eq(p.total, 2, '起始：total = 2');
  eq(p.percent, 0, '起始：percent = 0%');

  store.nextCard();
  p = store.progress;
  eq(p.done, 1, '完成 1 张：done = 1');
  eq(p.percent, 50, '完成 1 张：percent = 50%');

  store.nextCard();
  p = store.progress;
  eq(p.done, 2, '完成 2 张：done = 2');
  eq(p.percent, 100, '完成 2 张：percent = 100%');
}

section('4. isSessionEnd — 会话中 / 结束');
{
  useHappyRoutes();
  const store = freshStore();
  await store.fetchDueCards(17);

  eq(store.isSessionEnd, false, '会话开始时未结束');
  store.nextCard();
  eq(store.isSessionEnd, false, '完成 1/2 张时未结束');
  store.nextCard();
  eq(store.isSessionEnd, true, '完成 2/2 张时会话结束');
}

section('5. submitReview — 统计累加 / 请求体携带 result');
{
  useHappyRoutes();
  const store = freshStore();
  await store.fetchDueCards(17);

  await store.submitReview(37, 'good');
  eq(store.sessionStats.reviewed, 1, '提交 good 后 reviewed = 1');
  eq(store.sessionStats.good, 1, 'good 计数 = 1');
  eq(store.sessionStats.easy, 0, 'easy 计数不受影响');

  await store.submitReview(38, 'easy');
  eq(store.sessionStats.reviewed, 2, '提交 easy 后 reviewed = 2');
  eq(store.sessionStats.easy, 1, 'easy 计数 = 1');
  eq(store.sessionStats.good, 1, 'good 计数保持 1');

  assert(lastRequest() !== null, '评分请求已发出');
  eq(lastRequest()?.method, 'post', '评分请求方法为 POST');
  eq(lastRequest()?.url, '/cards/38/review', '评分请求路由为 /cards/38/review');
  const body = JSON.parse(String(lastRequest()?.data ?? '{}')) as { result?: string };
  eq(body.result, 'easy', '请求体携带 result = easy');
}

section('6. nextCard — 索引前进');
{
  useHappyRoutes();
  const store = freshStore();
  await store.fetchDueCards(17);

  eq(store.currentIndex, 0, '初始索引 0');
  store.nextCard();
  eq(store.currentIndex, 1, 'nextCard 后索引 1');
  store.nextCard();
  eq(store.currentIndex, 2, '再次 nextCard 后索引 2（等于队列长度）');
}

section('7. resetSession — 全量清空');
{
  useHappyRoutes();
  const store = freshStore();
  await store.fetchDueCards(17);
  await store.submitReview(37, 'forgot');
  store.nextCard();

  store.resetSession();

  eq(store.queue.length, 0, '重置后队列为空');
  eq(store.currentIndex, 0, '重置后索引为 0');
  eq(store.sessionStats.reviewed, 0, '重置后 reviewed = 0');
  eq(store.sessionStats.forgot, 0, '重置后 forgot = 0');
  eq(store.isSessionEnd, false, '重置后会话未结束');
}

section('8. 完整会话模拟 — 2 张卡 good + easy（复刻浏览器验收场景）');
{
  useHappyRoutes();
  const store = freshStore();
  await store.fetchDueCards(17);

  // 第 1 张：good（浏览器验收按数字 3）
  eq(store.currentCard?.id, 37, '第 1 张卡片 id=37');
  await store.submitReview(37, 'good');
  store.nextCard();

  // 第 2 张：easy（浏览器验收按数字 4）
  eq(store.currentCard?.id, 38, '第 2 张卡片 id=38');
  await store.submitReview(38, 'easy');
  store.nextCard();

  // 结算断言（与 ReviewSummary 展示一致）
  eq(store.isSessionEnd, true, '会话结束');
  eq(store.sessionStats.reviewed, 2, '共复习 2 张');
  eq(store.sessionStats.good, 1, '正确 1 张');
  eq(store.sessionStats.easy, 1, '简单 1 张');
  eq(store.sessionStats.forgot, 0, '完全忘记 0 张');
  eq(store.sessionStats.hard, 0, '困难 0 张');
  // 正确率口径：(good + easy) / reviewed = 100%（与后端 reviewService 一致）
  const accuracy = Math.round(
    ((store.sessionStats.good + store.sessionStats.easy) / store.sessionStats.reviewed) * 100
  );
  eq(accuracy, 100, '正确率 = 100%');
}

section('9. 业务失败（code!==0）— reject 且统计不变');
{
  const store = freshStore();
  useHappyRoutes();
  await store.fetchDueCards(17);

  // 仅对评分请求切换为业务失败路由（加载队列仍走成功路由）
  route = () => ({
    status: 200,
    body: { code: 40401, message: '卡片不存在', data: null },
  });

  await expectReject(store.submitReview(37, 'good'), '业务失败时 submitReview reject');
  eq(store.sessionStats.reviewed, 0, '失败后 reviewed 不变');
  eq(store.sessionStats.good, 0, '失败后 good 不变');
}

// ===== 汇总 =====
console.log(`\n${BOLD}━━━ 汇总 ━━━${RESET}`);
console.log(`  ${GREEN}通过: ${passed}${RESET}  ${RED}失败: ${failed}${RESET}  总计: ${passed + failed}`);
if (failed > 0) {
  process.exitCode = 1;
}
