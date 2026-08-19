<script setup lang="ts">
// DeckGrid.vue — 牌组网格（FRONTEND §3.2.2）
// Props: decks: DeckListItem[], loading: boolean
// Events: @deck-click(deckId), @deck-edit(deckId), @deck-delete(deckId)
// 子组件: DeckCard
// 含 loading 骨架屏 + 空态提示
//
// 注意：删除二次确认交由页面级（CardsHome）用 Modal 处理（决策点 2）

import type { DeckListItem } from '@/types';
import DeckCard from './DeckCard.vue';

defineProps<{
  decks: DeckListItem[];
  loading: boolean;
}>();

const emit = defineEmits<{
  deckClick: [deckId: number];
  deckEdit: [deckId: number];
  deckDelete: [deckId: number];
}>();

function onDeckClick(deckId: number): void {
  emit('deckClick', deckId);
}

function onDeckEdit(deckId: number): void {
  emit('deckEdit', deckId);
}

function onDeckDelete(deckId: number): void {
  emit('deckDelete', deckId);
}
</script>

<template>
  <div class="deck-grid">
    <!-- 加载骨架屏 -->
    <div v-if="loading" class="deck-grid__loading">
      <div
        v-for="i in 6"
        :key="i"
        class="deck-grid__skeleton"
      />
    </div>

    <!-- 空态 -->
    <div v-else-if="decks.length === 0" class="deck-grid__empty">
      <p class="deck-grid__empty-text">还没有任何牌组</p>
      <p class="deck-grid__empty-hint">点击右上角「新建牌组」开始创建</p>
    </div>

    <!-- 网格 -->
    <div v-else class="deck-grid__list">
      <DeckCard
        v-for="deck in decks"
        :key="deck.id"
        :deck="deck"
        @click="onDeckClick"
        @edit="onDeckEdit"
        @delete="onDeckDelete"
      />
    </div>
  </div>
</template>

<style scoped>
.deck-grid {
  width: 100%;
}

.deck-grid__loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.deck-grid__skeleton {
  height: 180px;
  background-color: var(--bg-hover);
  border-radius: var(--radius-md);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.deck-grid__empty {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted);
}

.deck-grid__empty-text {
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.deck-grid__empty-hint {
  font-size: var(--font-size-base);
  color: var(--text-muted);
}

.deck-grid__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
</style>
