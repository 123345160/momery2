<script setup lang="ts">
// LayoutTopBar.vue — 顶部栏（FRONTEND §3.2.1）
// Props: tabs: TabItem[] (当前模块的子标签列表)
// Slots: #actions (右侧操作区)
// Events: @tab-change(tabKey: string)
// 子组件：SubTabs、CreateButton、CalendarBar

import { computed } from 'vue';
import { useRoute } from 'vue-router';
import SubTabs from './SubTabs.vue';
import CreateButton from './CreateButton.vue';
import CalendarBar from './CalendarBar.vue';
import type { MenuItem, TabItem } from '@/types';

const props = defineProps<{
  tabs: TabItem[];
}>();

const emit = defineEmits<{
  tabChange: [tabKey: string];
}>();

const route = useRoute();

// 推断当前激活的子标签（基于 route.path）
const activeTab = computed<string>(() => {
  const match = props.tabs.find((t) => t.to && route.path.startsWith(t.to));
  return match ? match.key : (props.tabs[0]?.key ?? '');
});

const menuItems: MenuItem[] = [
  { type: 'deck', label: '新建牌组' },
  { type: 'note', label: '新建笔记' },
  { type: 'folder', label: '新建文件夹' },
];

function onTabSelect(key: string): void {
  emit('tabChange', key);
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__left">
      <SubTabs
        v-if="tabs.length > 0"
        :tabs="tabs"
        :active-tab="activeTab"
        @select="onTabSelect"
      />
    </div>
    <div class="topbar__right">
      <slot name="actions">
        <CreateButton :menu-items="menuItems" />
        <CalendarBar />
      </slot>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
}

.topbar__left {
  display: flex;
  align-items: center;
  height: 100%;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
