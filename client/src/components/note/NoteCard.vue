<script setup lang="ts">
// NoteCard.vue — 笔记卡片（FRONTEND §3.2.6）
// Props: note, folderName；Events: click/move-to-folder/delete

import { computed } from 'vue';
import type { Note } from '@/types';

const props = defineProps<{
  note: Note;
  folderName?: string;
}>();

const emit = defineEmits<{
  click: [note: Note];
  'move-to-folder': [noteId: number, folderId: number];
  delete: [id: number];
}>();

const snippet = computed(() => {
  const c = props.note.content ?? '';
  return c.length > 80 ? c.slice(0, 80) + '…' : c;
});

const updatedLabel = computed(() => {
  const d = new Date(props.note.updated_at);
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
});
</script>

<template>
  <article class="note-card" @click="emit('click', note)">
    <header class="note-card__head">
      <h3 class="note-card__title" :title="note.title">{{ note.title }}</h3>
      <span v-if="folderName" class="note-card__folder">📁 {{ folderName }}</span>
    </header>
    <p class="note-card__snippet">{{ snippet }}</p>
    <footer class="note-card__foot">
      <span class="note-card__date">{{ updatedLabel }}</span>
      <button
        class="note-card__del"
        @click.stop="emit('delete', note.id)"
        title="删除笔记"
      >删除</button>
    </footer>
  </article>
</template>

<style scoped>
.note-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.note-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.note-card__head {
  display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
  margin-bottom: 6px;
}
.note-card__title {
  font-size: var(--font-size-lg); font-weight: 600; margin: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.note-card__folder { font-size: var(--font-size-sm); color: var(--text-secondary); flex-shrink: 0; }
.note-card__snippet {
  font-size: var(--font-size-base); color: var(--text-secondary);
  margin: 0 0 8px; line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.note-card__foot {
  display: flex; justify-content: space-between; align-items: center;
}
.note-card__date { font-size: var(--font-size-sm); color: var(--text-tertiary); }
.note-card__del {
  background: none; border: none; color: var(--text-tertiary);
  cursor: pointer; font-size: var(--font-size-sm);
}
.note-card__del:hover { color: var(--danger); }
</style>
