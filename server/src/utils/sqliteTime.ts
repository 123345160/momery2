/**
 * sqliteTime.ts — SQLite 时间格式工具（STANDARDS §6.2）
 *
 * 统一 JavaScript Date 与 SQLite datetime('now') 的格式，避免字符串比较失效。
 *
 * 背景（详见 docs/stage3b-time-format-fix.md）：
 * - SQLite datetime('now') 输出 'YYYY-MM-DD HH:MM:SS'（空格分隔、UTC、无 Z、无毫秒）
 * - JS Date.toISOString() 输出 'YYYY-MM-DDTHH:MM:SS.sssZ'（T 分隔、带 Z、带毫秒）
 * - TEXT 字段按 ASCII 字典序比较，'T'(0x54) > ' '(0x20)，
 *   导致 toISOString 写入的 next_review 永远大于 datetime('now')，到期筛选失效
 *
 * 使用场景：
 * - 凡写入 SQLite TEXT 时间字段、且后续参与 <= / >= / BETWEEN 与 datetime('now')
 *   比较的，必须用本函数生成，禁止直接用 toISOString()
 */

/**
 * 将 Date 转为 SQLite datetime 兼容的 UTC 格式字符串
 *
 * @param date 输入日期
 * @returns 'YYYY-MM-DD HH:MM:SS'（UTC，与 datetime('now') 字面一致）
 */
export function toSqliteUTC(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}
