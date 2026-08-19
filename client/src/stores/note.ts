/**
 * useNoteStore — 笔记业务域（FRONTEND §5.2.3）
 *
 * state: notes/currentNote/folderTree/loading
 * actions: fetchNotes/fetchTodayNotes/fetchNote/saveNote/deleteNote/moveNoteToFolder/
 *          convertToCards/uploadAttachment/fetchFolderTree/createFolder/renameFolder/deleteFolder
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { notesApi, type CreateNoteDto, type UpdateNoteDto } from '@/api/notes';
import { foldersApi } from '@/api/folders';
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

  // ===== actions =====
  async function fetchNotes(folderId?: number | null): Promise<void> {
    loading.value = true;
    try {
      notes.value = await notesApi.list(folderId ?? null);
    } finally {
      loading.value = false;
    }
  }

  async function fetchTodayNotes(): Promise<void> {
    loading.value = true;
    try {
      notes.value = await notesApi.today();
    } finally {
      loading.value = false;
    }
  }

  async function fetchNote(id: number): Promise<void> {
    loading.value = true;
    try {
      currentNote.value = await notesApi.get(id);
    } finally {
      loading.value = false;
    }
  }

  async function saveNote(data: Partial<Note> & { id?: number }): Promise<number> {
    const isEdit = data.id !== undefined;
    const payload: CreateNoteDto = {
      title: data.title ?? '未命名笔记',
      folderId: data.folder_id ?? null,
      content: data.content ?? '',
    };
    if (data.is_today !== undefined) payload.isToday = data.is_today;
    if (data.tags !== undefined) payload.tags = data.tags;

    if (isEdit) {
      const update: UpdateNoteDto = {};
      if (data.title !== undefined) update.title = data.title;
      if (data.content !== undefined) update.content = data.content;
      if (data.folder_id !== undefined) update.folderId = data.folder_id;
      if (data.is_today !== undefined) update.isToday = data.is_today;
      if (data.tags !== undefined) update.tags = data.tags;
      await notesApi.update(data.id!, update);
      return data.id!;
    }
    const res = await notesApi.create(payload);
    return res.id;
  }

  async function deleteNote(id: number): Promise<void> {
    await notesApi.remove(id);
  }

  async function moveNoteToFolder(noteId: number, folderId: number | null): Promise<void> {
    await notesApi.update(noteId, { folderId });
  }

  async function convertToCards(noteId: number, deckId: number): Promise<number> {
    const result = await notesApi.convert(noteId, deckId);
    return result.cardCount;
  }

  async function fetchFolderTree(): Promise<void> {
    folderTree.value = await foldersApi.getTree();
  }

  async function createFolder(name: string, parentId?: number | null): Promise<number> {
    const res = await foldersApi.create({ name, parentId: parentId ?? null });
    await fetchFolderTree();
    return res.id;
  }

  async function renameFolder(id: number, name: string): Promise<void> {
    await foldersApi.rename(id, name);
    await fetchFolderTree();
  }

  async function deleteFolder(id: number): Promise<void> {
    await foldersApi.remove(id);
    await fetchFolderTree();
  }

  async function uploadAttachment(_noteId: number, _file: File): Promise<void> {
    // 附件上传走 FormData，M1 暂未实现 UI 接入
    throw new Error('M1: 附件上传 UI 未接入');
  }

  return {
    notes,
    currentNote,
    folderTree,
    loading,
    todayNotes,
    noteCountByFolder,
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
