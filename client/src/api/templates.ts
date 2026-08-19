/**
 * api/templates.ts — 卡片模板（FRONTEND §6.3.7）
 */

import client from './client';
import type { Template } from '@/types';

export interface CreateTemplateDto {
  name: string;
  description?: string;
  front: string;
  back: string;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  front?: string;
  back?: string;
}

export const templatesApi = {
  list: () => client.get('/templates') as unknown as Promise<Template[]>,
  create: (data: CreateTemplateDto) =>
    client.post('/templates', data) as unknown as Promise<{ id: number }>,
  update: (id: number, data: UpdateTemplateDto) =>
    client.put(`/templates/${id}`, data) as unknown as Promise<null>,
  remove: (id: number) => client.delete(`/templates/${id}`) as unknown as Promise<null>,
};
