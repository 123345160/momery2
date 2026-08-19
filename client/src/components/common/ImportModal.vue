<script setup lang="ts">
// ImportModal.vue — JSON 导入弹窗（FRONTEND §3.2.7）
// State: file, preview, loading；Events: @import(data)
// 流程：选择 .json 文件 → 前端解析预览（牌组/卡片计数）→ 确认后 @import 抛出解析结果
// 实际导入请求（POST /api/import/json）与结果反馈由父组件负责

import { ref, watch } from 'vue';
import Modal from '@/components/common/Modal.vue';
import type { ImportJsonDto } from '@/types';

/** 解析预览（组件内部 State 类型，FRONTEND §8.4 组件内定义） */
interface ImportPreview {
  deckCount: number;
  cardCount: number;
}

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  import: [data: ImportJsonDto];
}>();

const file = ref<File | null>(null);
const preview = ref<ImportPreview | null>(null);
const loading = ref(false);
const parseError = ref('');

// 弹窗打开时重置上一次的状态
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      file.value = null;
      preview.value = null;
      loading.value = false;
      parseError.value = '';
    }
  }
);

function onFileChange(e: Event): void {
  const input = e.target as HTMLInputElement;
  parseError.value = '';
  preview.value = null;
  file.value = input.files?.[0] ?? null;

  if (!file.value) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result)) as ImportJsonDto;
      const decks = Array.isArray(data.decks) ? data.decks : [];
      let cardCount = 0;
      for (const d of decks) {
        if (d && typeof d === 'object' && Array.isArray((d as { cards?: unknown }).cards)) {
          cardCount += ((d as { cards: unknown[] }).cards).length;
        }
      }
      preview.value = { deckCount: decks.length, cardCount };
    } catch {
      parseError.value = '文件不是合法的 JSON，请检查后重选';
      file.value = null;
    }
  };
  reader.readAsText(file.value);
}

function onImport(): void {
  if (!file.value || !preview.value || loading.value) return;
  loading.value = true;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result)) as ImportJsonDto;
      emit('import', data);
    } catch {
      parseError.value = '文件解析失败，请重试';
    } finally {
      loading.value = false;
    }
  };
  reader.readAsText(file.value);
}
</script>

<template>
  <Modal :visible="visible" title="导入 JSON" width="440px" @close="emit('close')">
    <div class="import-modal">
      <label class="import-modal__file-label">选择导出的 JSON 文件</label>
      <input
        class="import-modal__file"
        type="file"
        accept=".json,application/json"
        @change="onFileChange"
      />

      <p v-if="parseError" class="import-modal__error">{{ parseError }}</p>

      <div v-if="preview" class="import-modal__preview">
        <p class="import-modal__preview-title">文件预览</p>
        <p class="import-modal__preview-line">牌组 {{ preview.deckCount }} 个</p>
        <p class="import-modal__preview-line">卡片 {{ preview.cardCount }} 张</p>
        <p class="import-modal__hint">
          同名牌组将合并追加卡片（不覆盖已有内容），导入在事务中完成
        </p>
      </div>
    </div>

    <template #footer>
      <button class="import-modal__btn import-modal__btn--default" @click="emit('close')">
        取消
      </button>
      <button
        class="import-modal__btn import-modal__btn--primary"
        :disabled="!preview || loading"
        @click="onImport"
      >
        {{ loading ? '导入中…' : '开始导入' }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.import-modal__file-label {
  display: block;
  font-size: var(--font-size-base);
  color: var(--text-primary);
  margin-bottom: 8px;
}

.import-modal__file {
  display: block;
  width: 100%;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.import-modal__error {
  margin: 12px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-forgot);
}

.import-modal__preview {
  margin-top: 16px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

.import-modal__preview-title {
  margin: 0 0 8px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.import-modal__preview-line {
  margin: 0 0 4px;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.import-modal__hint {
  margin: 8px 0 0;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  line-height: 1.5;
}

.import-modal__btn {
  padding: 6px 16px;
  font-size: var(--font-size-base);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.import-modal__btn--default {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.import-modal__btn--default:hover {
  background-color: var(--bg-hover);
}

.import-modal__btn--primary {
  background-color: var(--accent);
  color: var(--bg-primary);
  border: 1px solid var(--accent);
}

.import-modal__btn--primary:hover:not(:disabled) {
  background-color: var(--accent-hover);
}

.import-modal__btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
