<script setup lang="ts">
// App.vue — 根组件：布局壳（FRONTEND §3.2.1）
// 子组件：LayoutSidebar、LayoutTopBar、RouterView
// tabGroup 控制 LayoutTopBar 是否显示 SubTabs

import { computed, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import LayoutSidebar from '@/components/layout/LayoutSidebar.vue';
import LayoutTopBar from '@/components/layout/LayoutTopBar.vue';
import { useUIStore } from '@/stores/ui';
import type { TabItem } from '@/types';

const route = useRoute();
const uiStore = useUIStore();

// 子标签配置（仅当 meta.tabGroup 为 'cards' 或 'notes' 时显示对应标签组）
const cardsTabs: TabItem[] = [
  { key: 'home', label: '首页', to: '/' },
  { key: 'stats', label: '卡片统计', to: '/cards/stats' },
  { key: 'exam', label: '考试与目标', to: '/cards/exam' },
];

const notesTabs: TabItem[] = [
  { key: 'notes', label: '文档', to: '/notes' },
  { key: 'today', label: '今日笔记', to: '/notes/today' },
];

const topBarTabs = computed<TabItem[]>(() => {
  const group = route.meta.tabGroup as 'cards' | 'notes' | null | undefined;
  if (group === 'cards') return cardsTabs;
  if (group === 'notes') return notesTabs;
  return [];
});

// 同步到 UIStore（供其他组件读取）
watchEffect(() => {
  const group = route.meta.tabGroup as 'cards' | 'notes' | null | undefined;
  uiStore.setTabGroup(group ?? null);
});
</script>

<template>
  <div class="app-layout">
    <LayoutSidebar />
    <div class="app-layout__main">
      <div class="app-layout__topbar">
        <LayoutTopBar :tabs="topBarTabs" />
      </div>
      <main class="app-layout__content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* 布局样式由全局 layout.css 提供，App.vue 只负责结构 */
</style>
