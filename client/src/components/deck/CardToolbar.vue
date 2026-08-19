<script setup lang="ts">
// CardToolbar.vue — 卡片列表工具栏（Stage 5b）
// 提供搜索（300ms 防抖）+ 排序下拉 + 状态筛选段控
// Props: search, sort, status；Events: update:search/sort/status

import { ref, watch } from 'vue';

type SortOption = 'created' | 'next_review' | 'front';
type StatusOption = 'all' | 'due' | 'mastered';

const props = defineProps<{
  search: string;
  sort: SortOption;
  status: StatusOption;
}>();

const emit = defineEmits<{
  'update:search': [value: string];
  'update:sort': [value: SortOption];
  'update:status': [value: StatusOption];
}>();

// 本地搜索输入（与 prop 同步，输入后防抖 300ms 再 emit）
const searchInput = ref(props.search);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// 父组件重置 search 时同步到本地输入框
watch(
  () => props.search,
  (val) => {
    searchInput.value = val;
  },
);

function onSearchInput(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit('update:search', searchInput.value);
  }, 300);
}

function onSortChange(e: Event): void {
  const target = e.target as HTMLSelectElement;
  emit('update:sort', target.value as SortOption);
}

function onStatusChange(value: StatusOption): void {
  emit('update:status', value);
}

const statusOptions: { value: StatusOption; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'due', label: '待复习' },
  { value: 'mastered', label: '已掌握' },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'created', label: '创建时间' },
  { value: 'next_review', label: '到期时间' },
  { value: 'front', label: '正题字母' },
];
</script>

<template>
  <div class="card-toolbar">
    <div class="card-toolbar__search">
      <input
        v-model="searchInput"
        class="card-toolbar__input"
        type="text"
        placeholder="搜索卡片正题 / 答案…"
        @input="onSearchInput"
      />
    </div>

    <div class="card-toolbar__sort">
      <select
        class="card-toolbar__select"
        :value="sort"
        @change="onSortChange"
      >
        <option
          v-for="opt in sortOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
    </div>

    <div class="card-toolbar__status">
      <button
        v-for="opt in statusOptions"
        :key="opt.value"
        class="card-toolbar__status-btn"
        :class="{ 'card-toolbar__status-btn--active': status === opt.value }"
        @click="onStatusChange(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.card-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.card-toolbar__search {
  flex: 1;
  min-width: 200px;
}

.card-toolbar__input {
  width: 100%;
  height: 32px;
  padding: 0 12px;
  font-size: var(--font-size-base);
  color: var(--text-primary);
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.card-toolbar__input:focus {
  border-color: var(--accent);
}

.card-toolbar__input::placeholder {
  color: var(--text-muted);
}

.card-toolbar__select {
  height: 32px;
  padding: 0 8px;
  font-size: var(--font-size-base);
  color: var(--text-primary);
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.card-toolbar__select:focus {
  border-color: var(--accent);
}

.card-toolbar__status {
  display: flex;
  gap: 0;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.card-toolbar__status-btn {
  height: 32px;
  padding: 0 12px;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  background-color: var(--bg-card);
  border: none;
  border-right: 1px solid var(--border-color);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.card-toolbar__status-btn:last-child {
  border-right: none;
}

.card-toolbar__status-btn:hover {
  background-color: var(--bg-hover);
}

.card-toolbar__status-btn--active {
  color: var(--bg-primary);
  background-color: var(--accent);
}

.card-toolbar__status-btn--active:hover {
  background-color: var(--accent-hover);
}
</style>
