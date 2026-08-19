<script setup lang="ts">
// CardItem.vue — 卡片列表项（FRONTEND §3.2.3）
// Props: card: Card
// Events: @edit(cardId), @delete(cardId)
// 展示 front 摘要 + tags + next_review 时间

import { computed } from 'vue';
import type { Card } from '@/types';

const props = defineProps<{
  card: Card;
}>();

const emit = defineEmits<{
  edit: [cardId: number];
  delete: [cardId: number];
}>();

// front 摘要：取首行 + 限制长度
const frontPreview = computed<string>(() => {
  const firstLine = (props.card.front ?? '').split('\n')[0] || '(空卡片)';
  return firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine;
});

// 解析 tags（DB 存 JSON 字符串）
const tags = computed<string[]>(() => {
  try {
    const parsed = JSON.parse(props.card.tags || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

// 复习状态文案
const reviewStatus = computed<{ text: string; isDue: boolean }>(() => {
  if (!props.card.next_review) return { text: '未排期', isDue: false };
  const now = new Date();
  const next = new Date(props.card.next_review.replace(' ', 'T') + 'Z');
  if (next <= now) return { text: '待复习', isDue: true };
  return { text: '已复习', isDue: false };
});

function onEdit(): void {
  emit('edit', props.card.id);
}

function onDelete(): void {
  emit('delete', props.card.id);
}
</script>

<template>
  <article class="card-item">
    <div class="card-item__main">
      <p class="card-item__front">{{ frontPreview }}</p>

      <div v-if="tags.length > 0" class="card-item__tags">
        <span
          v-for="tag in tags"
          :key="tag"
          class="card-item__tag"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <div class="card-item__meta">
      <span
        class="card-item__status"
        :class="{ 'card-item__status--due': reviewStatus.isDue }"
      >
        {{ reviewStatus.text }}
      </span>

      <div class="card-item__actions">
        <button
          class="card-item__btn"
          title="编辑"
          @click.stop="onEdit"
        >
          ✎
        </button>
        <button
          class="card-item__btn card-item__btn--danger"
          title="删除"
          @click.stop="onDelete"
        >
          ×
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  gap: 12px;
  transition: border-color 0.15s ease;
}

.card-item:hover {
  border-color: var(--accent);
}

.card-item__main {
  flex: 1;
  min-width: 0;
}

.card-item__front {
  font-size: var(--font-size-base);
  color: var(--text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-item__tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.card-item__tag {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  background-color: var(--bg-hover);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.card-item__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.card-item__status {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background-color: var(--bg-secondary);
}

.card-item__status--due {
  color: var(--color-hard);
  background-color: rgba(224, 160, 96, 0.15);
  font-weight: 500;
}

.card-item__actions {
  display: flex;
  gap: 4px;
}

.card-item__btn {
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: var(--font-size-base);
  color: var(--text-muted);
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.card-item__btn:hover {
  color: var(--accent);
  border-color: var(--border-color);
}

.card-item__btn--danger:hover {
  color: var(--color-forgot);
  border-color: var(--color-forgot);
}
</style>
