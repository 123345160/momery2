<script setup lang="ts">
// NotesList.vue — 笔记列表页（FRONTEND §3.2.6 + §4.1 路由 /notes）

import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useNoteStore } from '@/stores/note';
import { useUIStore } from '@/stores/ui';
import FolderTree from '@/components/note/FolderTree.vue';
import NoteCard from '@/components/note/NoteCard.vue';

const router = useRouter();
const noteStore = useNoteStore();
const uiStore = useUIStore();

const selectedFolder = ref<number | null>(null);

const folderName = computed(() => {
  if (selectedFolder.value === null) return null;
  return findName(noteStore.folderTree, selectedFolder.value);
});

function findName(nodes: any[], id: number): string | null {
  for (const n of nodes) {
    if (n.id === id) return n.name;
    const c = findName(n.children ?? [], id);
    if (c) return c;
  }
  return null;
}

onMounted(async () => {
  await Promise.all([noteStore.fetchFolderTree(), noteStore.fetchNotes(null)]);
});

async function onSelectFolder(id: number | null) {
  selectedFolder.value = id;
  await noteStore.fetchNotes(id);
}

async function onCreateFolder(name: string, parentId: number | null) {
  try {
    await noteStore.createFolder(name, parentId);
    uiStore.showToast('文件夹已创建', 'success');
  } catch (err) {
    uiStore.showToast('创建失败：' + (err as Error).message, 'error');
  }
}

async function onDeleteFolder(id: number) {
  if (!confirm('确认删除文件夹？（仅空文件夹可删）')) return;
  try {
    await noteStore.deleteFolder(id);
    if (selectedFolder.value === id) selectedFolder.value = null;
    await noteStore.fetchNotes(selectedFolder.value);
    uiStore.showToast('文件夹已删除', 'success');
  } catch (err) {
    uiStore.showToast('删除失败：' + (err as Error).message, 'error');
  }
}

async function onDeleteNote(id: number) {
  if (!confirm('确认删除该笔记？')) return;
  try {
    await noteStore.deleteNote(id);
    await noteStore.fetchNotes(selectedFolder.value);
    uiStore.showToast('笔记已删除', 'success');
  } catch (err) {
    uiStore.showToast('删除失败：' + (err as Error).message, 'error');
  }
}

function onNoteClick(note: any) {
  router.push(`/notes/${note.id}`);
}

function onCreateNote() {
  router.push({ name: 'note-editor', query: { folderId: String(selectedFolder.value ?? '') } });
}
</script>

<template>
  <div class="notes-list">
    <FolderTree
      :tree="noteStore.folderTree"
      :selected-folder="selectedFolder"
      :loading="noteStore.loading"
      @folder-select="onSelectFolder"
      @folder-create="onCreateFolder"
      @folder-delete="onDeleteFolder"
    />
    <main class="notes-list__main">
      <header class="notes-list__header">
        <h2 class="notes-list__title">
          {{ folderName ? `📁 ${folderName}` : '全部笔记' }}
          <span class="notes-list__count">（{{ noteStore.notes.length }}）</span>
        </h2>
        <button class="notes-list__create" @click="onCreateNote">+ 新建笔记</button>
      </header>
      <div v-if="noteStore.loading" class="notes-list__loading">加载中…</div>
      <div v-else-if="noteStore.notes.length === 0" class="notes-list__empty">
        <p>暂无笔记</p>
        <button @click="onCreateNote">写下第一篇</button>
      </div>
      <div v-else class="notes-list__grid">
        <NoteCard
          v-for="note in noteStore.notes"
          :key="note.id"
          :note="note"
          @click="onNoteClick(note)"
          @delete="onDeleteNote"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.notes-list { display: flex; height: 100%; min-height: 0; }
.notes-list__main { flex: 1; min-width: 0; padding: 16px 24px; overflow-y: auto; }
.notes-list__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.notes-list__title { font-size: var(--font-size-xl); font-weight: 600; margin: 0; }
.notes-list__count { font-size: var(--font-size-base); color: var(--text-tertiary); font-weight: 400; }
.notes-list__create {
  padding: 6px 14px; background-color: var(--primary); color: #fff;
  border: none; border-radius: var(--radius-sm); cursor: pointer;
  font-size: var(--font-size-base);
}
.notes-list__create:hover { opacity: 0.9; }
.notes-list__loading, .notes-list__empty { padding: 48px; text-align: center; color: var(--text-tertiary); }
.notes-list__empty button {
  margin-top: 12px; padding: 6px 16px; background-color: var(--primary);
  color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer;
}
.notes-list__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
</style>
