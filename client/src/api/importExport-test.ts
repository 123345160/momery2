/**
 * importExport API 单元测试 — 导入导出闭环（Stage 5c 数据面板 + 导入导出 UI）
 *
 * 运行方式：npx tsx src/api/importExport-test.ts
 *
 * 测试策略：
 *   覆盖 axios adapter 扩展点拦截 HTTP 请求（零新增依赖、不发真实网络请求），
 *   复用 client.ts 真实响应拦截器链路（code===0 解包 data），
 *   验证导出 Blob 内容为纯 ExportPayload（可直接再导入，ARCH §10.1）。
 *
 * 覆盖维度：
 *   1. exportAll — 路由 / 请求方法 / Blob 类型 / Blob 内容为纯 payload（非 {code,message,data} 包装）
 *   2. exportDeck — 路由 / Blob 内容为纯 payload
 *   3. importJson — 请求方法 / 路由 / 请求体 / 成功解包 ImportSummary
 *   4. importJson 业务失败（code!==0）— reject
 *   5. 导出→导入回环 — exportAll 的 Blob 文本可直接作为 importJson 请求体
 */

import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import client from './client';
import { exportAll, exportDeck, importJson } from './importExport';
import type { ImportSummary } from '../types';

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

async function expectReject(p: Promise<unknown>, label: string): Promise<void> {
  try {
    await p;
    assert(false, label, 'expected rejection but resolved');
  } catch {
    assert(true, label);
  }
}

// ===== Mock 数据（结构对齐 ARCH §10.1 导出格式） =====

const EXPORT_PAYLOAD = {
  version: 1,
  exportedAt: '2026-08-19T10:00:00.000Z',
  decks: [
    {
      name: '生物 - 细胞学',
      description: '',
      cards: [
        {
          front: '光合作用的化学方程式是？',
          back: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
          tags: ['生物', '光合作用'],
          ease_factor: 2.5,
          interval: 4320,
          repetitions: 2,
          next_review: '2026-06-20T10:00:00.000Z',
          last_reviewed: '2026-06-17T10:00:00.000Z',
        },
      ],
    },
  ],
  review_logs: [
    { deck_name: '生物 - 细胞学', card_front: '光合作用的化学方程式是？', result: 'good', reviewed_at: '2026-06-17T10:00:00.000Z' },
  ],
  notes: [],
  templates: [],
};

const IMPORT_SUMMARY: ImportSummary = {
  decksCreated: 1,
  decksMerged: 0,
  cardsInserted: 1,
  cardsSkipped: 0,
  notesInserted: 0,
  templatesInserted: 0,
};

// ===== axios adapter 拦截（复用真实响应拦截器链路） =====

let lastConfig: InternalAxiosRequestConfig | null = null;

function lastRequest(): InternalAxiosRequestConfig | null {
  return lastConfig;
}

type MockResult = { status: number; body: unknown };

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

async function main(): Promise<void> {
  // ===== 1. exportAll =====
  section('1. exportAll — 路由 / 方法 / Blob 类型与内容');
  route = () => ({ status: 200, body: { code: 0, message: 'ok', data: EXPORT_PAYLOAD } });

  const allBlob = await exportAll();
  eq(lastRequest()?.method ?? '', 'get', '请求方法为 GET');
  eq(lastRequest()?.url ?? '', '/export/all', '请求路由为 /export/all');
  eq(allBlob.type, 'application/json', 'Blob MIME 类型为 application/json');

  const allText = await allBlob.text();
  const allParsed = JSON.parse(allText) as Record<string, unknown>;
  eq(allParsed.version, 1, 'Blob 内容含 version=1');
  assert(Array.isArray(allParsed.decks), 'Blob 内容含 decks 数组');
  assert(!('code' in allParsed), 'Blob 内容不含 code 字段（纯 payload，非响应包装）');
  assert(!('message' in allParsed), 'Blob 内容不含 message 字段');
  eq(
    JSON.stringify(allParsed),
    JSON.stringify(EXPORT_PAYLOAD),
    'Blob 内容与后端 ExportPayload 逐字段一致'
  );

  // ===== 2. exportDeck =====
  section('2. exportDeck — 路由 / Blob 内容为纯 payload');
  const deckBlob = await exportDeck(17);
  eq(lastRequest()?.url ?? '', '/export/deck/17', '请求路由为 /export/deck/17');
  const deckParsed = JSON.parse(await deckBlob.text()) as Record<string, unknown>;
  eq(deckParsed.version, 1, 'Blob 内容含 version=1');
  assert(!('code' in deckParsed), 'Blob 内容不含 code 字段（纯 payload）');

  // ===== 3. importJson 成功 =====
  section('3. importJson — 方法 / 路由 / 请求体 / 解包 ImportSummary');
  route = () => ({ status: 200, body: { code: 0, message: 'ok', data: IMPORT_SUMMARY } });

  const summary = await importJson(EXPORT_PAYLOAD);
  eq(lastRequest()?.method ?? '', 'post', '请求方法为 POST');
  eq(lastRequest()?.url ?? '', '/import/json', '请求路由为 /import/json');
  // axios 发送前已将对象序列化为字符串（transformRequest），先 parse 再比较
  const sentData =
    typeof lastRequest()?.data === 'string'
      ? JSON.parse(String(lastRequest()?.data))
      : (lastRequest()?.data as unknown);
  eq(
    JSON.stringify(sentData ?? null),
    JSON.stringify(EXPORT_PAYLOAD),
    '请求体为导入 JSON 原文'
  );
  eq(summary.decksCreated, 1, '解包 decksCreated = 1');
  eq(summary.cardsInserted, 1, '解包 cardsInserted = 1');
  eq(summary.cardsSkipped, 0, '解包 cardsSkipped = 0');

  // ===== 4. importJson 业务失败 =====
  section('4. importJson 业务失败（code!==0）— reject');
  route = () => ({ status: 400, body: { code: 40002, message: 'JSON 结构不合法', data: null } });
  await expectReject(importJson({ decks: '不是数组' }), '业务失败时 importJson reject');

  // ===== 5. 导出→导入回环 =====
  section('5. 导出→导入回环 — exportAll 的 Blob 文本可直接再导入');
  route = (config) => {
    if (config.url === '/export/all') {
      return { status: 200, body: { code: 0, message: 'ok', data: EXPORT_PAYLOAD } };
    }
    // 校验导入请求体：解析后应与 EXPORT_PAYLOAD 完全一致（round-trip）
    const sent = JSON.parse(String(config.data)) as Record<string, unknown>;
    const roundTripOk = JSON.stringify(sent) === JSON.stringify(EXPORT_PAYLOAD);
    return {
      status: 200,
      body: roundTripOk
        ? { code: 0, message: 'ok', data: IMPORT_SUMMARY }
        : { code: 40002, message: '回环校验失败', data: null },
    };
  };

  const roundBlob = await exportAll();
  const roundSummary = await importJson(JSON.parse(await roundBlob.text()));
  eq(roundSummary.decksCreated, 1, '导出文件原文作为导入请求体 → 导入成功（round-trip 闭环）');

  // ===== 汇总 =====
  console.log(`\n${BOLD}━━━ 汇总 ━━━${RESET}`);
  console.log(`  通过: ${GREEN}${passed}${RESET}  失败: ${RED}${failed}${RESET}  总计: ${passed + failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`${RED}测试脚本异常中断：${(err as Error).message}${RESET}`);
  process.exit(1);
});
