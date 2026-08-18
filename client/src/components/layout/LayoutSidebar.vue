<script setup lang="ts">
// LayoutSidebar.vue — 左侧固定侧边栏（FRONTEND §3.2.1 + §4.4）
// 子组件：SearchBar、CategoryFilter
// 路径推断激活：/cards → 记忆卡片；/notes → 文档；/ → 无高亮

import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUIStore } from '@/stores/ui';
import SearchBar from './SearchBar.vue';
import CategoryFilter from './CategoryFilter.vue';
import type { FilterOption } from '@/types';

const route = useRoute();
const router = useRouter();
const uiStore = useUIStore();

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: string;
}

const navItems: NavItem[] = [
  { key: 'notes', label: '文档与文件夹', path: '/notes', icon: '📂' },
  { key: 'today', label: '今日笔记', path: '/notes/today', icon: '📝' },
  { key: 'cards', label: '记忆卡片', path: '/cards', icon: '🧠' },
  { key: 'search', label: '搜索', path: '/search', icon: '🔍' },
];

// 路径推断激活（FRONTEND §4.4）
const activeNav = computed<string>(() => {
  const path = route.path;
  if (path === '/' || path === '') return '';
  if (path.startsWith('/cards')) return 'cards';
  if (path.startsWith('/notes')) return 'notes';
  if (path.startsWith('/search')) return 'search';
  return '';
});

const filterOptions: FilterOption[] = [
  { value: 'all', label: '全部' },
  { value: 'folder', label: '文件夹' },
  { value: 'pdf', label: 'PDF' },
  { value: 'tag', label: '标签' },
];

const filterCategory = ref<'all' | 'folder' | 'pdf' | 'tag'>('all');

function onNavClick(path: string): void {
  router.push(path);
}

function onSearch(query: string): void {
  router.push({ path: '/search', query: { q: query } });
}

function onFilterChange(category: string): void {
  filterCategory.value = category as typeof filterCategory.value;
}
</script>

<template>
  <aside
    class="sidebar app-layout__sidebar"
    :class="{ 'sidebar--collapsed': uiStore.sidebarCollapsed }"
  >
    <div class="sidebar__header">
      <span class="sidebar__logo">记忆学习平台</span>
      <button
        class="sidebar__collapse-btn"
        :title="uiStore.sidebarCollapsed ? '展开' : '折叠'"
        @click="uiStore.toggleSidebar()"
      >
        {{ uiStore.sidebarCollapsed ? '»' : '«' }}
      </button>
    </div>

    <SearchBar v-if="!uiStore.sidebarCollapsed" @search="onSearch" />

    <nav class="sidebar__nav">
      <ul class="sidebar__nav-list">
        <li
          v-for="item in navItems"
          :key="item.key"
          class="sidebar__nav-item"
          :class="{ 'sidebar__nav-item--active': activeNav === item.key }"
          :title="item.label"
          @click="onNavClick(item.path)"
        >
          <span class="sidebar__nav-icon">{{ item.icon }}</span>
          <span v-if="!uiStore.sidebarCollapsed" class="sidebar__nav-label">
            {{ item.label }}
          </span>
        </li>
      </ul>
    </nav>

    <div v-if="!uiStore.sidebarCollapsed" class="sidebar__footer">
      <CategoryFilter
        v-model="filterCategory"
        :options="filterOptions"
        @change="onFilterChange"
      />
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  transition: width 0.2s ease;
}

.sidebar--collapsed {
  width: 64px;
}

.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar__logo {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar--collapsed .sidebar__logo {
  display: none;
}

.sidebar__collapse-btn {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  background: none;
  border: none;
  padding: 2px 6px;
  cursor: pointer;
}

.sidebar__collapse-btn:hover {
  color: var(--accent);
}

.sidebar__nav {
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
}

.sidebar__nav-list {
  display: flex;
  flex-direction: column;
}

.sidebar__nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.sidebar__nav-item:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.sidebar__nav-item--active {
  background-color: var(--accent-light);
  color: var(--accent);
  border-left: 3px solid var(--accent);
  padding-left: 13px;
}

.sidebar--collapsed .sidebar__nav-item {
  justify-content: center;
  padding: 10px 0;
}

.sidebar__nav-icon {
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.sidebar__nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__footer {
  border-top: 1px solid var(--border-color);
}
</style>
