<script setup lang="ts">
// CreateButton.vue — 顶部栏新建按钮（下拉菜单，FRONTEND §3.2.1）
// Props: menuItems: MenuItem[]
// Events: @create(type: 'deck' | 'note' | 'folder')

import { ref, onMounted, onUnmounted } from 'vue';
import type { MenuItem } from '@/types';

defineProps<{
  menuItems: MenuItem[];
}>();

const emit = defineEmits<{
  create: [type: MenuItem['type']];
}>();

const open = ref(false);

function toggle(): void {
  open.value = !open.value;
}

function close(): void {
  open.value = false;
}

function onClickOutside(event: MouseEvent): void {
  if (!(event.target as HTMLElement).closest('.create-button')) {
    close();
  }
}

onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));

function onCreate(item: MenuItem): void {
  emit('create', item.type);
  close();
}
</script>

<template>
  <div class="create-button">
    <button class="create-button__trigger" @click="toggle">+ 新建</button>
    <ul v-if="open" class="create-button__menu">
      <li
        v-for="item in menuItems"
        :key="item.type"
        class="create-button__menu-item"
        @click="onCreate(item)"
      >
        {{ item.label }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.create-button {
  position: relative;
  display: inline-block;
}

.create-button__trigger {
  padding: 6px 12px;
  font-size: var(--font-size-base);
  color: var(--bg-primary);
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  transition: background-color 0.15s ease;
}

.create-button__trigger:hover {
  background-color: var(--accent-hover);
}

.create-button__menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 120px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  z-index: 20;
}

.create-button__menu-item {
  padding: 8px 12px;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.create-button__menu-item:hover {
  background-color: var(--bg-hover);
}

.create-button__menu-item:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}
</style>
