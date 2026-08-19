<script setup lang="ts">
// ReviewCard.vue — 复习卡片（DESIGN §4.3.3）
// 交互流：正面（问题）→ 点击「显示答案」→ 背面（答案 Markdown 渲染）→ 4 级自评按钮
// Props: card / revealed / submitting
// Emits: reveal / rate(result)
// 四级评分对应设计令牌：--color-forgot/hard/good/easy（variables.css §功能色）

import MarkdownPreview from '@/components/common/MarkdownPreview.vue';
import type { Card, ReviewResult } from '@/types';

interface RatingOption {
  value: ReviewResult;
  label: string;
  shortcut: string; // 键盘快捷键（ReviewSession 监听，此处仅展示提示）
}

defineProps<{
  card: Card;
  revealed: boolean;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'reveal'): void;
  (e: 'rate', result: ReviewResult): void;
}>();

const RATING_OPTIONS: RatingOption[] = [
  { value: 'forgot', label: '完全忘记', shortcut: '1' },
  { value: 'hard', label: '困难', shortcut: '2' },
  { value: 'good', label: '正确', shortcut: '3' },
  { value: 'easy', label: '简单', shortcut: '4' },
];
</script>

<template>
  <div class="review-card">
    <div class="review-card__section review-card__section--front">
      <div class="review-card__label">问题</div>
      <MarkdownPreview :content="card.front" />
    </div>

    <template v-if="revealed">
      <div class="review-card__divider"></div>
      <div class="review-card__section review-card__section--back">
        <div class="review-card__label review-card__label--answer">答案</div>
        <MarkdownPreview :content="card.back" />
      </div>
    </template>

    <div class="review-card__actions">
      <button
        v-if="!revealed"
        class="review-card__reveal"
        @click="emit('reveal')"
      >
        显示答案
        <span class="review-card__shortcut">Space</span>
      </button>

      <template v-else>
        <button
          v-for="opt in RATING_OPTIONS"
          :key="opt.value"
          class="review-card__rate"
          :class="`review-card__rate--${opt.value}`"
          :disabled="submitting"
          @click="emit('rate', opt.value)"
        >
          {{ opt.label }}
          <span class="review-card__shortcut">{{ opt.shortcut }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.review-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 32px;
  max-width: 720px;
  margin: 0 auto;
}

.review-card__section {
  min-height: 120px;
}

.review-card__label {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-bottom: 8px;
  letter-spacing: 2px;
}

.review-card__label--answer {
  color: var(--accent);
}

.review-card__divider {
  border-top: 1px dashed var(--border-color);
  margin: 20px 0;
}

.review-card__actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 28px;
  flex-wrap: wrap;
}

.review-card__reveal {
  padding: 10px 32px;
  font-size: var(--font-size-lg);
  color: var(--bg-primary);
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.review-card__reveal:hover {
  background-color: var(--accent-hover);
}

.review-card__rate {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  font-size: var(--font-size-base);
  color: var(--bg-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.review-card__rate:hover:not(:disabled) {
  opacity: 0.85;
  transform: translateY(-1px);
}

.review-card__rate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.review-card__rate--forgot { background-color: var(--color-forgot); }
.review-card__rate--hard { background-color: var(--color-hard); }
.review-card__rate--good { background-color: var(--color-good); }
.review-card__rate--easy { background-color: var(--color-easy); }

.review-card__shortcut {
  font-size: var(--font-size-sm);
  opacity: 0.75;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-sm);
  padding: 0 5px;
}
</style>
