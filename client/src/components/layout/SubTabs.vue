<script setup lang="ts">
// SubTabs.vue — 顶部栏子标签切换（FRONTEND §3.2.1）
// Props: tabs: TabItem[], activeTab: string
// Events: @select(key: string)

import type { TabItem } from '@/types';
import { useRouter } from 'vue-router';

defineProps<{
  tabs: TabItem[];
  activeTab: string;
}>();

const emit = defineEmits<{
  select: [key: string];
}>();

const router = useRouter();

function onSelect(tab: TabItem): void {
  emit('select', tab.key);
  if (tab.to) {
    router.push(tab.to);
  }
}
</script>

<template>
  <nav class="sub-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="sub-tabs__item"
      :class="{ 'sub-tabs__item--active': activeTab === tab.key }"
      @click="onSelect(tab)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>

<style scoped>
.sub-tabs {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 100%;
}

.sub-tabs__item {
  padding: 6px 12px;
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.sub-tabs__item:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.sub-tabs__item--active {
  color: var(--accent);
  font-weight: 500;
}
</style>
