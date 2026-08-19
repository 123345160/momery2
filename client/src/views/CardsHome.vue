<script setup lang="ts">
// CardsHome.vue — 牌组网格页（FRONTEND §3.2.2 + §4.1 路由 /cards）
// 装配 DeckGrid + 牌组 CRUD（创建/编辑/删除）
//
// 决策点 2：删除二次确认 Modal
// 决策点 3：新建按钮放在页面内顶部（不依赖全局 CreateButton）

import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDeckStore } from '@/stores/deck';
import DeckGrid from '@/components/deck/DeckGrid.vue';
import DeckFormModal from '@/components/deck/DeckFormModal.vue';
import Modal from '@/components/common/Modal.vue';
import type { CreateDeckDto, Deck, DeckListItem, UpdateDeckDto } from '@/types';

const router = useRouter();
const deckStore = useDeckStore();

// 创建/编辑弹窗状态
const formModalVisible = ref(false);
const editingDeck = ref<Deck | null>(null);

// 删除确认弹窗状态
const deleteModalVisible = ref(false);
const deletingDeck = ref<DeckListItem | null>(null);

onMounted(async () => {
  await deckStore.fetchDecks();
});

// 新建牌组
function onCreateDeck(): void {
  editingDeck.value = null;
  formModalVisible.value = true;
}

// 点击牌组 → 跳转详情
function onDeckClick(deckId: number): void {
  router.push(`/cards/deck/${deckId}`);
}

// 编辑牌组 → 打开弹窗（回填）
function onDeckEdit(deckId: number): void {
  const deck = deckStore.decks.find((d) => d.id === deckId);
  if (!deck) return;
  editingDeck.value = deck;
  formModalVisible.value = true;
}

// 删除牌组 → 弹确认 Modal
function onDeckDelete(deckId: number): void {
  const deck = deckStore.decks.find((d) => d.id === deckId);
  if (!deck) return;
  deletingDeck.value = deck;
  deleteModalVisible.value = true;
}

// 确认删除
async function onConfirmDelete(): Promise<void> {
  if (!deletingDeck.value) return;
  try {
    await deckStore.deleteDeck(deletingDeck.value.id);
    deleteModalVisible.value = false;
    deletingDeck.value = null;
  } catch (err) {
    window.alert('删除牌组失败：' + (err as Error).message);
  }
}

// 提交牌组表单
async function onSubmitDeck(data: CreateDeckDto | UpdateDeckDto): Promise<void> {
  try {
    if (editingDeck.value) {
      await deckStore.updateDeck(editingDeck.value.id, data as UpdateDeckDto);
    } else {
      await deckStore.createDeck(data as CreateDeckDto);
    }
    formModalVisible.value = false;
  } catch (err) {
    window.alert('保存牌组失败：' + (err as Error).message);
  }
}

const deleteModalTitle = computed(() =>
  deletingDeck.value ? `删除牌组「${deletingDeck.value.name}」` : '删除牌组'
);
</script>

<template>
  <div class="cards-home">
    <header class="cards-home__header">
      <h1 class="cards-home__title">记忆卡片</h1>
      <button class="cards-home__create" @click="onCreateDeck">
        + 新建牌组
      </button>
    </header>

    <div class="cards-home__content">
      <DeckGrid
        :decks="deckStore.decks"
        :loading="deckStore.loading"
        @deck-click="onDeckClick"
        @deck-edit="onDeckEdit"
        @deck-delete="onDeckDelete"
      />
    </div>

    <DeckFormModal
      :visible="formModalVisible"
      :edit-deck="editingDeck"
      @close="formModalVisible = false"
      @submit="onSubmitDeck"
    />

    <Modal
      :visible="deleteModalVisible"
      :title="deleteModalTitle"
      width="400px"
      @close="deleteModalVisible = false"
    >
      <p class="cards-home__delete-text">
        确定要删除牌组「{{ deletingDeck?.name }}」吗？
        该操作会同时删除牌组下的所有卡片，且不可恢复。
      </p>
      <template #footer>
        <button
          class="cards-home__btn cards-home__btn--default"
          @click="deleteModalVisible = false"
        >
          取消
        </button>
        <button
          class="cards-home__btn cards-home__btn--danger"
          @click="onConfirmDelete"
        >
          确认删除
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.cards-home {
  padding: 24px;
}

.cards-home__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.cards-home__title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.cards-home__create {
  padding: 6px 16px;
  font-size: var(--font-size-base);
  color: var(--bg-primary);
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.cards-home__create:hover {
  background-color: var(--accent-hover);
}

.cards-home__content {
  margin-top: 16px;
}

.cards-home__delete-text {
  font-size: var(--font-size-base);
  color: var(--text-primary);
  margin: 0;
  line-height: 1.6;
}

.cards-home__btn {
  padding: 6px 16px;
  font-size: var(--font-size-base);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.cards-home__btn--default {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.cards-home__btn--default:hover {
  background-color: var(--bg-hover);
}

.cards-home__btn--danger {
  background-color: var(--color-forgot);
  color: var(--bg-primary);
  border: 1px solid var(--color-forgot);
}

.cards-home__btn--danger:hover {
  opacity: 0.85;
}
</style>
