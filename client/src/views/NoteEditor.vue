<script setup lang="ts">
// NoteEditor.vue — 笔记编辑器（FRONTEND §3.2.6 + §4.1 路由 /notes/:id）
// M1 用 textarea 简化（规范 TiptapEditor M2 接入）

import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNoteStore } from '@/stores/note';
import { useDeckStore } from '@/stores/deck';
import { useUIStore } from '@/stores/ui';
import { notesApi } from '@/api/notes';
import Modal from '@/components/common/Modal.vue';

const route = useRoute();
const router = useRouter();
const noteStore = useNoteStore();
const deckStore = useDeckStore();
const uiStore = useUIStore();

const title = ref('');
const content = ref('');
const isToday = ref(0);
const tags = ref('[]');
const noteId = ref<number | null>(null);
const saving = ref(false);
const convertModalVisible = ref(false);
const targetDeckId = ref<number | null>(null);
const converting = ref(false);
const convertPreview = ref<{ front: string; back: string }[]>([]);

onMounted(async () => {
  const id = route.params.id;
  if (id && id !== 'new') {
    noteId.value = Number(id);
    await noteStore.fetchNote(noteId.value);
    if (noteStore.currentNote) {
      title.value = noteStore.currentNote.title;
      content.value = noteStore.currentNote.content;
      isToday.value = noteStore.currentNote.is_today;
      tags.value = noteStore.currentNote.tags;
    }
  }
  await deckStore.fetchDecks();
});

async function onSave() {
  if (!title.value.trim()) {
    uiStore.showToast('标题不能为空', 'warning');
    return;
  }
  saving.value = true;
  try {
    const data: any = {
      title: title.value,
      content: content.value,
      is_today: isToday.value,
      tags: tags.value,
    };
    if (noteId.value) data.id = noteId.value;
    const id = await noteStore.saveNote(data);
    noteId.value = id;
    uiStore.showToast('保存成功', 'success');
  } catch (err) {
    uiStore.showToast('保存失败：' + (err as Error).message, 'error');
  } finally {
    saving.value = false;
  }
}

async function onPreviewConvert() {
  if (!noteId.value) {
    uiStore.showToast('请先保存笔记', 'warning');
    return;
  }
  try {
    const res = await notesApi.extract(noteId.value);
    convertPreview.value = res.cards;
    convertModalVisible.value = true;
  } catch (err) {
    uiStore.showToast('提取失败：' + (err as Error).message, 'error');
  }
}

async function onConfirmConvert() {
  if (!noteId.value || !targetDeckId.value) {
    uiStore.showToast('请选择目标牌组', 'warning');
    return;
  }
  converting.value = true;
  try {
    const count = await noteStore.convertToCards(noteId.value, targetDeckId.value);
    convertModalVisible.value = false;
    uiStore.showToast(`成功提取 ${count} 张卡片`, 'success');
  } catch (err) {
    uiStore.showToast('转换失败：' + (err as Error).message, 'error');
  } finally {
    converting.value = false;
  }
}
</script>

<template>
  <div class="note-editor">
    <header class="note-editor__header">
      <button class="note-editor__back" @click="router.back()">← 返回</button>
      <input v-model="title" class="note-editor__title" placeholder="笔记标题" :maxlength="200" />
      <label class="note-editor__today">
        <input type="checkbox" :checked="isToday === 1" @change="isToday = ($event.target as HTMLInputElement).checked ? 1 : 0" />
        今日笔记
      </label>
      <button class="note-editor__save" :disabled="saving" @click="onSave">
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </header>

    <textarea
      v-model="content"
      class="note-editor__content"
      placeholder="支持 Q:/A: 或 问：/答： 格式生成卡片"
      :maxlength="50000"
    />

    <footer class="note-editor__footer">
      <button class="note-editor__convert" @click="onPreviewConvert">提取为卡片</button>
    </footer>

    <Modal :visible="convertModalVisible" title="提取为卡片" @close="convertModalVisible = false">
      <div class="convert-modal">
        <label class="convert-modal__label">
          目标牌组：
          <select v-model="targetDeckId">
            <option :value="null">请选择…</option>
            <option v-for="d in deckStore.decks" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </label>
        <p class="convert-modal__count">将提取 {{ convertPreview.length }} 张卡片</p>
        <ul class="convert-modal__preview">
          <li v-for="(c, i) in convertPreview.slice(0, 5)" :key="i">
            <strong>Q:</strong> {{ c.front }} <br />
            <strong>A:</strong> {{ c.back }}
          </li>
          <li v-if="convertPreview.length > 5">…等 {{ convertPreview.length }} 张</li>
        </ul>
      </div>
      <template #footer>
        <button @click="convertModalVisible = false">取消</button>
        <button class="primary" :disabled="converting || !targetDeckId" @click="onConfirmConvert">
          {{ converting ? '转换中…' : '确认提取' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.note-editor { display: flex; flex-direction: column; height: 100%; padding: 16px 24px; }
.note-editor__header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.note-editor__back { background: none; border: none; cursor: pointer; color: var(--text-secondary); font-size: var(--font-size-base); }
.note-editor__title { flex: 1; font-size: var(--font-size-xl); font-weight: 600; border: none; border-bottom: 1px solid var(--border-color); padding: 4px 0; outline: none; background: transparent; }
.note-editor__title:focus { border-bottom-color: var(--primary); }
.note-editor__today { font-size: var(--font-size-sm); color: var(--text-secondary); display: flex; align-items: center; gap: 4px; cursor: pointer; }
.note-editor__save { padding: 6px 16px; background-color: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--font-size-base); }
.note-editor__save:hover { opacity: 0.9; }
.note-editor__save:disabled { opacity: 0.5; cursor: not-allowed; }
.note-editor__content { flex: 1; width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; font-size: var(--font-size-base); font-family: var(--font-mono); resize: none; outline: none; line-height: 1.6; }
.note-editor__content:focus { border-color: var(--primary); }
.note-editor__footer { display: flex; justify-content: flex-end; padding: 12px 0; }
.note-editor__convert { padding: 6px 14px; background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; color: var(--text-secondary); font-size: var(--font-size-base); }
.note-editor__convert:hover { background-color: var(--bg-hover); }
.convert-modal__label { display: block; margin-bottom: 12px; }
.convert-modal__count { color: var(--text-secondary); font-size: var(--font-size-sm); margin: 8px 0; }
.convert-modal__preview { list-style: none; padding: 0; margin: 0; max-height: 200px; overflow-y: auto; }
.convert-modal__preview li { padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: var(--font-size-sm); }
</style>
