/**
 * sqliteTime.ts 单元测试 — toSqliteUTC 边界覆盖
 *
 * 运行方式：npx tsx src/utils/sqliteTime-test.ts
 *
 * 覆盖维度：
 *   1. 基本功能（固定 UTC 时间点 → 输出格式）
 *   2. 格式正则一致性（^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$）
 *   3. 零填充（个位数月/日/时/分/秒补零）
 *   4. UTC 分量正确（getUTC* 而非 get*，不受本地时区影响）
 *   5. 毫秒截断（输入带毫秒，输出无毫秒）
 *   6. 跨年边界（年末 / 年初）
 *   7. 闰年（2 月 29 日存在性）
 *   8. 字典序 = 时间序（核心价值：字符串比较与时间先后一致）
 *   9. 无 T/Z 后缀（与 toISOString 输出对比）
 *  10. 跨月边界（月末 28/29/30/31 日 + 月末→次月初）
 *  11. 跨日边界（午夜 23:59:59 → 次日 00:00:00）
 *  12. Date 极值（Unix epoch / 9999 年 / 负时间戳）
 *  13. 月份索引映射（getUTCMonth 0-based + 1 易错点）
 */

import { toSqliteUTC } from './sqliteTime.js';

// ===== 颜色 + 格式 =====
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

function eq(actual: string, expected: string, label: string): void {
  const ok = actual === expected;
  assert(ok, label, ok ? undefined : `expected "${expected}", got "${actual}"`);
}

// 格式正则：YYYY-MM-DD HH:MM:SS
const FORMAT_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

// ===== 测试开始 =====

section('1. 基本功能 — 固定 UTC 时间点');
{
  // 构造一个已知 UTC 时刻：2026-06-15 10:30:45 UTC
  const date = new Date('2026-06-15T10:30:45.000Z');
  const out = toSqliteUTC(date);
  eq(out, '2026-06-15 10:30:45', '已知 UTC 时刻格式化正确');
}

section('2. 格式正则一致性');
{
  const cases = [
    new Date('2026-01-01T00:00:00.000Z'),
    new Date('2026-12-31T23:59:59.000Z'),
    new Date('2024-02-29T12:00:00.000Z'),
    new Date('2026-06-15T10:30:45.123Z'),
    new Date(),
  ];
  for (let i = 0; i < cases.length; i++) {
    const out = toSqliteUTC(cases[i]);
    assert(FORMAT_RE.test(out), `用例 ${i + 1} 匹配格式正则`, `output="${out}"`);
  }
}

section('3. 零填充 — 个位数分量补零');
{
  // 1 月 1 日 1 时 1 分 1 秒（全部个位数）
  const date = new Date('2026-01-01T01:01:01.000Z');
  const out = toSqliteUTC(date);
  eq(out, '2026-01-01 01:01:01', '月/日/时/分/秒全部补零');
}

section('4. UTC 分量正确 — 不受本地时区影响');
{
  // 同一 UTC 时刻，无论运行环境时区如何，输出必须反映 UTC 分量
  // 构造：2026-03-14 09:26:53 UTC（π 的近似日）
  const date = new Date('2026-03-14T09:26:53.000Z');
  const out = toSqliteUTC(date);
  eq(out, '2026-03-14 09:26:53', '输出与输入的 UTC 分量一致（用 getUTC*）');

  // 交叉验证：toSqliteUTC 输出应等于手动用 getUTC* 拼接的结果
  const pad = (n: number) => String(n).padStart(2, '0');
  const manual =
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  eq(out, manual, '与手动 getUTC* 拼接结果一致');
}

section('5. 毫秒截断 — 输入带毫秒，输出无毫秒');
{
  const withMs = new Date('2026-06-15T10:30:45.999Z');
  const out = toSqliteUTC(withMs);
  eq(out, '2026-06-15 10:30:45', '毫秒被丢弃');
  assert(!out.includes('.'), '输出不含小数点');
  // 同一秒不同毫秒，输出应相同
  const ms1 = new Date('2026-06-15T10:30:45.000Z');
  const ms2 = new Date('2026-06-15T10:30:45.999Z');
  eq(toSqliteUTC(ms1), toSqliteUTC(ms2), '同一秒不同毫秒输出一致');
}

section('6. 跨年边界');
{
  // 年末最后一秒
  const yearEnd = new Date('2025-12-31T23:59:59.000Z');
  eq(toSqliteUTC(yearEnd), '2025-12-31 23:59:59', '年末最后一秒');

  // 年初第一秒
  const yearStart = new Date('2026-01-01T00:00:00.000Z');
  eq(toSqliteUTC(yearStart), '2026-01-01 00:00:00', '年初第一秒');

  // 跨年瞬间：23:59:59 → 次年 00:00:00（差 1 秒，年份不同）
  assert(
    toSqliteUTC(yearEnd).slice(0, 4) === '2025' &&
      toSqliteUTC(yearStart).slice(0, 4) === '2026',
    '相邻两秒跨越年份边界'
  );
}

section('7. 闰年 — 2 月 29 日');
{
  // 闰年 2024：2 月 29 日存在
  const leap = new Date('2024-02-29T12:00:00.000Z');
  eq(toSqliteUTC(leap), '2024-02-29 12:00:00', '闰年 2024-02-29 存在');

  // 平年 2025：2 月 29 日不存在，Date 构造会溢出到 3 月 1 日
  const nonLeap = new Date('2025-02-29T12:00:00.000Z');
  eq(toSqliteUTC(nonLeap), '2025-03-01 12:00:00', '平年 2025-02-29 溢出为 3 月 1 日');
}

section('8. 字典序 = 时间序（核心价值）');
{
  // toSqliteUTC 的存在意义：格式统一后，字符串字典序与时间先后一致
  // 模拟到期筛选场景：now < future（字典序 < 时间序），now > past
  const now = new Date('2026-06-15T12:00:00.000Z');
  const past = new Date('2026-06-15T11:50:00.000Z'); // 10 分钟前
  const future = new Date('2026-06-15T12:10:00.000Z'); // 10 分钟后

  const sPast = toSqliteUTC(past);
  const sNow = toSqliteUTC(now);
  const sFuture = toSqliteUTC(future);

  assert(sPast < sNow, '过去 < 现在（字典序与时间序一致）', `${sPast} < ${sNow}`);
  assert(sNow < sFuture, '现在 < 未来（字典序与时间序一致）', `${sNow} < ${sFuture}`);
  assert(sPast < sFuture, '过去 < 未来', `${sPast} < ${sFuture}`);

  // 反例：toISOString 会因 'T' > ' ' 破坏字典序（验证修复的必要性）
  const isoPast = past.toISOString();
  const isoNow = now.toISOString();
  // toISOString 的字典序仍正确（因为都是 T 格式，同格式内比较 OK）
  // 但跨格式比较（toISOString vs datetime('now')）会失效
  assert(
    !isoPast.includes(' ') && isoPast.includes('T'),
    'toISOString 输出含 T 不含空格（与 datetime 不兼容）'
  );
}

section('9. 无 T/Z 后缀 — 与 datetime("now") 字面一致');
{
  const date = new Date('2026-06-15T10:30:45.000Z');
  const out = toSqliteUTC(date);

  assert(!out.includes('T'), '不含 T 分隔符');
  assert(!out.includes('Z'), '不含 Z 后缀');
  assert(!out.includes('.'), '不含毫秒小数点');
  assert(out.includes(' '), '用空格分隔日期与时间');

  // 模拟 SQLite 字符串比较：toSqliteUTC(now) <= toSqliteUTC(now) 应为 true（相等）
  const now = new Date();
  eq(toSqliteUTC(now), toSqliteUTC(now), '同一时刻输出确定且相等');
}

section('10. 跨月边界 — 月末日期');
{
  // 各月月末日期不同：28（2月平年）/29（2月闰年）/30（4/6/9/11月）/31（1/3/5/7/8/10/12月）
  const monthEnds = [
    { date: new Date('2026-01-31T23:59:59.000Z'), expected: '2026-01-31 23:59:59', label: '1月31日' },
    { date: new Date('2026-02-28T23:59:59.000Z'), expected: '2026-02-28 23:59:59', label: '2月28日（平年）' },
    { date: new Date('2024-02-29T23:59:59.000Z'), expected: '2024-02-29 23:59:59', label: '2月29日（闰年）' },
    { date: new Date('2026-04-30T23:59:59.000Z'), expected: '2026-04-30 23:59:59', label: '4月30日' },
    { date: new Date('2026-12-31T23:59:59.000Z'), expected: '2026-12-31 23:59:59', label: '12月31日' },
  ];
  for (const { date, expected, label } of monthEnds) {
    eq(toSqliteUTC(date), expected, `${label} 月末最后一秒`);
  }

  // 月末→次月初跨月瞬间
  const janEnd = new Date('2026-01-31T23:59:59.000Z');
  const febStart = new Date('2026-02-01T00:00:00.000Z');
  assert(
    toSqliteUTC(janEnd).slice(5, 7) === '01' &&
      toSqliteUTC(febStart).slice(5, 7) === '02',
    '相邻两秒跨越月份边界（01月 → 02月）'
  );
}

section('11. 跨日边界 — 午夜');
{
  // 午夜前最后一秒 → 次日零点
  const dayEnd = new Date('2026-06-15T23:59:59.000Z');
  const nextStart = new Date('2026-06-16T00:00:00.000Z');
  eq(toSqliteUTC(dayEnd), '2026-06-15 23:59:59', '当日最后一秒');
  eq(toSqliteUTC(nextStart), '2026-06-16 00:00:00', '次日零点');
  assert(
    toSqliteUTC(dayEnd).slice(8, 10) === '15' &&
      toSqliteUTC(nextStart).slice(8, 10) === '16',
    '相邻两秒跨越日期边界（15日 → 16日）'
  );

  // 午夜 00:00:00 各分量零填充
  const midnight = new Date('2026-06-15T00:00:00.000Z');
  eq(toSqliteUTC(midnight), '2026-06-15 00:00:00', '午夜零点全部补零');
}

section('12. Date 极值 — epoch / 远未来');
{
  // Unix epoch 起点：1970-01-01 00:00:00 UTC
  const epoch = new Date(0);
  eq(toSqliteUTC(epoch), '1970-01-01 00:00:00', 'Unix epoch 起点');

  // 远未来：9999-12-31 23:59:59 UTC（Date 支持上限附近）
  const farFuture = new Date('9999-12-31T23:59:59.000Z');
  const farOut = toSqliteUTC(farFuture);
  assert(FORMAT_RE.test(farOut), '远未来日期匹配格式正则', `output="${farOut}"`);
  eq(farOut, '9999-12-31 23:59:59', '9999 年最后一天');

  // 负时间戳（1969 年）——Date 支持负值，验证不崩溃
  const beforeEpoch = new Date(-1);
  const beforeOut = toSqliteUTC(beforeEpoch);
  assert(FORMAT_RE.test(beforeOut), 'epoch 前负时间戳匹配格式正则', `output="${beforeOut}"`);
}

section('13. 月份索引映射 — getUTCMonth 0-based + 1');
{
  // getUTCMonth 返回 0-11（0=1月，11=12月），+1 映射易错，逐月验证
  const months = [
    { iso: '2026-01-15T00:00:00.000Z', expected: '01', label: '1月（索引0）' },
    { iso: '2026-06-15T00:00:00.000Z', expected: '06', label: '6月（索引5）' },
    { iso: '2026-12-15T00:00:00.000Z', expected: '12', label: '12月（索引11）' },
  ];
  for (const { iso, expected, label } of months) {
    const out = toSqliteUTC(new Date(iso));
    eq(out.slice(5, 7), expected, `${label} 月份分量正确`);
  }

  // 边界：12 月（索引 11）+1 = 12，不能误为 13 或 11
  const dec = new Date('2026-12-15T00:00:00.000Z');
  assert(
    toSqliteUTC(dec).slice(5, 7) === '12',
    '12月输出 "12"（非 "11" 或 "13"）'
  );
}

// ===== 汇总 =====
console.log(`\n${BOLD}━━━ 汇总 ━━━${RESET}`);
console.log(`  ${GREEN}通过: ${passed}${RESET} / ${RED}失败: ${failed}${RESET}`);
if (failed > 0) {
  process.exitCode = 1;
}
