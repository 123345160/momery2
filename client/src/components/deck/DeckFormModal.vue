<script setup lang="ts">
// DeckFormModal.vue — 创建/编辑牌组弹窗（FRONTEND §3.2.2）
// Props: visible, editDeck?
// State: name, description, icon, color
// Events: @submit(data), @cancel
// 复用 Modal 组件

import { ref, watch, computed } from 'vue';
import Modal from '@/components/common/Modal.vue';
import type { Deck, CreateDeckDto, UpdateDeckDto } from '@/types';

const props = defineProps<{
  visible: boolean;
  editDeck?: Deck | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [data: CreateDeckDto | UpdateDeckDto];
}>();

const name = ref('');
const description = ref('');
const icon = ref('📦');
const color = ref('#4a90d9');

const isEdit = computed<boolean>(() => !!props.editDeck);

// visible 切换为 true 时回填表单（编辑态）
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      if (props.editDeck) {
        name.value = props.editDeck.name;
        description.value = props.editDeck.description ?? '';
        icon.value = props.editDeck.icon || '📦';
        color.value = props.editDeck.color || '#4a90d9';
      } else {
        name.value = '';
        description.value = '';
        icon.value = '📦';
        color.value = '#4a90d9';
      }
    }
  },
  { immediate: true }
);

function onSubmit(): void {
  if (!name.value.trim()) {
    window.alert('牌组名称不能为空');
    return;
  }
  const data: CreateDeckDto = {
    name: name.value.trim(),
    description: description.value.trim(),
    icon: icon.value,
    color: color.value,
  };
  emit('submit', data);
}

function onCancel(): void {
  emit('close');
}
</script>

<template>
  <Modal
    :visible="visible"
    :title="isEdit ? '编辑牌组' : '新建牌组'"
    width="480px"
    @close="onCancel"
  >
    <div class="deck-form">
      <div class="deck-form__field">
        <label class="deck-form__label">名称 *</label>
        <input
          v-model="name"
          class="deck-form__input"
          type="text"
          placeholder="输入牌组名称"
          maxlength="50"
        />
      </div>

      <div class="deck-form__field">
        <label class="deck-form__label">描述</label>
        <textarea
          v-model="description"
          class="deck-form__textarea"
          placeholder="可选：简要描述牌组用途"
          rows="3"
          maxlength="200"
        />
      </div>

      <div class="deck-form__row">
        <div class="deck-form__field">
          <label class="deck-form__label">图标</label>
          <input
            v-model="icon"
            class="deck-form__input"
            type="text"
            placeholder="emoji 或字符"
            maxlength="4"
          />
        </div>

        <div class="deck-form__field">
          <label class="deck-form__label">主题色</label>
          <input
            v-model="color"
            class="deck-form__input"
            type="color"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <button class="deck-form__btn deck-form__btn--default" @click="onCancel">
        取消
      </button>
      <button class="deck-form__btn deck-form__btn--primary" @click="onSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.deck-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.deck-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.deck-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.deck-form__label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

.deck-form__input,
.deck-form__textarea {
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  font-family: inherit;
}

.deck-form__input:focus,
.deck-form__textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.deck-form__textarea {
  resize: vertical;
  min-height: 60px;
}

.deck-form__btn {
  padding: 6px 16px;
  font-size: var(--font-size-base);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.deck-form__btn--default {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.deck-form__btn--default:hover {
  background-color: var(--bg-hover);
}

.deck-form__btn--primary {
  background-color: var(--accent);
  color: var(--bg-primary);
  border: 1px solid var(--accent);
}

.deck-form__btn--primary:hover {
  background-color: var(--accent-hover);
  border-color: var(--accent-hover);
}
</style>
