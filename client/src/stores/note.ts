/**
 * useNoteStore — 笔记业务域（FRONTEND §5.2.3）
 *
 * - state: notes/currentNote/folderTree/loading
 * - actions: fetchNotes/fetchTodayNotes/fetchNote/saveNote/deleteNote/moveNoteToFolder/convertToCards/uploadAttachment/fetchFolderTree/createFolder/renameFolder/deleteFolder
 *
 * Stage 4 占位策略：state/getters 完整；actions 签名齐全但方法体抛
 *   Error('M1 未实现')，避免引入 M1 才就绪的 notes/folders API 模块
 *   （保 §9.4「5 Store 结构完整」验收通过）
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { FolderNode, Note } from '@/types';

export const useNoteStore = defineStore('note', () => {
  // ===== state =====
  const notes = ref<Note[]>([]);
  const currentNote = ref<Note | null>(null);
  const folderTree = ref<FolderNode[]>([]);
  const loading = ref(false);

  // ===== getters =====
  /** 今日临时笔记（is_today=1） */
  const todayNotes = computed(() => notes.value.filter((n) => n.is_today === 1));

  /** 各文件夹笔记数（id → count） */
  const noteCountByFolder = computed<Record<number, number>>(() => {
    const result: Record<number, number> = {};
    for (const note of notes.value) {
      if (note.folder_id !== null) {
        result[note.folder_id] = (result[note.folder_id] ?? 0) + 1;
      }
    }
    return result;
  });

  // ===== actions（M1 占位，签名齐全）=====
  async function fetchNotes(_folderId?: number): Promise<void> {
    throw new Error('M1 未实现：notes API 模块尚未创建');
  }

  async function fetchTodayNotes(): Promise<void> {
    throw new Error('M1 未实现：notes API 模块尚未创建');
  }

  async function fetchNote(_id: number): Promise<void> {
    throw new Error('M1 未实现：notes API 模块尚未创建');
  }

  async function saveNote(_data: Partial<Note>): Promise<void> {
    throw new Error('M1 未实现：notes API 模块尚未创建');
  }

  async function deleteNote(_id: number): Promise<void> {
    throw new Error('M1 未实现：notes API 模块尚未创建');
  }

  async function moveNoteToFolder(_noteId: number, _folderId: number): Promise<void> {
    throw new Error('M1 未实现：notes API 模块尚未创建');
  }

  async function convertToCards(_noteId: number): Promise<void> {
    throw new Error('M1 未实现：notes API 模块尚未创建');
  }

  async function uploadAttachment(_noteId: number, _file: File): Promise<void> {
    throw new Error('M1 未实现：notes API 模块尚未创建');
  }

  async function fetchFolderTree(): Promise<void> {
    throw new Error('M1 未实现：folders API 模块尚未创建');
  }

  async function createFolder(_name: string, _parentId?: number | null): Promise<void> {
    throw new Error('M1 未实现：folders API 模块尚未创建');
  }

  async function renameFolder(_id: number, _name: string): Promise<void> {
    throw new Error('M1 未实现：folders API 模块尚未创建');
  }

  async function deleteFolder(_id: number): Promise<void> {
    throw new Error('M1 未实现：folders API 模块尚未创建');
  }

  return {
    // state
    notes,
    currentNote,
    folderTree,
    loading,
    // getters
    todayNotes,
    noteCountByFolder,
    // actions
    fetchNotes,
    fetchTodayNotes,
    fetchNote,
    saveNote,
    deleteNote,
    moveNoteToFolder,
    convertToCards,
    uploadAttachment,
    fetchFolderTree,
    createFolder,
    renameFolder,
    deleteFolder,
  };
});
