/**
 * useReviewStore — 复习业务域（FRONTEND §5.2.2）
 *
 * - state: queue/currentIndex/sessionStats
 * - actions: fetchDueCards/submitReview/nextCard
 * - getters: currentCard/progress/isSessionEnd
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as reviewApi from '@/api/review';
import type { Card, ReviewResult } from '@/types';

/** 会话统计（供 ReviewSummary 结算展示） */
export interface SessionStats {
  reviewed: number;
  forgot: number;
  hard: number;
  good: number;
  easy: number;
}

export const useReviewStore = defineStore('review', () => {
  // ===== state =====
  const queue = ref<Card[]>([]);
  const currentIndex = ref(0);
  const sessionStats = ref<SessionStats>({
    reviewed: 0,
    forgot: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  // ===== getters =====
  const currentCard = computed<Card | null>(() =>
    queue.value.length > 0 ? queue.value[currentIndex.value] ?? null : null
  );

  const progress = computed(() => {
    const total = queue.value.length;
    const done = currentIndex.value;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, percent };
  });

  /** 会话是否结束（空队列视为未开始，而非已结束——空集语义兜底） */
  const isSessionEnd = computed(
    () => queue.value.length > 0 && currentIndex.value >= queue.value.length
  );

  // ===== actions =====
  async function fetchDueCards(deckId: number): Promise<void> {
    queue.value = await reviewApi.getDueCards(deckId);
    currentIndex.value = 0;
    sessionStats.value = { reviewed: 0, forgot: 0, hard: 0, good: 0, easy: 0 };
  }

  async function submitReview(cardId: number, result: ReviewResult): Promise<void> {
    await reviewApi.submitReview(cardId, result);
    sessionStats.value.reviewed += 1;
    sessionStats.value[result] += 1;
  }

  /** 前进到下一张卡片（若结束则结算） */
  function nextCard(): void {
    currentIndex.value += 1;
  }

  /** 重置会话（清空队列和统计） */
  function resetSession(): void {
    queue.value = [];
    currentIndex.value = 0;
    sessionStats.value = { reviewed: 0, forgot: 0, hard: 0, good: 0, easy: 0 };
  }

  return {
    // state
    queue,
    currentIndex,
    sessionStats,
    // getters
    currentCard,
    progress,
    isSessionEnd,
    // actions
    fetchDueCards,
    submitReview,
    nextCard,
    resetSession,
  };
});
