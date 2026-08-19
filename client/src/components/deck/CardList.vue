<script setup lang="ts">
// CardList.vue — 卡片列表（FRONTEND §3.2.3）
// Props: cards: Card[], deckName: string, loading: boolean
// Events: @edit(cardId), @delete(cardId), @create
// 子组件: CardItem
// 含 loading 骨架屏 + 空态 + 「新建卡片」按钮

import type { Card } from '@/types';
import CardItem from './CardItem.vue';

defineProps<{
  cards: Card[];
  deckName: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  edit: [cardId: number];
  delete: [cardId: number];
  create: [];
}>();

function onEdit(cardId: number): void {
  emit('edit', cardId);
}

function onDelete(cardId: number): void {
  emit('delete', cardId);
}

function onCreate(): void {
  emit('create');
}
</script>

<template>
  <div class="card-list">
    <header class="card-list__header">
      <h2 class="card-list__title">{{ deckName }}</h2>
      <button class="card-list__create" @click="onCreate">
        + 新建卡片
      </button>
    </header>

    <!-- 加载骨架屏 -->
    <div v-if="loading" class="card-list__loading">
      <div
        v-for="i in 4"
        :key="i"
        class="card-list__skeleton"
      />
    </div>

    <!-- 空态 -->
    <div v-else-if="cards.length === 0" class="card-list__empty">
      <p class="card-list__empty-text">该牌组还没有卡片</p>
      <p class="card-list__empty-hint">点击上方「新建卡片」开始添加</p>
    </div>

    <!-- 列表 -->
    <div v-else class="card-list__items">
      <CardItem
        v-for="card in cards"
        :key="card.id"
        :card="card"
        @edit="onEdit"
        @delete="onDelete"
      />
    </div>
  </div>
</template>

<style scoped>
.card-list {
  width: 100%;
}

.card-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-list__title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.card-list__create {
  padding: 6px 16px;
  font-size: var(--font-size-base);
  color: var(--bg-primary);
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.card-list__create:hover {
  background-color: var(--accent-hover);
}

.card-list__loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-list__skeleton {
  height: 56px;
  background-color: var(--bg-hover);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.card-list__empty {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted);
}

.card-list__empty-text {
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.card-list__empty-hint {
  font-size: var(--font-size-base);
  color: var(--text-muted);
}

.card-list__items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
