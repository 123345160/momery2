<script setup lang="ts">
// ReviewSession.vue — 复习模式（DESIGN §4.3.3 / CHARTER §2.2.3 路径 C）
// 编排：fetchDueCards → 卡片流（进度条 + ReviewCard）→ 评分提交 → ReviewSummary 结算
// 键盘快捷键：Space/Enter 显示答案，1/2/3/4 对应 forgot/hard/good/easy
// 间隔重复计算全部在后端（sm2.ts 冻结常量），前端仅提交评分并展示结果

import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useReviewStore } from '@/stores/review';
import { useDeckStore } from '@/stores/deck';
import ReviewCard from '@/components/review/ReviewCard.vue';
import ReviewSummary from '@/components/review/ReviewSummary.vue';
import type { ReviewResult } from '@/types';

const route = useRoute();
const router = useRouter();
const reviewStore = useReviewStore();
const deckStore = useDeckStore();

const deckId = computed<number>(() => Number(route.params.deckId));
const deckName = computed<string>(() => deckStore.currentDeck?.name ?? '复习模式');

// 页面状态：loading（拉取队列） / active（卡片流） / empty（无到期卡片）
const pageState = ref<'loading' | 'active' | 'empty'>('loading');

// 当前卡片答案是否已揭示（每张新卡片重置）
const revealed = ref(false);
// 评分提交中（防止重复点击）
const submitting = ref(false);

onMounted(async () => {
  try {
    await Promise.all([
      deckStore.fetchDeck(deckId.value),
      reviewStore.fetchDueCards(deckId.value),
    ]);
    pageState.value = reviewStore.queue.length > 0 ? 'active' : 'empty';
  } catch (err) {
    window.alert('加载复习队列失败：' + (err as Error).message);
    pageState.value = 'empty';
  }
});

onBeforeUnmount(() => {
  reviewStore.resetSession();
  window.removeEventListener('keydown', onKeydown);
});

// ===== 交互处理 =====

function onReveal(): void {
  revealed.value = true;
}

async function onRate(result: ReviewResult): Promise<void> {
  const card = reviewStore.currentCard;
  if (!card || submitting.value) return;
  submitting.value = true;
  try {
    await reviewStore.submitReview(card.id, result);
    reviewStore.nextCard();
    revealed.value = false; // 重置下一张的揭示状态
  } catch (err) {
    window.alert('提交评分失败：' + (err as Error).message);
  } finally {
    submitting.value = false;
  }
}

function onBack(): void {
  router.push(`/cards/deck/${deckId.value}`);
}

// ===== 键盘快捷键 =====

const KEY_MAP: Record<string, ReviewResult> = {
  '1': 'forgot',
  '2': 'hard',
  '3': 'good',
  '4': 'easy',
};

function onKeydown(e: KeyboardEvent): void {
  // 输入框聚焦时忽略（本页无输入框，防御性处理）
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

  if (pageState.value !== 'active' || !reviewStore.currentCard || submitting.value) return;

  if (!revealed.value) {
    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      onReveal();
    }
    return;
  }

  const result = KEY_MAP[e.key];
  if (result) {
    e.preventDefault();
    onRate(result);
  }
}

window.addEventListener('keydown', onKeydown);
</script>

<template>
  <div class="review-session">
    <header class="review-session__header">
      <h1 class="review-session__title">{{ deckName }}</h1>
    </header>

    <!-- 加载态 -->
    <div v-if="pageState === 'loading'" class="review-session__status">
      正在加载复习队列…
    </div>

    <!-- 空态：没有到期卡片 -->
    <div v-else-if="pageState === 'empty'" class="review-session__status">
      <div class="review-session__empty">
        <p class="review-session__empty-text">没有到期卡片，休息一下吧 🎉</p>
        <button class="review-session__empty-btn" @click="onBack">
          返回牌组
        </button>
      </div>
    </div>

    <!-- 卡片流 -->
    <template v-else>
      <!-- 结算页（会话结束） -->
      <ReviewSummary
        v-if="reviewStore.isSessionEnd"
        :stats="reviewStore.sessionStats"
        @back="onBack"
      />

      <!-- 复习中 -->
      <template v-else>
        <div class="review-session__progress">
          <div class="review-session__progress-info">
            <span>{{ reviewStore.progress.done + 1 }} / {{ reviewStore.progress.total }}</span>
            <span>{{ reviewStore.progress.percent }}%</span>
          </div>
          <div class="review-session__progress-track">
            <div
              class="review-session__progress-bar"
              :style="{ width: reviewStore.progress.percent + '%' }"
            ></div>
          </div>
        </div>

        <ReviewCard
          v-if="reviewStore.currentCard"
          :key="reviewStore.currentCard.id"
          :card="reviewStore.currentCard"
          :revealed="revealed"
          :submitting="submitting"
          @reveal="onReveal"
          @rate="onRate"
        />

        <div class="review-session__hint">
          <template v-if="!revealed">Space / Enter 显示答案</template>
          <template v-else>1 完全忘记 · 2 困难 · 3 正确 · 4 简单</template>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.review-session {
  padding: 24px;
  max-width: 860px;
  margin: 0 auto;
}

.review-session__header {
  margin-bottom: 20px;
}

.review-session__title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.review-session__status {
  display: flex;
  justify-content: center;
  padding: 64px 0;
  color: var(--text-muted);
  font-size: var(--font-size-lg);
}

.review-session__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.review-session__empty-text {
  margin: 0;
  color: var(--text-secondary);
}

.review-session__empty-btn {
  padding: 10px 32px;
  font-size: var(--font-size-base);
  color: var(--bg-primary);
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.review-session__empty-btn:hover {
  background-color: var(--accent-hover);
}

.review-session__progress {
  max-width: 720px;
  margin: 0 auto 20px;
}

.review-session__progress-info {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.review-session__progress-track {
  height: 6px;
  background-color: var(--bg-hover);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.review-session__progress-bar {
  height: 100%;
  background-color: var(--accent);
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
}

.review-session__hint {
  text-align: center;
  margin-top: 16px;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}
</style>
