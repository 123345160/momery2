/**
 * api/folders.ts — 文件夹（FRONTEND §6.3.7）
 */

import client from './client';
import type { Folder, FolderNode } from '@/types';

export interface CreateFolderDto {
  name: string;
  parentId?: number | null;
}

export const foldersApi = {
  getTree: () => client.get('/folders/tree') as unknown as Promise<FolderNode[]>,
  create: (data: CreateFolderDto) => client.post('/folders', data) as unknown as Promise<Folder>,
  rename: (id: number, name: string) => client.put(`/folders/${id}`, { name }) as unknown as Promise<null>,
  move: (id: number, parentId: number | null) =>
    client.put(`/folders/${id}/move`, { parentId }) as unknown as Promise<null>,
  remove: (id: number) => client.delete(`/folders/${id}`) as unknown as Promise<null>,
};
