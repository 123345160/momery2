<script setup lang="ts">
// TimelineView.vue — 学习时间轴（FRONTEND §3.2.5）
// Props: items: TimelineItem[]；Events: item-click(item)

import type { TimelineItem } from '@/types';

defineProps<{ items: TimelineItem[]; loading?: boolean }>();

defineEmits<{ 'item-click': [item: TimelineItem] }>();

function fmt(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  return d.toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function resultLabel(r: string): string {
  return { forgot: '忘记', hard: '困难', good: '良好', easy: '简单' }[r] ?? r;
}

function resultClass(r: string): string {
  return { forgot: 'is-forgot', hard: 'is-hard', good: 'is-good', easy: 'is-easy' }[r] ?? '';
}
</script>

<template>
  <div class="timeline" :class="{ 'is-loading': loading }">
    <div class="timeline__title">学习时间轴</div>
    <ol class="timeline__list">
      <li
        v-for="item in items"
        :key="item.id"
        class="timeline__item"
        @click="$emit('item-click', item)"
      >
        <span class="timeline__dot" :class="resultClass(item.result)" />
        <div class="timeline__body">
          <p class="timeline__main">
            <span class="timeline__result" :class="resultClass(item.result)">{{ resultLabel(item.result) }}</span>
            <span class="timeline__card" :title="item.cardFront ?? ''">
              {{ item.cardFront ?? '(已删除卡片)' }}
            </span>
          </p>
          <p class="timeline__meta">
            <span v-if="item.deckName" class="timeline__deck">📁 {{ item.deckName }}</span>
            <span class="timeline__time">{{ fmt(item.reviewedAt) }}</span>
          </p>
        </div>
      </li>
      <li v-if="items.length === 0 && !loading" class="timeline__empty">
        暂无复习记录
      </li>
    </ol>
  </div>
</template>

<style scoped>
.timeline { background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; }
.timeline.is-loading { opacity: 0.6; }
.timeline__title { font-size: var(--font-size-lg); font-weight: 600; margin-bottom: 12px; }
.timeline__list { list-style: none; margin: 0; padding: 0; position: relative; }
.timeline__list::before {
  content: ''; position: absolute; left: 5px; top: 0; bottom: 0;
  width: 2px; background-color: var(--border-color);
}
.timeline__item { display: flex; gap: 12px; padding: 6px 0; cursor: pointer; position: relative; }
.timeline__item:hover { background-color: var(--bg-hover); border-radius: var(--radius-sm); }
.timeline__dot {
  width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
  margin-top: 4px; background-color: var(--text-tertiary); z-index: 1;
}
.timeline__dot.is-forgot { background-color: var(--danger); }
.timeline__dot.is-hard { background-color: var(--warning); }
.timeline__dot.is-good { background-color: var(--primary); }
.timeline__dot.is-easy { background-color: var(--success); }
.timeline__body { flex: 1; min-width: 0; }
.timeline__main { display: flex; gap: 8px; align-items: center; margin: 0 0 2px; }
.timeline__result {
  font-size: var(--font-size-sm); font-weight: 600; padding: 1px 6px;
  border-radius: var(--radius-sm); background-color: var(--bg-hover);
}
.timeline__result.is-forgot { color: var(--danger); }
.timeline__result.is-hard { color: var(--warning); }
.timeline__result.is-good { color: var(--primary); }
.timeline__result.is-easy { color: var(--success); }
.timeline__card {
  font-size: var(--font-size-base); color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.timeline__meta { display: flex; gap: 8px; font-size: var(--font-size-sm); color: var(--text-tertiary); margin: 0; }
.timeline__empty { padding: 24px; text-align: center; color: var(--text-tertiary); }
</style>
