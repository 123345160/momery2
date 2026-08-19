<script setup lang="ts">
// CardCreateForm.vue — 卡片创建/编辑表单（FRONTEND §3.2.3）
// Props: visible, editCard?
// State: front, back, previewMode ('edit' | 'preview' | 'split')
// Events: @submit(data), @cancel
// 子组件: MarkdownPreview（split/preview 模式实时预览 back）
//
// V1.0 决策点 1：不支持模板选择（templates API 属 M1）
// V1.0 决策点 5：默认 split 模式（左编辑右预览）

import { ref, watch, computed } from 'vue';
import Modal from '@/components/common/Modal.vue';
import MarkdownPreview from '@/components/common/MarkdownPreview.vue';
import type { Card, CreateCardDto, UpdateCardDto } from '@/types';

const props = defineProps<{
  visible: boolean;
  editCard?: Card | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [data: CreateCardDto | UpdateCardDto];
}>();

const front = ref('');
const back = ref('');
const previewMode = ref<'edit' | 'preview' | 'split'>('split');

const isEdit = computed<boolean>(() => !!props.editCard);

// visible 切换为 true 时回填表单（编辑态）
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      if (props.editCard) {
        front.value = props.editCard.front;
        back.value = props.editCard.back;
      } else {
        front.value = '';
        back.value = '';
      }
      previewMode.value = 'split';
    }
  },
  { immediate: true }
);

function onSubmit(): void {
  if (!front.value.trim()) {
    window.alert('卡片正面不能为空');
    return;
  }
  if (!back.value.trim()) {
    window.alert('卡片背面不能为空');
    return;
  }
  const data: CreateCardDto = {
    front: front.value,
    back: back.value,
  };
  emit('submit', data);
}

function onCancel(): void {
  emit('close');
}

function setMode(mode: 'edit' | 'preview' | 'split'): void {
  previewMode.value = mode;
}
</script>

<template>
  <Modal
    :visible="visible"
    :title="isEdit ? '编辑卡片' : '新建卡片'"
    width="720px"
    @close="onCancel"
  >
    <div class="card-form">
      <!-- 正面 -->
      <div class="card-form__field">
        <label class="card-form__label">正面（问题）*</label>
        <textarea
          v-model="front"
          class="card-form__textarea"
          placeholder="支持 Markdown：例如 **重点** 或 `code`"
          rows="3"
        />
      </div>

      <!-- 模式切换 -->
      <div class="card-form__mode">
        <button
          class="card-form__mode-btn"
          :class="{ 'card-form__mode-btn--active': previewMode === 'edit' }"
          @click="setMode('edit')"
        >
          编辑
        </button>
        <button
          class="card-form__mode-btn"
          :class="{ 'card-form__mode-btn--active': previewMode === 'split' }"
          @click="setMode('split')"
        >
          分屏
        </button>
        <button
          class="card-form__mode-btn"
          :class="{ 'card-form__mode-btn--active': previewMode === 'preview' }"
          @click="setMode('preview')"
        >
          预览
        </button>
      </div>

      <!-- 背面：编辑/预览/分屏 -->
      <div class="card-form__field">
        <label class="card-form__label">背面（答案）*</label>
        <div
          class="card-form__back"
          :class="`card-form__back--${previewMode}`"
        >
          <textarea
            v-if="previewMode !== 'preview'"
            v-model="back"
            class="card-form__textarea card-form__back-edit"
            placeholder="支持 Markdown：例如 ## 标题 或 - 列表"
            rows="8"
          />
          <div
            v-if="previewMode !== 'edit'"
            class="card-form__back-preview"
          >
            <MarkdownPreview :content="back" />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="card-form__btn card-form__btn--default" @click="onCancel">
        取消
      </button>
      <button class="card-form__btn card-form__btn--primary" @click="onSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.card-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-form__label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

.card-form__textarea {
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
}

.card-form__textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.card-form__mode {
  display: flex;
  gap: 4px;
  align-self: flex-start;
  background-color: var(--bg-secondary);
  padding: 2px;
  border-radius: var(--radius-sm);
}

.card-form__mode-btn {
  padding: 4px 10px;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.card-form__mode-btn:hover {
  color: var(--text-primary);
}

.card-form__mode-btn--active {
  background-color: var(--bg-primary);
  color: var(--accent);
  font-weight: 500;
  box-shadow: var(--shadow-sm);
}

.card-form__back {
  display: grid;
  gap: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px;
  background-color: var(--bg-primary);
}

.card-form__back--edit {
  grid-template-columns: 1fr;
}

.card-form__back--preview {
  grid-template-columns: 1fr;
}

.card-form__back--split {
  grid-template-columns: 1fr 1fr;
}

.card-form__back-edit {
  border: none;
  padding: 0;
  min-height: 200px;
  background-color: transparent;
}

.card-form__back-preview {
  min-height: 200px;
  padding: 8px;
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
}

.card-form__btn {
  padding: 6px 16px;
  font-size: var(--font-size-base);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.card-form__btn--default {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.card-form__btn--default:hover {
  background-color: var(--bg-hover);
}

.card-form__btn--primary {
  background-color: var(--accent);
  color: var(--bg-primary);
  border: 1px solid var(--accent);
}

.card-form__btn--primary:hover {
  background-color: var(--accent-hover);
  border-color: var(--accent-hover);
}
</style>
