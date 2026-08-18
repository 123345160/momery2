<script setup lang="ts">
// CategoryFilter.vue — 侧边栏底部筛选区（FRONTEND §3.2.1）
// Props: options: FilterOption[]
// Events: @change(category: string)

import type { FilterOption } from '@/types';

defineProps<{
  options: FilterOption[];
  modelValue: string;
}>();

const emit = defineEmits<{
  change: [category: string];
  'update:modelValue': [value: string];
}>();

function onSelect(value: string): void {
  emit('update:modelValue', value);
  emit('change', value);
}
</script>

<template>
  <div class="category-filter">
    <p class="category-filter__label">筛选</p>
    <ul class="category-filter__list">
      <li
        v-for="option in options"
        :key="option.value"
        class="category-filter__item"
        :class="{ 'category-filter__item--active': modelValue === option.value }"
        @click="onSelect(option.value)"
      >
        {{ option.label }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.category-filter {
  padding: 8px 12px;
}

.category-filter__label {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-bottom: 4px;
}

.category-filter__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.category-filter__item {
  padding: 4px 8px;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.category-filter__item:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.category-filter__item--active {
  background-color: var(--accent-light);
  color: var(--accent);
}
</style>
