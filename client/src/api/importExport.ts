/**
 * 导入导出 API 模块（FRONTEND §6.3.10）
 * 对应后端：GET /api/export/all、GET /api/export/deck/:id、POST /api/import/json
 *
 * 导出说明（ARCH §6.2.11 + §10.1）：
 * - 后端导出端点经 success() 返回 JSON 包装体 {code, message, data}
 * - 前端走普通 JSON 请求 → 响应拦截器解包拿到纯 ExportPayload
 * - 再序列化为 application/json Blob 供页面触发下载（保证导出文件可直接再导入）
 */

import client from './client';
import type { ImportJsonDto, ImportSummary } from '@/types';

/** 纯 ExportPayload → 下载用 JSON Blob */
function toDownloadBlob(payload: unknown): Blob {
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

/** GET /api/export/all — 全量导出（返回可下载 Blob） */
export async function exportAll(): Promise<Blob> {
  const payload = await client.get('/export/all');
  return toDownloadBlob(payload);
}

/** GET /api/export/deck/:id — 单牌组导出（返回可下载 Blob） */
export async function exportDeck(deckId: number): Promise<Blob> {
  const payload = await client.get(`/export/deck/${deckId}`);
  return toDownloadBlob(payload);
}

/** POST /api/import/json — JSON 导入（幂等+事务保护） */
export function importJson(data: ImportJsonDto): Promise<ImportSummary> {
  return client.post('/import/json', data) as unknown as Promise<ImportSummary>;
}
