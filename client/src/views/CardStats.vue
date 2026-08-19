<script setup lang="ts">
// CardStats.vue — 卡片统计页（FRONTEND §4.1 路由 /cards/stats）
// V1.0：StatsSummary 数据面板（DESIGN §4.4.2）
// M1 占位：日历热力图（CalendarHeatmap）与时间轴（TimelineView）——
//   后端 GET /api/stats/calendar、/api/stats/timeline 于 M1（Stage 7）提供（DESIGN §11 里程碑）

import { onMounted } from 'vue';
import { useStatsStore } from '@/stores/stats';
import StatsSummary from '@/components/stats/StatsSummary.vue';

const statsStore = useStatsStore();

onMounted(() => {
  statsStore.fetchOverview();
});
</script>

<template>
  <div class="card-stats">
    <header class="card-stats__header">
      <h1 class="card-stats__title">卡片统计</h1>
    </header>

    <section class="card-stats__section">
      <h2 class="card-stats__section-title">数据面板</h2>
      <StatsSummary :stats="statsStore.overview" />
    </section>

    <div class="card-stats__grid">
      <section class="card-stats__section">
        <h2 class="card-stats__section-title">日历热力图</h2>
        <div class="card-stats__placeholder">
          <p class="card-stats__placeholder-text">月历视图 · 每日复习密度</p>
          <p class="card-stats__placeholder-hint">M1 版本提供</p>
        </div>
      </section>

      <section class="card-stats__section">
        <h2 class="card-stats__section-title">时间轴</h2>
        <div class="card-stats__placeholder">
          <p class="card-stats__placeholder-text">笔记 / 卡片创建与复习记录</p>
          <p class="card-stats__placeholder-hint">M1 版本提供</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.card-stats {
  padding: 24px;
}

.card-stats__header {
  margin-bottom: 20px;
}

.card-stats__title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.card-stats__section {
  margin-bottom: 24px;
}

.card-stats__section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.card-stats__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.card-stats__placeholder {
  height: 160px;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background-color: var(--bg-secondary);
}

.card-stats__placeholder-text {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--text-muted);
}

.card-stats__placeholder-hint {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}
</style>
