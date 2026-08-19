<script setup lang="ts">
// TodayNotes.vue — 今日笔记页（FRONTEND §3.2.6 + §4.1 路由 /notes/today）

import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNoteStore } from '@/stores/note';
import { useUIStore } from '@/stores/ui';
import NoteCard from '@/components/note/NoteCard.vue';

const router = useRouter();
const noteStore = useNoteStore();
const uiStore = useUIStore();

onMounted(async () => {
  await noteStore.fetchTodayNotes();
});

async function onDelete(id: number) {
  if (!confirm('确认删除该笔记？')) return;
  try {
    await noteStore.deleteNote(id);
    await noteStore.fetchTodayNotes();
    uiStore.showToast('已删除', 'success');
  } catch (err) {
    uiStore.showToast('删除失败：' + (err as Error).message, 'error');
  }
}

function onClick(note: any) {
  router.push(`/notes/${note.id}`);
}

function onCreate() {
  router.push({ name: 'note-editor', query: { today: '1' } });
}

const todayLabel = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
</script>

<template>
  <div class="today-notes">
    <header class="today-notes__header">
      <div>
        <h2 class="today-notes__title">今日笔记</h2>
        <p class="today-notes__date">{{ todayLabel }}</p>
      </div>
      <button class="today-notes__create" @click="onCreate">+ 写笔记</button>
    </header>
    <div v-if="noteStore.loading" class="today-notes__loading">加载中…</div>
    <div v-else-if="noteStore.notes.length === 0" class="today-notes__empty">
      <p>今天还没有笔记</p>
      <button @click="onCreate">开始记录</button>
    </div>
    <div v-else class="today-notes__grid">
      <NoteCard
        v-for="note in noteStore.notes"
        :key="note.id"
        :note="note"
        @click="onClick(note)"
        @delete="onDelete"
      />
    </div>
  </div>
</template>

<style scoped>
.today-notes { padding: 16px 24px; height: 100%; overflow-y: auto; }
.today-notes__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.today-notes__title { font-size: var(--font-size-2xl); font-weight: 600; margin: 0 0 4px; }
.today-notes__date { color: var(--text-secondary); font-size: var(--font-size-base); margin: 0; }
.today-notes__create { padding: 8px 16px; background-color: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--font-size-base); }
.today-notes__create:hover { opacity: 0.9; }
.today-notes__loading, .today-notes__empty { padding: 48px; text-align: center; color: var(--text-tertiary); }
.today-notes__empty button { margin-top: 12px; padding: 6px 16px; background-color: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; }
.today-notes__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
</style>
