/**
 * folderService.ts — 文件夹业务逻辑层
 *
 * 职责：
 * - 编排 folderRepo（校验/树构建）
 * - 参数校验 → 抛出 AppError
 * - 文件夹树构建（内存构建 FolderNode 树）
 * - 非空保护（删除前校验无子文件夹与笔记）
 * - 循环引用防护（移动时禁止将文件夹挂到自身子树）
 */

import { folderRepo } from '../repositories/folderRepo.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type { Folder, FolderInsertDTO, FolderUpdateDTO, FolderNode } from '../types/index.js';

const MAX_NAME_LENGTH = 100;

/** 校验文件夹名 */
function validateName(name: string): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    throw new AppError(ErrorCodes.MISSING_FIELD, '文件夹名称不能为空', 400);
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new AppError(
      ErrorCodes.INVALID_FORMAT,
      `文件夹名称不能超过 ${MAX_NAME_LENGTH} 字符`,
      400,
    );
  }
  return trimmed;
}

/** 校验文件夹存在 */
function validateExists(id: number): Folder {
  const folder = folderRepo.getById(id);
  if (!folder) {
    throw new AppError(ErrorCodes.FOLDER_NOT_FOUND, '文件夹不存在', 404);
  }
  return folder;
}

/** 收集某文件夹的所有后代 id（含自身），用于循环引用检测 */
function collectDescendantIds(rootId: number, all: Folder[]): Set<number> {
  const childrenMap = new Map<number | null, Folder[]>();
  for (const f of all) {
    const key = f.parent_id;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(f);
  }
  const result = new Set<number>();
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    result.add(cur);
    const kids = childrenMap.get(cur) ?? [];
    for (const k of kids) stack.push(k.id);
  }
  return result;
}

export const folderService = {
  /** 创建文件夹（支持 nestParentId 嵌套到父；不允许同名同级） */
  create(dto: FolderInsertDTO): number {
    const name = validateName(dto.name);

    if (dto.parentId !== null && dto.parentId !== undefined) {
      validateExists(dto.parentId);
    }
    const parentId = dto.parentId ?? null;

    const dup = folderRepo.getByNameAndParent(name, parentId);
    if (dup) {
      throw new AppError(
        ErrorCodes.DECK_DUPLICATE,
        '同级目录下已存在同名文件夹',
        409,
      );
    }

    return folderRepo.insert({ name, parentId });
  },

  /**
   * 返回文件夹树（FolderNode[]，顶层 parent_id IS NULL）
   * 每个节点带 noteCount（直接笔记数）与 children（递归）
   */
  getTree(): FolderNode[] {
    const all = folderRepo.getAll();
    const childrenMap = new Map<number | null, Folder[]>();
    for (const f of all) {
      const key = f.parent_id;
      if (!childrenMap.has(key)) childrenMap.set(key, []);
      childrenMap.get(key)!.push(f);
    }

    const build = (parentId: number | null): FolderNode[] => {
      const folders = childrenMap.get(parentId) ?? [];
      return folders.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
        noteCount: folderRepo.countNotes(f.id),
        children: build(f.id),
      }));
    };

    return build(null);
  },

  /** 重命名 */
  rename(id: number, dto: FolderUpdateDTO): void {
    const folder = validateExists(id);
    if (dto.name !== undefined) {
      const name = validateName(dto.name);
      const dup = folderRepo.getByNameAndParent(name, folder.parent_id);
      if (dup && dup.id !== id) {
        throw new AppError(
          ErrorCodes.DECK_DUPLICATE,
          '同级目录下已存在同名文件夹',
          409,
        );
      }
      const changes = folderRepo.update(id, { name });
      if (changes === 0) throw new AppError(ErrorCodes.FOLDER_NOT_FOUND, '文件夹不存在', 404);
    }
  },

  /**
   * 移动文件夹到新父（循环引用防护）
   * 若 parentId 为当前文件夹或其后代，则拒绝
   */
  move(id: number, parentId: number | null): void {
    validateExists(id);
    if (parentId === null) {
      folderRepo.moveTo(id, null);
      return;
    }
    if (parentId === id) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '不能将文件夹移动到自身', 400);
    }
    validateExists(parentId);

    const all = folderRepo.getAll();
    const descendants = collectDescendantIds(id, all);
    if (descendants.has(parentId)) {
      throw new AppError(
        ErrorCodes.MISSING_FIELD,
        '不能将文件夹移动到其子文件夹中',
        400,
      );
    }
    folderRepo.moveTo(id, parentId);
  },

  /**
   * 删除文件夹（非空保护）
   * - 存在子文件夹 → 拒绝
   * - 存在直接笔记 → 拒绝（notes.folder_id RESTRICT 也会拦截）
   */
  remove(id: number): void {
    validateExists(id);
    if (folderRepo.countChildren(id) > 0) {
      throw new AppError(
        ErrorCodes.FOLDER_NOT_EMPTY,
        '文件夹非空：请先删除子文件夹',
        409,
      );
    }
    if (folderRepo.countNotes(id) > 0) {
      throw new AppError(ErrorCodes.FOLDER_NOT_EMPTY, '文件夹非空：请先删除笔记', 409);
    }
    const changes = folderRepo.remove(id);
    if (changes === 0) throw new AppError(ErrorCodes.FOLDER_NOT_FOUND, '文件夹不存在', 404);
  },
};
