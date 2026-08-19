<script setup lang="ts">
// ExportModal.vue — 导出选择弹窗（FRONTEND §3.2.7）
// Props: decks: Deck[]；Events: @export(deckId: number | 'all')
// 选择单个牌组或全量导出，实际下载请求由父组件负责

import { ref, watch } from 'vue';
import Modal from '@/components/common/Modal.vue';
import type { Deck } from '@/types';

const props = defineProps<{
  visible: boolean;
  decks: Deck[];
}>();

const emit = defineEmits<{
  close: [];
  export: [deckId: number | 'all'];
}>();

// 选中项：'all' 或牌组 id
const selected = ref<number | 'all'>('all');

// 弹窗打开时重置选择
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      selected.value = 'all';
    }
  }
);

function onConfirm(): void {
  emit('export', selected.value);
}
</script>

<template>
  <Modal :visible="visible" title="导出 JSON" width="440px" @close="emit('close')">
    <div class="export-modal">
      <label class="export-modal__option">
        <input v-model="selected" type="radio" value="all" />
        <span class="export-modal__option-label">全部数据（所有牌组 + 复习记录）</span>
      </label>

      <label v-for="deck in decks" :key="deck.id" class="export-modal__option">
        <input v-model="selected" type="radio" :value="deck.id" />
        <span class="export-modal__option-label">{{ deck.name }}</span>
      </label>

      <p v-if="decks.length === 0" class="export-modal__empty">暂无牌组可导出</p>

      <p class="export-modal__hint">
        导出内容包含卡片与 SM-2 复习进度，可随时重新导入恢复
      </p>
    </div>

    <template #footer>
      <button class="export-modal__btn export-modal__btn--default" @click="emit('close')">
        取消
      </button>
      <button
        class="export-modal__btn export-modal__btn--primary"
        :disabled="decks.length === 0"
        @click="onConfirm"
      >
        导出
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.export-modal__option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.export-modal__option:hover {
  background-color: var(--bg-hover);
}

.export-modal__option-label {
  font-size: var(--font-size-base);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.export-modal__empty {
  margin: 8px 0 0;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.export-modal__hint {
  margin: 12px 0 0;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  line-height: 1.5;
}

.export-modal__btn {
  padding: 6px 16px;
  font-size: var(--font-size-base);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.export-modal__btn--default {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.export-modal__btn--default:hover {
  background-color: var(--bg-hover);
}

.export-modal__btn--primary {
  background-color: var(--accent);
  color: var(--bg-primary);
  border: 1px solid var(--accent);
}

.export-modal__btn--primary:hover:not(:disabled) {
  background-color: var(--accent-hover);
}

.export-modal__btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
