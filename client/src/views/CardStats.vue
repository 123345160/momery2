<script setup lang="ts">
// CardStats.vue — 卡片统计页（FRONTEND §3.2.5 + §4.1 路由 /cards/stats）
import { onMounted } from 'vue';
import { useStatsStore } from '@/stores/stats';
import StatsSummary from '@/components/stats/StatsSummary.vue';
import CalendarHeatmap from '@/components/stats/CalendarHeatmap.vue';
import TimelineView from '@/components/stats/TimelineView.vue';

const statsStore = useStatsStore();

onMounted(async () => {
  await Promise.all([
    statsStore.fetchOverview(),
    statsStore.fetchCalendar(30),
    statsStore.fetchTimeline(50),
  ]);
});
</script>

<template>
  <div class="card-stats">
    <h2 class="card-stats__title">学习统计</h2>
    <StatsSummary :stats="statsStore.overview" :loading="statsStore.loading" />
    <div class="card-stats__grid">
      <CalendarHeatmap :data="statsStore.calendarData" :days="30" />
      <TimelineView :items="statsStore.timeline" :loading="statsStore.loading" />
    </div>
  </div>
</template>

<style scoped>
.card-stats { padding: 16px 24px; height: 100%; overflow-y: auto; }
.card-stats__title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 16px; }
.card-stats__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
@media (max-width: 900px) { .card-stats__grid { grid-template-columns: 1fr; } }
</style>
