/**
 * stage3c-import-export-stats-test.ts — 导入导出 + 统计概览端到端测试
 *
 * 覆盖端点（ARCH §6.2.7 / §6.2.11）：
 * - GET  /api/export/all
 * - GET  /api/export/deck/:id
 * - POST /api/import/json
 * - GET  /api/stats/overview
 *
 * 运行：npx tsx src/stage3c-import-export-stats-test.ts（需先启动 npm run dev）
 */

const BASE = 'http://localhost:3000';

async function req(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json };
}

let passed = 0;
let failed = 0;
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function ok(name: string) {
  passed++;
  console.log(`${GREEN}[PASS]${RESET} ${name}`);
}
function fail(name: string, msg: string) {
  failed++;
  console.log(`${RED}[FAIL]${RESET} ${name} — ${msg}`);
}

async function main() {
  console.log(`${CYAN}===== Stage 3c 导入导出 + 统计概览 端到端测试 =====${RESET}\n`);

  // ===== 准备数据 =====
  console.log(`${CYAN}--- 准备数据 ---${RESET}`);
  const deckRes = await req('POST', '/api/decks', { name: 'Export Test Deck', description: '测试导出' });
  if (deckRes.status === 201 && deckRes.json.code === 0) {
    ok('创建牌组');
  } else fail('创建牌组', JSON.stringify(deckRes.json));
  const deckId = deckRes.json.data.id;

  const card1Res = await req('POST', `/api/decks/${deckId}/cards`, { front: 'Q1', back: 'A1', tags: '["t1"]' });
  const card2Res = await req('POST', `/api/decks/${deckId}/cards`, { front: 'Q2', back: 'A2', tags: '["t2"]' });
  if (card1Res.status === 201 && card2Res.status === 201) ok('创建 2 张卡片');
  else fail('创建 2 张卡片', `${card1Res.status}/${card2Res.status}`);
  const card1Id = card1Res.json.data.id;

  const review1 = await req('POST', `/api/cards/${card1Id}/review`, { result: 'good' });
  const review2 = await req('POST', `/api/cards/${card2Res.json.data.id}/review`, { result: 'easy' });
  if (review1.status === 201 && review2.status === 201) ok('提交 2 次复习（生成 review_logs）');
  else fail('提交复习', `${review1.status}/${review2.status}`);

  // ===== exportAll =====
  console.log(`\n${CYAN}--- GET /api/export/all ---${RESET}`);
  const exportAll = await req('GET', '/api/export/all');
  if (exportAll.status === 200 && exportAll.json.code === 0) ok('exportAll 200');
  else fail('exportAll 200', `${exportAll.status}`);
  const payload = exportAll.json.data;
  if (payload.version === 1) ok('version=1');
  else fail('version=1', `${payload.version}`);
  if (Array.isArray(payload.decks) && payload.decks.length >= 1) ok('decks 是数组且非空');
  else fail('decks 是数组', `${typeof payload.decks}`);
  if (Array.isArray(payload.review_logs) && payload.review_logs.length >= 2) ok('review_logs.length>=2');
  else fail('review_logs.length=2', `${payload.review_logs?.length}`);
  const testDeck = payload.decks.find((d: { name: string }) => d.name === 'Export Test Deck');
  if (testDeck && Array.isArray(testDeck.cards) && testDeck.cards.length === 2) ok('Export Test Deck 含 2 卡片');
  else fail('Export Test Deck 卡片', `${testDeck?.cards?.length}`);
  if (testDeck && Array.isArray(testDeck.cards[0].tags)) ok('cards[0].tags 是数组');
  else fail('cards[0].tags 是数组', `${typeof testDeck?.cards?.[0]?.tags}`);
  if (payload.review_logs[0].deck_name && payload.review_logs[0].card_front) ok('review_logs[0] 含 deck_name + card_front');
  else fail('review_logs[0] 反查字段', JSON.stringify(payload.review_logs[0]));

  // ===== exportDeck =====
  console.log(`\n${CYAN}--- GET /api/export/deck/:id ---${RESET}`);
  const exportDeck = await req('GET', `/api/export/deck/${deckId}`);
  if (exportDeck.status === 200 && exportDeck.json.code === 0) ok('exportDeck 200');
  else fail('exportDeck 200', `${exportDeck.status}`);
  if (exportDeck.json.data.decks.length === 1 && exportDeck.json.data.decks[0].cards.length === 2) ok('单牌组只含 1 deck + 2 cards');
  else fail('单牌组结构', JSON.stringify(exportDeck.json.data.decks));

  const exportDeck404 = await req('GET', '/api/export/deck/99999');
  if (exportDeck404.status === 404 && exportDeck404.json.code === 40401) ok('exportDeck 不存在 → 404 DECK_NOT_FOUND');
  else fail('exportDeck 404', `${exportDeck404.status}/${exportDeck404.json.code}`);

  const exportDeck400 = await req('GET', '/api/export/deck/abc');
  if (exportDeck400.status === 400 && exportDeck400.json.code === 40002) ok('exportDeck 无效 id → 400 INVALID_FORMAT');
  else fail('exportDeck 400', `${exportDeck400.status}/${exportDeck400.json.code}`);

  // ===== importJson =====
  console.log(`\n${CYAN}--- POST /api/import/json ---${RESET}`);
  const importBody = {
    version: 1,
    decks: [
      {
        name: 'Imported Deck',
        description: '导入测试',
        cards: [
          {
            front: 'IQ1',
            back: 'IA1',
            tags: ['it1'],
            ease_factor: 2.5,
            interval: 1440,
            repetitions: 1,
            next_review: '2026-08-19T10:00:00.000Z',
            last_reviewed: '2026-08-18T10:00:00.000Z',
          },
        ],
      },
    ],
    review_logs: [
      {
        deck_name: 'Imported Deck',
        card_front: 'IQ1',
        result: 'good',
        reviewed_at: '2026-08-18T10:00:00.000Z',
      },
    ],
  };

  const importRes = await req('POST', '/api/import/json', importBody);
  if (importRes.status === 200 && importRes.json.code === 0) ok('importJson 200');
  else fail('importJson 200', `${importRes.status}/${JSON.stringify(importRes.json)}`);
  const s = importRes.json.data;
  if (s.decksCreated + s.decksMerged === 1 && s.cardsInserted + s.cardsSkipped === 1) ok('导入 1 牌组 + 1 卡片（新建或合并）');
  else fail('导入 1 牌组', JSON.stringify(s));

  // 验证导入的卡片有 SM-2 状态
  const importedDeck = await req('GET', '/api/decks');
  const found = importedDeck.json.data.items?.find((d: { name: string }) => d.name === 'Imported Deck');
  if (found) ok('导入的牌组可查询');
  else fail('导入牌组可查询', JSON.stringify(importedDeck.json.data));

  // 幂等：再次导入同 JSON
  const importAgain = await req('POST', '/api/import/json', importBody);
  if (importAgain.json.data.decksMerged === 1 && importAgain.json.data.cardsSkipped === 1) ok('幂等：decksMerged=1, cardsSkipped=1');
  else fail('幂等导入', JSON.stringify(importAgain.json.data));

  // INVALID_JSON：decks 非数组
  const importBad1 = await req('POST', '/api/import/json', { decks: 'not array' });
  if (importBad1.status === 400 && importBad1.json.code === 40005) ok('decks 非数组 → 400 INVALID_JSON');
  else fail('decks 非数组', `${importBad1.status}/${importBad1.json.code}`);

  // INVALID_JSON：缺 name
  const importBad2 = await req('POST', '/api/import/json', { decks: [{ cards: [] }] });
  if (importBad2.status === 400 && importBad2.json.code === 40005) ok('缺 name → 400 INVALID_JSON');
  else fail('缺 name', `${importBad2.status}/${importBad2.json.code}`);

  // INVALID_JSON：name 类型错误（非字符串）
  const importBad3 = await req('POST', '/api/import/json', { decks: [{ name: 123, cards: [] }] });
  if (importBad3.status === 400 && importBad3.json.code === 40005) ok('name 非字符串 → 400 INVALID_JSON');
  else fail('name 非字符串', `${importBad3.status}/${importBad3.json.code}`);

  // ===== stats overview =====
  console.log(`\n${CYAN}--- GET /api/stats/overview ---${RESET}`);
  const stats = await req('GET', '/api/stats/overview');
  if (stats.status === 200 && stats.json.code === 0) ok('overview 200');
  else fail('overview 200', `${stats.status}`);
  const ov = stats.json.data;
  if (typeof ov.totalCards === 'number' && ov.totalCards >= 3) ok(`totalCards=${ov.totalCards} (>=3)`);
  else fail('totalCards>=3', `${ov.totalCards}`);
  if (typeof ov.masteredCards === 'number' && ov.masteredCards >= 0) ok(`masteredCards=${ov.masteredCards}`);
  else fail('masteredCards', `${ov.masteredCards}`);
  if (typeof ov.dueToday === 'number' && ov.dueToday >= 0) ok(`dueToday=${ov.dueToday}`);
  else fail('dueToday', `${ov.dueToday}`);
  if (typeof ov.streakDays === 'number' && ov.streakDays >= 1) ok(`streakDays=${ov.streakDays} (>=1，今天有复习)`);
  else fail('streakDays>=1', `${ov.streakDays}`);
  if (typeof ov.accuracy === 'number' && ov.accuracy >= 0 && ov.accuracy <= 100) ok(`accuracy=${ov.accuracy} (0-100)`);
  else fail('accuracy 范围', `${ov.accuracy}`);

  // ===== 清理 =====
  console.log(`\n${CYAN}--- 清理 ---${RESET}`);
  const del1 = await req('DELETE', `/api/decks/${deckId}`);
  // 查询并删除 Imported Deck
  const listRes = await req('GET', '/api/decks');
  const importedDeckItem = listRes.json.data.items?.find((d: { name: string }) => d.name === 'Imported Deck');
  let delImported = { status: 0, json: { code: 0 } };
  if (importedDeckItem) {
    delImported = await req('DELETE', `/api/decks/${importedDeckItem.id}`);
  }
  if (del1.status === 200 && delImported.status === 200) ok('清理牌组（级联删除）');
  else fail('清理', `${del1.status}/${delImported.status}`);

  // ===== 汇总 =====
  console.log(`\n${CYAN}=========================================${RESET}`);
  console.log(`  测试汇总: ${GREEN}${passed} 通过${RESET} / ${RED}${failed} 失败${RESET}`);
  console.log(`${CYAN}=========================================${RESET}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
