/**
 * Vue Router 配置（FRONTEND §4）
 *
 * - 扁平路由结构（不嵌套 children）
 * - meta.title: 拼接到 document.title
 * - meta.tabGroup: 控制 LayoutTopBar 的 SubTabs 渲染（cards/notes/null）
 *
 * 路由表见 FRONTEND §4.1
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/DashboardHome.vue'),
    meta: { title: '首页', tabGroup: null },
  },
  {
    path: '/cards',
    name: 'cards',
    component: () => import('@/views/CardsHome.vue'),
    meta: { title: '记忆卡片', tabGroup: 'cards' },
  },
  {
    path: '/cards/stats',
    name: 'card-stats',
    component: () => import('@/views/CardStats.vue'),
    meta: { title: '卡片统计', tabGroup: 'cards' },
  },
  {
    path: '/cards/exam',
    name: 'exam-goals',
    component: () => import('@/views/ExamGoals.vue'),
    meta: { title: '考试与目标', tabGroup: 'cards' },
  },
  {
    path: '/cards/deck/:deckId',
    name: 'deck-detail',
    component: () => import('@/views/DeckDetail.vue'),
    meta: { title: '牌组详情', tabGroup: null },
  },
  {
    path: '/cards/review/:deckId',
    name: 'review',
    component: () => import('@/views/ReviewSession.vue'),
    meta: { title: '复习', tabGroup: null },
  },
  {
    path: '/notes',
    name: 'notes',
    component: () => import('@/views/NotesList.vue'),
    meta: { title: '文档', tabGroup: 'notes' },
  },
  {
    path: '/notes/today',
    name: 'today-notes',
    component: () => import('@/views/TodayNotes.vue'),
    meta: { title: '今日笔记', tabGroup: 'notes' },
  },
  {
    path: '/notes/:id',
    name: 'note-editor',
    component: () => import('@/views/NoteEditor.vue'),
    meta: { title: '编辑笔记', tabGroup: null },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue'),
    meta: { title: '搜索', tabGroup: null },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '设置', tabGroup: null },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局守卫（FRONTEND §4.3）
router.beforeEach((to, _from, next) => {
  // 1. 设置 document.title
  const title = to.meta.title as string | undefined;
  if (title) {
    document.title = `${title} · 记忆学习平台`;
  } else {
    document.title = '记忆学习平台';
  }
  // 2. 权限校验占位（M2 启用）
  next();
});

export default router;
