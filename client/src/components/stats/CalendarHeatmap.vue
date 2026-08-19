<script setup lang="ts">
// CalendarHeatmap.vue — 复习日历热力图（FRONTEND §3.2.5）
// Props: data: CalendarDay[], days: number；Events: day-click(date)

import { computed } from 'vue';
import type { CalendarDay } from '@/types';

const props = withDefaults(defineProps<{
  data: CalendarDay[];
  days?: number;
}>(), { days: 30 });

const emit = defineEmits<{ 'day-click': [date: string] }>();

/** 把近 N 天数据铺成网格（每行 7 天） */
const grid = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map<string, number>();
  for (const d of props.data) map.set(d.date, d.count);

  const cells: { date: string; count: number; isToday: boolean }[] = [];
  for (let i = props.days - 1; i >= 0; i--) {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - i);
    const iso = dt.toISOString().slice(0, 10);
    cells.push({ date: iso, count: map.get(iso) ?? 0, isToday: i === 0 });
  }
  return cells;
});

function level(count: number): number {
  if (count <= 0) return 0;
  if (count < 3) return 1;
  if (count < 8) return 2;
  if (count < 15) return 3;
  return 4;
}

function weekdayLabel(idx: number): string {
  return ['日', '一', '二', '三', '四', '五', '六'][idx % 7];
}
</script>

<template>
  <div class="heatmap">
    <div class="heatmap__header">
      <span class="heatmap__title">复习日历（近 {{ days }} 天）</span>
      <div class="heatmap__legend">
        <span>少</span>
        <span
          v-for="lv in 5" :key="lv" class="heatmap__cell"
          :class="`heat-${lv - 1}`"
        />
        <span>多</span>
      </div>
    </div>
    <div class="heatmap__grid">
      <div
        v-for="(cell, idx) in grid"
        :key="cell.date"
        class="heatmap__cell"
        :class="[`heat-${level(cell.count)}`, { 'is-today': cell.isToday }]"
        :title="`${cell.date}: ${cell.count} 次复习`"
        @click="emit('day-click', cell.date)"
      >
        <span class="heatmap__cell-day">{{ Number(cell.date.slice(8, 10)) }}</span>
        <span v-if="idx % 7 === 0" class="heatmap__cell-wk">{{ weekdayLabel(Math.floor(idx / 7)) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.heatmap { background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; }
.heatmap__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.heatmap__title { font-size: var(--font-size-lg); font-weight: 600; }
.heatmap__legend { display: flex; align-items: center; gap: 4px; font-size: var(--font-size-sm); color: var(--text-tertiary); }
.heatmap__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.heatmap__cell {
  position: relative; aspect-ratio: 1; border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: var(--text-tertiary); cursor: pointer;
  transition: transform 0.1s ease;
}
.heatmap__cell:hover { transform: scale(1.1); }
.heatmap__cell.heat-0 { background-color: var(--heat-0); }
.heatmap__cell.heat-1 { background-color: var(--heat-1); }
.heatmap__cell.heat-2 { background-color: var(--heat-2); color: #fff; }
.heatmap__cell.heat-3 { background-color: var(--heat-3); color: #fff; }
.heatmap__cell.heat-4 { background-color: var(--heat-4); color: #fff; }
.heatmap__cell.is-today { outline: 2px solid var(--primary); outline-offset: 1px; }
.heatmap__cell-wk { position: absolute; left: -14px; font-size: 9px; }
</style>
