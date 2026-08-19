<script setup lang="ts">
// DeckDetail.vue — 牌组详情（卡片列表）（FRONTEND §3.2.2 + §4.1 路由 /cards/deck/:deckId）
// 装配 CardList + 卡片 CRUD（创建/编辑/删除）
//
// 决策点 2：删除二次确认 Modal
// 决策点 3：新建按钮放在页面内顶部

import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDeckStore } from '@/stores/deck';
import CardList from '@/components/deck/CardList.vue';
import CardCreateForm from '@/components/deck/CardCreateForm.vue';
import Modal from '@/components/common/Modal.vue';
import type { Card, CreateCardDto, UpdateCardDto } from '@/types';

const route = useRoute();
const router = useRouter();
const deckStore = useDeckStore();

// 路由参数
const deckId = computed<number>(() => Number(route.params.deckId));

// 牌组名（用于 CardList 标题）
const deckName = computed<string>(() => deckStore.currentDeck?.name ?? '牌组详情');

// 创建/编辑弹窗状态
const formModalVisible = ref(false);
const editingCard = ref<Card | null>(null);

// 删除确认弹窗状态
const deleteModalVisible = ref(false);
const deletingCard = ref<Card | null>(null);

onMounted(async () => {
  await Promise.all([
    deckStore.fetchDeck(deckId.value),
    deckStore.fetchCards(deckId.value),
  ]);
});

// 返回牌组网格
function onBack(): void {
  router.push('/cards');
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
</script>

<template>
  <div class="deck-detail">
    <header class="deck-detail__header">
      <button class="deck-detail__back" @click="onBack">
        ← 返回牌组
      </button>
      <h1 class="deck-detail__title">{{ deckName }}</h1>
      <button class="deck-detail__create" @click="onCreateCard">
        + 新建卡片
      </button>
    </header>

    <div class="deck-detail__content">
      <CardList
        :cards="deckStore.currentDeckCards"
        :deck-name="deckName"
        :loading="deckStore.loading"
        @edit="onEditCard"
        @delete="onDeleteCard"
        @create="onCreateCard"
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
