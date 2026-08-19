/**
 * templateService.ts — 卡片模板业务逻辑层
 * 预置模板（is_default=1）受保护：不可改、不可删
 */

import { templateRepo } from '../repositories/templateRepo.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import type { Template, TemplateInsertDTO } from '../types/index.js';

const MAX_NAME_LENGTH = 100;

function validateName(name: string): string {
  const trimmed = name?.trim();
  if (!trimmed) throw new AppError(ErrorCodes.MISSING_FIELD, '模板名称不能为空', 400);
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new AppError(ErrorCodes.INVALID_FORMAT, `模板名称不能超过 ${MAX_NAME_LENGTH} 字符`, 400);
  }
  return trimmed;
}

function validateExists(id: number): Template {
  const t = templateRepo.getById(id);
  if (!t) throw new AppError(ErrorCodes.TEMPLATE_NOT_FOUND, '模板不存在', 404);
  return t;
}

export const templateService = {
  list(): Template[] {
    return templateRepo.getAll();
  },

  get(id: number): Template {
    return validateExists(id);
  },

  /** 创建自定义模板 */
  create(dto: TemplateInsertDTO): number {
    const name = validateName(dto.name);
    if (!dto.front?.trim()) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '正面模板不能为空', 400);
    }
    if (!dto.back?.trim()) {
      throw new AppError(ErrorCodes.MISSING_FIELD, '背面模板不能为空', 400);
    }
    const insertDto: TemplateInsertDTO = { name, front: dto.front, back: dto.back };
    if (dto.description !== undefined) insertDto.description = dto.description;
    return templateRepo.insert(insertDto);
  },

  /** 更新（预置模板拒绝） */
  update(id: number, dto: Partial<TemplateInsertDTO>): void {
    const t = validateExists(id);
    if (t.is_default) {
      throw new AppError(ErrorCodes.DEFAULT_TEMPLATE, '预置模板不可修改', 409);
    }
    if (dto.name !== undefined) dto.name = validateName(dto.name);
    const changes = templateRepo.update(id, dto);
    if (changes === 0) throw new AppError(ErrorCodes.TEMPLATE_NOT_FOUND, '模板不存在', 404);
  },

  /** 删除（预置模板拒绝） */
  remove(id: number): void {
    const t = validateExists(id);
    if (t.is_default) {
      throw new AppError(ErrorCodes.DEFAULT_TEMPLATE, '预置模板不可删除', 409);
    }
    const changes = templateRepo.remove(id);
    if (changes === 0) throw new AppError(ErrorCodes.TEMPLATE_NOT_FOUND, '模板不存在', 404);
  },
};
