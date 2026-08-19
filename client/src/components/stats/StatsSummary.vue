<script setup lang="ts">
// StatsSummary.vue — 数据面板指标卡（FRONTEND §3.2.5）
// Props: stats: StatsOverview | null（null 时显示占位骨架）
// 展示 6 指标：总卡片数 / 已掌握 / 待复习 / 今日待复习 / 正确率 / 连续天数
// 「待复习」= 未掌握卡片（totalCards - masteredCards，掌握口径见 CHARTER R11）

import { computed } from 'vue';
import type { StatsOverview } from '@/types';

const props = defineProps<{
  stats: StatsOverview | null;
}>();

/** 未掌握（学习中）卡片数 */
const pendingCards = computed<number>(() =>
  props.stats ? Math.max(props.stats.totalCards - props.stats.masteredCards, 0) : 0
);

const metrics = computed(() => {
  if (!props.stats) return null;
  return [
    { label: '总卡片数', value: String(props.stats.totalCards), unit: '张' },
    { label: '已掌握', value: String(props.stats.masteredCards), unit: '张' },
    { label: '待复习', value: String(pendingCards.value), unit: '张' },
    { label: '今日待复习', value: String(props.stats.dueToday), unit: '张' },
    { label: '正确率', value: String(props.stats.accuracy), unit: '%' },
    { label: '连续学习', value: String(props.stats.streakDays), unit: '天' },
  ];
});
</script>

<template>
  <div class="stats-summary">
    <div v-if="metrics" class="stats-summary__grid">
      <div v-for="m in metrics" :key="m.label" class="stats-summary__item">
        <span class="stats-summary__value">
          {{ m.value }}<span class="stats-summary__unit">{{ m.unit }}</span>
        </span>
        <span class="stats-summary__label">{{ m.label }}</span>
      </div>
    </div>
    <!-- 无数据时占位骨架 -->
    <div v-else class="stats-summary__grid stats-summary__grid--placeholder">
      <div v-for="i in 6" :key="i" class="stats-summary__item stats-summary__item--skeleton">
        <span class="stats-summary__value">--</span>
        <span class="stats-summary__label">加载中…</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-summary__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.stats-summary__item {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stats-summary__value {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.stats-summary__unit {
  font-size: var(--font-size-sm);
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 4px;
}

.stats-summary__label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.stats-summary__item--skeleton {
  opacity: 0.55;
}
</style>
