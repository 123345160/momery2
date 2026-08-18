/**
 * 导入导出 API 模块（FRONTEND §6.3.10）
 * 对应后端：GET /api/export/all、GET /api/export/deck/:id、POST /api/import/json
 */

import client from './client';
import type { ImportJsonDto, ImportSummary } from '@/types';

/** GET /api/export/all — 全量导出（返回 Blob，前端触发下载） */
export async function exportAll(): Promise<Blob> {
  const response = await client.get('/export/all', { responseType: 'blob' });
  // 响应拦截器已解包 data，但 blob 类型需直接拿 response.data
  // 注：axios responseType=blob 时 response.data 即 Blob，拦截器对 blob 响应不生效
  return response as unknown as Blob;
}

/** GET /api/export/deck/:id — 单牌组导出（返回 Blob） */
export async function exportDeck(deckId: number): Promise<Blob> {
  const response = await client.get(`/export/deck/${deckId}`, { responseType: 'blob' });
  return response as unknown as Blob;
}

/** POST /api/import/json — JSON 导入（幂等+事务保护） */
export function importJson(data: ImportJsonDto): Promise<ImportSummary> {
  return client.post('/import/json', data) as unknown as Promise<ImportSummary>;
}
