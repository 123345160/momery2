<script setup lang="ts">
// DeckDetail.vue — 牌组详情（卡片列表）（FRONTEND §3.2.2 + §4.1 路由 /cards/deck/:deckId）
// 装配 CardToolbar + CardList + 卡片 CRUD（创建/编辑/删除）
//
// Stage 5b：接入搜索/排序/状态筛选，CRUD 后用当前查询条件刷新
// Stage 5c：接入单牌组导出（GET /api/export/deck/:id → JSON 下载）

import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDeckStore } from '@/stores/deck';
import { useUIStore } from '@/stores/ui';
import { exportDeck } from '@/api/importExport';
import CardList from '@/components/deck/CardList.vue';
import CardToolbar from '@/components/deck/CardToolbar.vue';
import CardCreateForm from '@/components/deck/CardCreateForm.vue';
import Modal from '@/components/common/Modal.vue';
import type { Card, CardQueryParams, CreateCardDto, UpdateCardDto } from '@/types';

const route = useRoute();
const router = useRouter();
const deckStore = useDeckStore();
const uiStore = useUIStore();

// 路由参数
const deckId = computed<number>(() => Number(route.params.deckId));

// 牌组名（用于页面标题）
const deckName = computed<string>(() => deckStore.currentDeck?.name ?? '牌组详情');

// 筛选/排序/搜索状态
const searchQuery = ref('');
const sortQuery = ref<'created' | 'next_review' | 'front'>('created');
const statusQuery = ref<'all' | 'due' | 'mastered'>('all');

// 创建/编辑弹窗状态
const formModalVisible = ref(false);
const editingCard = ref<Card | null>(null);

// 删除确认弹窗状态
const deleteModalVisible = ref(false);
const deletingCard = ref<Card | null>(null);

onMounted(async () => {
  await Promise.all([
    deckStore.fetchDeck(deckId.value),
    deckStore.fetchCards(deckId.value, { sort: 'created', status: 'all' }),
  ]);
});

// 筛选条件变化时重新查询
watch([searchQuery, sortQuery, statusQuery], () => {
  const query: CardQueryParams = {
    sort: sortQuery.value,
    status: statusQuery.value,
  };
  if (searchQuery.value.trim()) {
    query.search = searchQuery.value.trim();
  }
  deckStore.fetchCards(deckId.value, query);
});

// 返回牌组网格
function onBack(): void {
  router.push('/cards');
}

// 开始复习（进入复习模式）
function onStartReview(): void {
  router.push(`/cards/review/${deckId.value}`);
}

// 新建卡片
function onCreateCard(): void {
  editingCard.value = null;
  formModalVisible.value = true;
}

// 编辑卡片 → 弹窗回填
function onEditCard(cardId: number): void {
  const card = deckStore.currentDeckCards.find((c) => c.id === cardId);
  if (!card) return;
  editingCard.value = card;
  formModalVisible.value = true;
}

// 删除卡片 → 弹确认 Modal
function onDeleteCard(cardId: number): void {
  const card = deckStore.currentDeckCards.find((c) => c.id === cardId);
  if (!card) return;
  deletingCard.value = card;
  deleteModalVisible.value = true;
}

// 确认删除
async function onConfirmDelete(): Promise<void> {
  if (!deletingCard.value) return;
  try {
    await deckStore.deleteCard(deckId.value, deletingCard.value.id);
    deleteModalVisible.value = false;
    deletingCard.value = null;
  } catch (err) {
    window.alert('删除卡片失败：' + (err as Error).message);
  }
}

// 提交卡片表单
async function onSubmitCard(data: CreateCardDto | UpdateCardDto): Promise<void> {
  try {
    if (editingCard.value) {
      await deckStore.updateCard(deckId.value, editingCard.value.id, data as UpdateCardDto);
    } else {
      await deckStore.createCard(deckId.value, data as CreateCardDto);
    }
    formModalVisible.value = false;
  } catch (err) {
    window.alert('保存卡片失败：' + (err as Error).message);
  }
}

const deleteModalTitle = computed(() =>
  deletingCard.value ? `删除卡片 #${deletingCard.value.id}` : '删除卡片'
);

// ===== 导出牌组（Stage 5c）=====

const exporting = ref(false);

/** 导出文件名时间戳：YYYYMMDD-HHmmss */
function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// 导出当前牌组 → 下载 JSON 文件（含卡片与 SM-2 进度）
async function onExportDeck(): Promise<void> {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const blob = await exportDeck(deckId.value);
    const safeName = deckName.value.replace(/[\\/:*?"<>|]/g, '_');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memory-deck-${safeName}-${timestamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    uiStore.showToast('导出成功，已开始下载', 'success');
  } catch (err) {
    uiStore.showToast('导出失败：' + (err as Error).message, 'error');
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div class="deck-detail">
    <header class="deck-detail__header">
      <button class="deck-detail__back" @click="onBack">
        ← 返回牌组
      </button>
      <h1 class="deck-detail__title">{{ deckName }}</h1>
      <span class="deck-detail__count">共 {{ deckStore.currentDeckCardsTotal }} 张</span>
      <button
        class="deck-detail__review"
        :disabled="deckStore.currentDeck?.due_count === 0"
        :title="deckStore.currentDeck?.due_count ? `${deckStore.currentDeck.due_count} 张待复习` : '没有到期卡片'"
        @click="onStartReview"
      >
        开始复习{{ deckStore.currentDeck?.due_count ? `（${deckStore.currentDeck.due_count}）` : '' }}
      </button>
      <button
        class="deck-detail__secondary"
        :disabled="exporting"
        @click="onExportDeck"
      >
        {{ exporting ? '导出中…' : '导出牌组' }}
      </button>
      <button class="deck-detail__create" @click="onCreateCard">
        + 新建卡片
      </button>
    </header>

    <CardToolbar
      v-model:search="searchQuery"
      v-model:sort="sortQuery"
      v-model:status="statusQuery"
    />

    <div class="deck-detail__content">
      <CardList
        :cards="deckStore.currentDeckCards"
        :loading="deckStore.loading"
        @edit="onEditCard"
        @delete="onDeleteCard"
      />
    </div>

    <CardCreateForm
      :visible="formModalVisible"
      :edit-card="editingCard"
      @close="formModalVisible = false"
      @submit="onSubmitCard"
    />

    <Modal
      :visible="deleteModalVisible"
      :title="deleteModalTitle"
      width="400px"
      @close="deleteModalVisible = false"
    >
      <p class="deck-detail__delete-text">
        确定要删除这张卡片吗？该操作不可恢复。
      </p>
      <p class="deck-detail__delete-preview">
        {{ deletingCard?.front }}
      </p>
      <template #footer>
        <button
          class="deck-detail__btn deck-detail__btn--default"
          @click="deleteModalVisible = false"
        >
          取消
        </button>
        <button
          class="deck-detail__btn deck-detail__btn--danger"
          @click="onConfirmDelete"
        >
          确认删除
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.deck-detail {
  padding: 24px;
}

.deck-detail__header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.deck-detail__back {
  padding: 6px 12px;
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  background: none;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.deck-detail__back:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.deck-detail__title {
  flex: 1;
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deck-detail__count {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  flex-shrink: 0;
}

.deck-detail__review {
  padding: 6px 16px;
  font-size: var(--font-size-base);
  color: var(--bg-primary);
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;
  flex-shrink: 0;
}

.deck-detail__review:hover:not(:disabled) {
  background-color: var(--accent-hover);
}

.deck-detail__review:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.deck-detail__secondary {
  padding: 6px 14px;
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
  flex-shrink: 0;
}

.deck-detail__secondary:hover:not(:disabled) {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.deck-detail__secondary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.deck-detail__create {
  padding: 6px 16px;
  font-size: var(--font-size-base);
  color: var(--bg-primary);
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.deck-detail__create:hover {
  background-color: var(--accent-hover);
}

.deck-detail__content {
  margin-top: 16px;
}

.deck-detail__delete-text {
  font-size: var(--font-size-base);
  color: var(--text-primary);
  margin: 0 0 12px;
  line-height: 1.6;
}

.deck-detail__delete-preview {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  background-color: var(--bg-secondary);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deck-detail__btn {
  padding: 6px 16px;
  font-size: var(--font-size-base);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.deck-detail__btn--default {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.deck-detail__btn--default:hover {
  background-color: var(--bg-hover);
}

.deck-detail__btn--danger {
  background-color: var(--color-forgot);
  color: var(--bg-primary);
  border: 1px solid var(--color-forgot);
}

.deck-detail__btn--danger:hover {
  opacity: 0.85;
}
</style>
