<script setup lang="ts">
// DeckCard.vue — 牌组卡片（FRONTEND §3.2.2）
// Props: deck: DeckListItem
// Computed: cardCount, dueCount, progressPercent
// Events: @click, @edit, @delete
//
// 进度百分比口径（V1.0 决策点 4）：(card_count - due_count) / card_count
// M1 stats/deck/:id 就绪后切换为 mastered / total
//
// 交互：点击卡片 → @click；hover 显示编辑/删除按钮 → @edit/@delete

import { computed } from 'vue';
import type { DeckListItem } from '@/types';

const props = defineProps<{
  deck: DeckListItem;
}>();

const emit = defineEmits<{
  click: [deckId: number];
  edit: [deckId: number];
  delete: [deckId: number];
}>();

const cardCount = computed(() => props.deck.card_count ?? 0);
const dueCount = computed(() => props.deck.due_count ?? 0);

const progressPercent = computed<number>(() => {
  if (cardCount.value === 0) return 0;
  return Math.round(((cardCount.value - dueCount.value) / cardCount.value) * 100);
});

function onClick(): void {
  emit('click', props.deck.id);
}

function onEdit(event: MouseEvent): void {
  event.stopPropagation();
  emit('edit', props.deck.id);
}

function onDelete(event: MouseEvent): void {
  event.stopPropagation();
  emit('delete', props.deck.id);
}
</script>

<template>
  <article
    class="deck-card"
    @click="onClick"
  >
    <!-- hover 显示的操作按钮 -->
    <div class="deck-card__actions">
      <button
        class="deck-card__action-btn"
        title="编辑"
        @click="onEdit"
      >
        ✎
      </button>
      <button
        class="deck-card__action-btn deck-card__action-btn--danger"
        title="删除"
        @click="onDelete"
      >
        ×
      </button>
    </div>

    <div class="deck-card__header">
      <span class="deck-card__icon">{{ deck.icon || '📦' }}</span>
      <h3 class="deck-card__name">{{ deck.name }}</h3>
    </div>

    <p v-if="deck.description" class="deck-card__desc">
      {{ deck.description }}
    </p>

    <div class="deck-card__stats">
      <span class="deck-card__stat">
        {{ cardCount }} 张卡片
      </span>
      <span
        v-if="dueCount > 0"
        class="deck-card__stat deck-card__stat--due"
      >
        {{ dueCount }} 待复习
      </span>
    </div>

    <div class="deck-card__progress">
      <div class="deck-card__progress-bar">
        <div
          class="deck-card__progress-fill"
          :style="{ width: progressPercent + '%' }"
        />
      </div>
      <span class="deck-card__progress-text">{{ progressPercent }}%</span>
    </div>
  </article>
</template>

<style scoped>
.deck-card {
  position: relative;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}

.deck-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--accent);
}

.deck-card__actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.deck-card:hover .deck-card__actions {
  opacity: 1;
}

.deck-card__action-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: var(--font-size-base);
  color: var(--text-muted);
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.deck-card__action-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.deck-card__action-btn--danger:hover {
  color: var(--color-forgot);
  border-color: var(--color-forgot);
}

.deck-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.deck-card__icon {
  font-size: var(--font-size-xl);
}

.deck-card__name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deck-card__desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 36px;
}

.deck-card__stats {
  display: flex;
  gap: 12px;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.deck-card__stat--due {
  color: var(--color-hard);
  font-weight: 500;
}

.deck-card__progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
}

.deck-card__progress-bar {
  flex: 1;
  height: 6px;
  background-color: var(--bg-hover);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.deck-card__progress-fill {
  height: 100%;
  background-color: var(--accent);
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
}

.deck-card__progress-text {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  min-width: 32px;
  text-align: right;
}
</style>
