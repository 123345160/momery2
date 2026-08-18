<script setup lang="ts">
// SearchBar.vue — 侧边栏顶部全局搜索框（FRONTEND §3.2.1）
// Events: @search(query: string)

import { ref } from 'vue';

const emit = defineEmits<{
  search: [query: string];
}>();

const query = ref('');

function onEnter(): void {
  const trimmed = query.value.trim();
  if (trimmed) {
    emit('search', trimmed);
    query.value = '';
  }
}
</script>

<template>
  <div class="search-bar">
    <input
      v-model="query"
      class="search-bar__input"
      type="text"
      placeholder="搜索牌组/笔记/卡片"
      @keydown.enter="onEnter"
    />
  </div>
</template>

<style scoped>
.search-bar {
  padding: 8px 12px;
}

.search-bar__input {
  width: 100%;
  font-size: var(--font-size-sm);
  padding: 6px 10px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}
</style>
