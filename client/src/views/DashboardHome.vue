<script setup lang="ts">
// DashboardHome.vue — 首页总览仪表盘（FRONTEND §4.1 路由 /）
// V1.0：StatsSummary 概览 + 今日待复习提醒 + 快捷入口
// 快捷入口目标路由均为 FRONTEND §4.1 已注册路由

import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStatsStore } from '@/stores/stats';
import StatsSummary from '@/components/stats/StatsSummary.vue';

const router = useRouter();
const statsStore = useStatsStore();

onMounted(() => {
  statsStore.fetchOverview();
});

function goToCards(): void {
  router.push('/cards');
}

function goToStats(): void {
  router.push('/cards/stats');
}
</script>

<template>
  <div class="dashboard">
    <header class="dashboard__header">
      <h1 class="dashboard__title">首页</h1>
    </header>

    <section class="dashboard__section">
      <h2 class="dashboard__section-title">学习概览</h2>
      <StatsSummary :stats="statsStore.overview" />
    </section>

    <div class="dashboard__grid">
      <section class="dashboard__card">
        <h3 class="dashboard__card-title">今日复习</h3>
        <p class="dashboard__card-text">
          <span class="dashboard__card-number">{{ statsStore.dueToday }}</span> 张卡片到期
        </p>
        <button
          class="dashboard__card-btn dashboard__card-btn--primary"
          :disabled="statsStore.dueToday === 0"
          @click="goToCards"
        >
          {{ statsStore.dueToday > 0 ? '去复习' : '今日已完成' }}
        </button>
      </section>

      <section class="dashboard__card">
        <h3 class="dashboard__card-title">记忆卡片</h3>
        <p class="dashboard__card-text">管理牌组与卡片，开始新的一轮记忆</p>
        <button class="dashboard__card-btn dashboard__card-btn--default" @click="goToCards">
          进入牌组列表
        </button>
      </section>

      <section class="dashboard__card">
        <h3 class="dashboard__card-title">学习统计</h3>
        <p class="dashboard__card-text">查看掌握进度、正确率与学习节奏</p>
        <button class="dashboard__card-btn dashboard__card-btn--default" @click="goToStats">
          查看数据面板
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 24px;
}

.dashboard__header {
  margin-bottom: 20px;
}

.dashboard__title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.dashboard__section {
  margin-bottom: 24px;
}

.dashboard__section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.dashboard__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.dashboard__card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dashboard__card-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.dashboard__card-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
  flex: 1;
}

.dashboard__card-number {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--accent);
}

.dashboard__card-btn {
  padding: 6px 16px;
  font-size: var(--font-size-base);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;
  align-self: flex-start;
}

.dashboard__card-btn--primary {
  background-color: var(--accent);
  color: var(--bg-primary);
  border: 1px solid var(--accent);
}

.dashboard__card-btn--primary:hover:not(:disabled) {
  background-color: var(--accent-hover);
}

.dashboard__card-btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.dashboard__card-btn--default {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.dashboard__card-btn--default:hover {
  background-color: var(--bg-hover);
}
</style>
