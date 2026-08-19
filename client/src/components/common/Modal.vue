<script setup lang="ts">
// Modal.vue — 通用弹窗组件（FRONTEND §3.2.7）
// Props: visible, title, width, closable
// Slots: #default (内容), #footer (底部按钮)
// Events: @close
// 支持 ESC 关闭 + 遮罩点击关闭

import { watch, onMounted, onUnmounted } from 'vue';

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title?: string;
    width?: string;
    closable?: boolean;
  }>(),
  {
    title: '',
    width: '480px',
    closable: true,
  }
);

const emit = defineEmits<{
  close: [];
}>();

function close(): void {
  if (props.closable) {
    emit('close');
  }
}

function onEsc(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.visible) {
    close();
  }
}

// 弹窗打开时绑定 ESC，关闭时解绑
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      document.addEventListener('keydown', onEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    }
  }
);

onMounted(() => {
  if (props.visible) {
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', onEsc);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal" @click.self="close">
      <div class="modal__dialog" :style="{ width: width }">
        <header class="modal__header">
          <h3 class="modal__title">{{ title }}</h3>
          <button
            v-if="closable"
            class="modal__close"
            aria-label="关闭"
            @click="close"
          >
            ×
          </button>
        </header>
        <div class="modal__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="modal__footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background-color: var(--overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal__dialog {
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal__title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal__close {
  font-size: var(--font-size-xl);
  color: var(--text-muted);
  background: none;
  border: none;
  padding: 0 4px;
  line-height: 1;
  cursor: pointer;
}

.modal__close:hover {
  color: var(--text-primary);
}

.modal__body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal__footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
