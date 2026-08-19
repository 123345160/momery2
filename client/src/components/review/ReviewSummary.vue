<script setup lang="ts">
// ReviewSummary.vue — 复习会话结算页
// 展示：已复习数 / 4 级分布 / 正确率（口径与后端一致：(good + easy) / reviewed）
// Props: stats（useReviewStore.sessionStats）
// Emits: back（返回牌组详情）

import { computed } from 'vue';
import type { SessionStats } from '@/stores/review';

const props = defineProps<{
  stats: SessionStats;
}>();

const emit = defineEmits<{
  (e: 'back'): void;
}>();

/** 正确率 = (good + easy) / reviewed × 100（与后端 reviewService 口径一致） */
const accuracy = computed<number>(() => {
  if (props.stats.reviewed === 0) return 0;
  return Math.round(((props.stats.good + props.stats.easy) / props.stats.reviewed) * 100);
});

/** 4 级分布（含颜色令牌与文案） */
const distribution = computed(() => [
  { label: '完全忘记', count: props.stats.forgot, color: 'var(--color-forgot)' },
  { label: '困难', count: props.stats.hard, color: 'var(--color-hard)' },
  { label: '正确', count: props.stats.good, color: 'var(--color-good)' },
  { label: '简单', count: props.stats.easy, color: 'var(--color-easy)' },
]);
</script>

<template>
  <div class="review-summary">
    <div class="review-summary__card">
      <h2 class="review-summary__title">复习完成</h2>
      <p class="review-summary__subtitle">本轮共复习 {{ stats.reviewed }} 张卡片</p>

      <div class="review-summary__accuracy">
        <span class="review-summary__accuracy-value">{{ accuracy }}%</span>
        <span class="review-summary__accuracy-label">正确率</span>
      </div>

      <div class="review-summary__distribution">
        <div
          v-for="item in distribution"
          :key="item.label"
          class="review-summary__dist-item"
        >
          <span
            class="review-summary__dist-dot"
            :style="{ backgroundColor: item.color }"
          ></span>
          <span class="review-summary__dist-label">{{ item.label }}</span>
          <span class="review-summary__dist-count">{{ item.count }} 张</span>
        </div>
      </div>

      <button class="review-summary__back" @click="emit('back')">
        返回牌组
      </button>
    </div>
  </div>
</template>

<style scoped>
.review-summary {
  display: flex;
  justify-content: center;
  padding: 48px 24px;
}

.review-summary__card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 40px 48px;
  width: 100%;
  max-width: 480px;
  text-align: center;
}

.review-summary__title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.review-summary__subtitle {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  margin: 0 0 24px;
}

.review-summary__accuracy {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  margin-bottom: 28px;
}

.review-summary__accuracy-value {
  font-size: 48px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1;
}

.review-summary__accuracy-label {
  font-size: var(--font-size-base);
  color: var(--text-muted);
}

.review-summary__distribution {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 32px;
}

.review-summary__dist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.review-summary__dist-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.review-summary__dist-label {
  flex: 1;
  text-align: left;
  font-size: var(--font-size-base);
  color: var(--text-primary);
}

.review-summary__dist-count {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.review-summary__back {
  padding: 10px 32px;
  font-size: var(--font-size-base);
  color: var(--bg-primary);
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.review-summary__back:hover {
  background-color: var(--accent-hover);
}
</style>
