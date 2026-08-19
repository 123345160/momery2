/**
 * useDeckStore — 牌组业务域（FRONTEND §5.2.1）
 *
 * - state: decks/currentDeck/currentDeckCards/loading
 * - actions: fetchDecks/fetchDeck/createDeck/updateDeck/deleteDeck
 *            fetchCards/createCard/updateCard/deleteCard
 * - getters: totalCards/dueCountByDeck
 *
 * 规范：Store 间不互引；API 调用走 api 模块（不直接使用 axios）
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as decksApi from '@/api/decks';
import * as cardsApi from '@/api/cards';
import type {
  Card,
  CardQueryParams,
  CreateCardDto,
  CreateDeckDto,
  Deck,
  DeckListItem,
  DeckQueryParams,
  UpdateCardDto,
  UpdateDeckDto,
} from '@/types';

export const useDeckStore = defineStore('deck', () => {
  // ===== state =====
  const decks = ref<DeckListItem[]>([]);
  const currentDeck = ref<Deck | null>(null);
  const currentDeckCards = ref<Card[]>([]);
  const loading = ref(false);

  // 当前卡片查询参数（搜索/排序/状态筛选），CRUD 后用同一条件重查
  const currentCardQuery = ref<CardQueryParams>({});
  // 当前牌组卡片总数（服务端按筛选条件返回的 total）
  const currentDeckCardsTotal = ref(0);

  // ===== getters =====
  /** 全部卡片总数（跨牌组） */
  const totalCards = computed(() =>
    decks.value.reduce((sum, deck) => sum + deck.card_count, 0)
  );

  /** 指定牌组的到期卡片数 */
  function dueCountByDeck(deckId: number): number {
    const deck = decks.value.find((d) => d.id === deckId);
    return deck ? deck.due_count : 0;
  }

  /** 当前牌组的卡片数 */
  const currentDeckCardCount = computed(() => currentDeckCards.value.length);

  // ===== 牌组 actions =====
  async function fetchDecks(params?: DeckQueryParams): Promise<void> {
    loading.value = true;
    try {
      const res = await decksApi.getDecks(params);
      decks.value = res.items;
    } finally {
      loading.value = false;
    }
  }

  async function fetchDeck(id: number): Promise<void> {
    loading.value = true;
    try {
      const detail = await decksApi.getDeck(id);
      currentDeck.value = detail;
    } finally {
      loading.value = false;
    }
  }

  async function createDeck(data: CreateDeckDto): Promise<Deck> {
    const deck = await decksApi.createDeck(data);
    await fetchDecks(); // 刷新列表
    return deck;
  }

  async function updateDeck(id: number, data: UpdateDeckDto): Promise<Deck> {
    const deck = await decksApi.updateDeck(id, data);
    await fetchDecks(); // 刷新列表
    if (currentDeck.value?.id === id) {
      currentDeck.value = deck;
    }
    return deck;
  }

  async function deleteDeck(id: number): Promise<void> {
    await decksApi.deleteDeck(id);
    await fetchDecks(); // 刷新列表
    if (currentDeck.value?.id === id) {
      currentDeck.value = null;
      currentDeckCards.value = [];
    }
  }

  // ===== 卡片 actions =====
  async function fetchCards(deckId: number, params?: CardQueryParams): Promise<void> {
    loading.value = true;
    try {
      const query = params ?? currentCardQuery.value;
      currentCardQuery.value = query;
      const res = await cardsApi.getCards(deckId, query);
      currentDeckCards.value = res.items;
      currentDeckCardsTotal.value = res.total;
    } finally {
      loading.value = false;
    }
  }

  async function createCard(deckId: number, data: CreateCardDto): Promise<Card> {
    const card = await cardsApi.createCard(deckId, data);
    await fetchCards(deckId); // 用当前查询条件刷新列表
    await fetchDecks(); // 刷新聚合字段（card_count 等）
    return card;
  }

  async function updateCard(deckId: number, cardId: number, data: UpdateCardDto): Promise<Card> {
    const card = await cardsApi.updateCard(cardId, data);
    await fetchCards(deckId); // 用当前查询条件刷新列表
    return card;
  }

  async function deleteCard(deckId: number, cardId: number): Promise<void> {
    await cardsApi.deleteCard(cardId);
    await fetchCards(deckId); // 用当前查询条件刷新列表
    await fetchDecks(); // 刷新聚合字段
  }

  return {
    // state
    decks,
    currentDeck,
    currentDeckCards,
    currentDeckCardsTotal,
    currentCardQuery,
    loading,
    // getters
    totalCards,
    dueCountByDeck,
    currentDeckCardCount,
    // 牌组 actions
    fetchDecks,
    fetchDeck,
    createDeck,
    updateDeck,
    deleteDeck,
    // 卡片 actions
    fetchCards,
    createCard,
    updateCard,
    deleteCard,
  };
});
