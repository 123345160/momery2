/**
 * noteAttachmentService.ts — 笔记附件业务逻辑层
 * 负责文件落盘 + DB 元数据写入
 */

import fs from 'fs';
import path from 'path';
import { noteAttachmentRepo } from '../repositories/noteAttachmentRepo.js';
import { noteRepo } from '../repositories/noteRepo.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../utils/errorCodes.js';
import { config } from '../config.js';
import type { NoteAttachment } from '../types/index.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt', 'md', 'doc', 'docx', 'mp3', 'mp4',
]);

export const noteAttachmentService = {
  /** 保存上传文件 + 写入元数据 */
  save(noteId: number, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }): NoteAttachment {
    if (!noteRepo.getById(noteId)) {
      throw new AppError(ErrorCodes.NOTE_NOT_FOUND, '笔记不存在', 404);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(ErrorCodes.FILE_TOO_LARGE, '附件超过 10MB 上限', 400);
    }
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw new AppError(ErrorCodes.INVALID_FORMAT, `不支持的文件类型: .${ext}`, 400);
    }

    const uploadDir = path.resolve(config.uploadDir);
    fs.mkdirSync(uploadDir, { recursive: true });

    // 避免文件名冲突：时间戳_原文件名
    const safeName = `${Date.now()}_${file.originalname.replace(/[\\/:*?"<>|]/g, '_')}`;
    const fullPath = path.join(uploadDir, safeName);
    fs.writeFileSync(fullPath, file.buffer);

    const id = noteAttachmentRepo.insert({
      noteId,
      filename: file.originalname,
      fileType: ext, // 用规范化扩展名作为类型标记（pdf|image|doc|other 语义）
      fileSize: file.size,
      filepath: fullPath,
    });
    const att = noteAttachmentRepo.getById(id);
    if (!att) throw new AppError(ErrorCodes.INTERNAL_ERROR, '附件写入失败', 500);
    return att;
  },

  /** 列出笔记附件 */
  listByNote(noteId: number): NoteAttachment[] {
    if (!noteRepo.getById(noteId)) {
      throw new AppError(ErrorCodes.NOTE_NOT_FOUND, '笔记不存在', 404);
    }
    return noteAttachmentRepo.getByNote(noteId);
  },

  /** 读取文件（供下载控制器使用） */
  getFile(id: number): { buffer: Buffer; filename: string; fileType: string | null } {
    const att = noteAttachmentRepo.getById(id);
    if (!att) {
      throw new AppError(ErrorCodes.NOT_FOUND, '附件不存在', 404);
    }
    if (!fs.existsSync(att.filepath)) {
      throw new AppError(ErrorCodes.NOT_FOUND, '附件文件已丢失', 404);
    }
    return {
      buffer: fs.readFileSync(att.filepath),
      filename: att.filename,
      fileType: att.file_type,
    };
  },

  /** 删除附件（同时删磁盘文件） */
  remove(id: number): void {
    const att = noteAttachmentRepo.getById(id);
    if (!att) {
      throw new AppError(ErrorCodes.NOT_FOUND, '附件不存在', 404);
    }
    try {
      if (fs.existsSync(att.filepath)) fs.unlinkSync(att.filepath);
    } catch {
      // 磁盘文件删除失败不阻塞 DB 记录删除
    }
    noteAttachmentRepo.remove(id);
  },
};
