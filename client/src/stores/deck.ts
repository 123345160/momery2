/**
 * useDeckStore — 牌组业务域（FRONTEND §5.2.1）
 *
 * - state: decks/currentDeck/loading
 * - actions: fetchDecks/fetchDeck/createDeck/updateDeck/deleteDeck
 * - getters: totalCards/dueCountByDeck
 *
 * 规范：Store 间不互引；API 调用走 api 模块（不直接使用 axios）
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as decksApi from '@/api/decks';
import type { CreateDeckDto, Deck, DeckListItem, DeckQueryParams, UpdateDeckDto } from '@/types';

export const useDeckStore = defineStore('deck', () => {
  // ===== state =====
  const decks = ref<DeckListItem[]>([]);
  const currentDeck = ref<Deck | null>(null);
  const loading = ref(false);

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

  // ===== actions =====
  async function fetchDecks(params?: DeckQueryParams): Promise<void> {
    loading.value = true;
    try {
      decks.value = await decksApi.getDecks(params);
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
    }
  }

  return {
    // state
    decks,
    currentDeck,
    loading,
    // getters
    totalCards,
    dueCountByDeck,
    // actions
    fetchDecks,
    fetchDeck,
    createDeck,
    updateDeck,
    deleteDeck,
  };
});
