/**
 * Stage 3b Review API — 端到端测试脚本
 * 用 Node.js fetch 绕过 PowerShell 引号问题
 *
 * 覆盖：
 * - GET  /api/decks/:deckId/due
 * - POST /api/cards/:id/review
 * - GET  /api/decks/:deckId/review-progress
 *
 * 验证点：
 * - SM-2 四种评分结果（forgot/hard/good/easy）的 interval/repetitions/ease_factor 变化
 * - 事务原子性（卡片状态更新 + 复习日志写入）
 * - 到期筛选逻辑
 * - 进度统计（正确率 = (good+easy)/total）
 * - 错误场景（无效 ID / 无效 result / 不存在的卡片 / 不存在的牌组）
 */

const BASE = 'http://localhost:3000/api';

interface ResponseBody {
  code: number;
  message: string;
  data?: unknown;
}

async function req(method: string, path: string, body?: unknown): Promise<{ status: number; json: ResponseBody }> {
  const url = `${BASE}${path}`;
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const json = (await res.json()) as ResponseBody;
  return { status: res.status, json };
}

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`  ❌ 断言失败: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✅ ${msg}`);
  }
}

async function main() {
  let pass = 0;
  let fail = 0;
  const mark = (ok: boolean) => { ok ? pass++ : fail++; };

  // === 准备：创建牌组 + 4 张卡片 ===
  console.log('\n=== 0. 准备测试数据 ===');
  const deckRes = await req('POST', '/decks', { name: 'Review Test Deck', description: 'stage3b e2e' });
  console.log(deckRes);
  const deckId = deckRes.json.data as { id: number };
  assert(deckRes.status === 201, '创建牌组成功 (201)');
  mark(deckRes.status === 201);

  const cardIds: number[] = [];
  for (let i = 1; i <= 4; i++) {
    const r = await req('POST', `/decks/${deckId.id}/cards`, { front: `Q${i}=?`, back: `A${i}` });
    const d = r.json.data as { id: number };
    cardIds.push(d.id);
    assert(r.status === 201, `创建卡片 ${i} 成功 (id=${d.id})`);
    mark(r.status === 201);
  }
  console.log(`  cardIds = [${cardIds.join(', ')}]`);

  // === 1. GET /api/decks/:deckId/due（应返回 4 张到期卡片）===
  console.log('\n=== 1. GET /api/decks/:deckId/due（4 张到期）===');
  const due1 = await req('GET', `/decks/${deckId.id}/due`);
  console.log(due1);
  const due1Data = due1.json.data as Array<{ id: number }>;
  assert(due1.status === 200, 'HTTP 200');
  assert(Array.isArray(due1.json.data), 'data 是数组');
  assert(due1Data.length === 4, `到期卡片数 = 4 (实际: ${due1Data.length})`);
  mark(due1.status === 200 && due1Data.length === 4);

  // === 2. POST /api/cards/:id/review — good（首次）===
  // 预期：repetitions=1, interval=1440(1天), ease_factor=2.5(不变)
  console.log('\n=== 2. POST review (good) — 首次 good ===');
  const goodRes = await req('POST', `/cards/${cardIds[0]}/review`, { result: 'good' });
  console.log(goodRes);
  const goodCard = goodRes.json.data as { repetitions: number; interval: number; ease_factor: number; next_review: string; last_reviewed: string };
  assert(goodRes.status === 201, 'HTTP 201 (created)');
  assert(goodCard.repetitions === 1, `repetitions = 1 (实际: ${goodCard.repetitions})`);
  assert(goodCard.interval === 1440, `interval = 1440 分钟 (实际: ${goodCard.interval})`);
  assert(goodCard.ease_factor === 2.5, `ease_factor = 2.5 (实际: ${goodCard.ease_factor})`);
  assert(goodCard.last_reviewed !== null, 'last_reviewed 已写入');
  mark(goodRes.status === 201 && goodCard.repetitions === 1 && goodCard.interval === 1440 && goodCard.ease_factor === 2.5);

  // === 3. POST review — easy（首次）===
  // 预期：repetitions=1, interval=5760(4天), ease_factor=2.65(+0.15)
  console.log('\n=== 3. POST review (easy) — 首次 easy ===');
  const easyRes = await req('POST', `/cards/${cardIds[1]}/review`, { result: 'easy' });
  console.log(easyRes);
  const easyCard = easyRes.json.data as { repetitions: number; interval: number; ease_factor: number };
  assert(easyRes.status === 201, 'HTTP 201');
  assert(easyCard.repetitions === 1, `repetitions = 1 (实际: ${easyCard.repetitions})`);
  assert(easyCard.interval === 5760, `interval = 5760 分钟 (实际: ${easyCard.interval})`);
  assert(easyCard.ease_factor === 2.65, `ease_factor = 2.65 (实际: ${easyCard.ease_factor})`);
  mark(easyRes.status === 201 && easyCard.interval === 5760 && easyCard.ease_factor === 2.65);

  // === 4. POST review — hard ===
  // 预期：repetitions=0, interval=1440(1天), ease_factor=2.35(-0.15)
  console.log('\n=== 4. POST review (hard) ===');
  const hardRes = await req('POST', `/cards/${cardIds[2]}/review`, { result: 'hard' });
  console.log(hardRes);
  const hardCard = hardRes.json.data as { repetitions: number; interval: number; ease_factor: number };
  assert(hardRes.status === 201, 'HTTP 201');
  assert(hardCard.repetitions === 0, `repetitions = 0 (实际: ${hardCard.repetitions})`);
  assert(hardCard.interval === 1440, `interval = 1440 分钟 (实际: ${hardCard.interval})`);
  assert(hardCard.ease_factor === 2.35, `ease_factor = 2.35 (实际: ${hardCard.ease_factor})`);
  mark(hardRes.status === 201 && hardCard.interval === 1440 && hardCard.ease_factor === 2.35);

  // === 5. POST review — forgot ===
  // 预期：repetitions=0, interval=10(10分钟), ease_factor=2.3(-0.2)
  console.log('\n=== 5. POST review (forgot) ===');
  const forgotRes = await req('POST', `/cards/${cardIds[3]}/review`, { result: 'forgot' });
  console.log(forgotRes);
  const forgotCard = forgotRes.json.data as { repetitions: number; interval: number; ease_factor: number };
  assert(forgotRes.status === 201, 'HTTP 201');
  assert(forgotCard.repetitions === 0, `repetitions = 0 (实际: ${forgotCard.repetitions})`);
  assert(forgotCard.interval === 10, `interval = 10 分钟 (实际: ${forgotCard.interval})`);
  assert(forgotCard.ease_factor === 2.3, `ease_factor = 2.3 (实际: ${forgotCard.ease_factor})`);
  mark(forgotRes.status === 201 && forgotCard.interval === 10 && forgotCard.ease_factor === 2.3);

  // === 6. GET /api/decks/:deckId/due（复习后，应返回 0 张到期）===
  console.log('\n=== 6. GET /api/decks/:deckId/due（复习后 0 张到期）===');
  const due2 = await req('GET', `/decks/${deckId.id}/due`);
  console.log(due2);
  const due2Data = due2.json.data as Array<unknown>;
  assert(due2.status === 200, 'HTTP 200');
  assert(due2Data.length === 0, `到期卡片数 = 0 (实际: ${due2Data.length})`);
  mark(due2.status === 200 && due2Data.length === 0);

  // === 7. GET /api/decks/:deckId/review-progress ===
  // 预期：totalCards=4, dueCards=0, reviewedToday=4, accuracy=50 ((good+easy)/4)
  console.log('\n=== 7. GET /api/decks/:deckId/review-progress ===');
  const progressRes = await req('GET', `/decks/${deckId.id}/review-progress`);
  console.log(progressRes);
  const progress = progressRes.json.data as { deckId: number; totalCards: number; dueCards: number; reviewedToday: number; accuracy: number };
  assert(progressRes.status === 200, 'HTTP 200');
  assert(progress.totalCards === 4, `totalCards = 4 (实际: ${progress.totalCards})`);
  assert(progress.dueCards === 0, `dueCards = 0 (实际: ${progress.dueCards})`);
  assert(progress.reviewedToday === 4, `reviewedToday = 4 (实际: ${progress.reviewedToday})`);
  assert(progress.accuracy === 50, `accuracy = 50 (实际: ${progress.accuracy})`);
  mark(progressRes.status === 200 && progress.totalCards === 4 && progress.reviewedToday === 4 && progress.accuracy === 50);

  // === 8. 错误场景：卡片不存在 ===
  console.log('\n=== 8. POST /api/cards/999/review — 卡片不存在 ===');
  const err1 = await req('POST', '/cards/999/review', { result: 'good' });
  console.log(err1);
  assert(err1.status === 404, 'HTTP 404');
  assert(err1.json.code === 40402, `code = 40402 CARD_NOT_FOUND (实际: ${err1.json.code})`);
  mark(err1.status === 404 && err1.json.code === 40402);

  // === 9. 错误场景：无效 result ===
  console.log('\n=== 9. POST review — 无效 result ===');
  const err2 = await req('POST', `/cards/${cardIds[0]}/review`, { result: 'invalid' });
  console.log(err2);
  assert(err2.status === 400, 'HTTP 400');
  assert(err2.json.code === 40002, `code = 40002 INVALID_FORMAT (实际: ${err2.json.code})`);
  mark(err2.status === 400 && err2.json.code === 40002);

  // === 10. 错误场景：result 缺失 ===
  console.log('\n=== 10. POST review — result 缺失 ===');
  const err3 = await req('POST', `/cards/${cardIds[0]}/review`, {});
  console.log(err3);
  assert(err3.status === 400, 'HTTP 400');
  assert(err3.json.code === 40002, `code = 40002 (实际: ${err3.json.code})`);
  mark(err3.status === 400 && err3.json.code === 40002);

  // === 11. 错误场景：无效 cardId ===
  console.log('\n=== 11. POST /api/cards/abc/review — 无效 cardId ===');
  const err4 = await req('POST', '/cards/abc/review', { result: 'good' });
  console.log(err4);
  assert(err4.status === 400, 'HTTP 400');
  assert(err4.json.code === 40002, `code = 40002 (实际: ${err4.json.code})`);
  mark(err4.status === 400 && err4.json.code === 40002);

  // === 12. 错误场景：牌组不存在（due）===
  console.log('\n=== 12. GET /api/decks/999/due — 牌组不存在 ===');
  const err5 = await req('GET', '/decks/999/due');
  console.log(err5);
  assert(err5.status === 404, 'HTTP 404');
  assert(err5.json.code === 40401, `code = 40401 DECK_NOT_FOUND (实际: ${err5.json.code})`);
  mark(err5.status === 404 && err5.json.code === 40401);

  // === 13. 错误场景：无效 deckId（due）===
  console.log('\n=== 13. GET /api/decks/abc/due — 无效 deckId ===');
  const err6 = await req('GET', '/decks/abc/due');
  console.log(err6);
  assert(err6.status === 400, 'HTTP 400');
  assert(err6.json.code === 40002, `code = 40002 (实际: ${err6.json.code})`);
  mark(err6.status === 400 && err6.json.code === 40002);

  // === 14. 错误场景：牌组不存在（progress）===
  console.log('\n=== 14. GET /api/decks/999/review-progress — 牌组不存在 ===');
  const err7 = await req('GET', '/decks/999/review-progress');
  console.log(err7);
  assert(err7.status === 404, 'HTTP 404');
  assert(err7.json.code === 40401, `code = 40401 (实际: ${err7.json.code})`);
  mark(err7.status === 404 && err7.json.code === 40401);

  // === 清理：删除牌组（级联删除卡片 + 复习日志）===
  console.log('\n=== 清理：DELETE 牌组 ===');
  const cleanup = await req('DELETE', `/decks/${deckId.id}`);
  console.log(cleanup);
  assert(cleanup.status === 200, '清理成功');
  mark(cleanup.status === 200);

  // === 汇总 ===
  console.log('\n=========================================');
  console.log(`  测试汇总: ${pass} 通过 / ${fail} 失败`);
  console.log('=========================================');
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('测试脚本异常:', e);
  process.exitCode = 1;
});
