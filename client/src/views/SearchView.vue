<script setup lang="ts">
// SearchView.vue — 全局搜索结果页（FRONTEND §4.1 路由 /search）

import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { searchApi, type SearchResult, type SearchCategory } from '@/api/search';

const route = useRoute();
const router = useRouter();

const q = ref('');
const category = ref<SearchCategory>('all');
const result = ref<SearchResult | null>(null);
const loading = ref(false);

const categories: { value: SearchCategory; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'decks', label: '牌组' },
  { value: 'cards', label: '卡片' },
  { value: 'notes', label: '笔记' },
];

async function doSearch() {
  if (!q.value.trim()) { result.value = null; return; }
  loading.value = true;
  try {
    result.value = await searchApi.search(q.value, category.value);
    router.replace({ query: { q: q.value, category: category.value } });
  } catch (err) {
    console.error('search failed', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  q.value = (route.query.q as string) ?? '';
  category.value = (route.query.category as SearchCategory) ?? 'all';
  if (q.value) doSearch();
});

function onSubmit() { doSearch(); }
function goDeck(id: number) { router.push(`/cards/deck/${id}`); }
function goNote(id: number) { router.push(`/notes/${id}`); }
</script>

<template>
  <div class="search-view">
    <header class="search-view__bar">
      <input v-model="q" class="search-view__input" placeholder="搜索牌组、卡片、笔记…" @keyup.enter="onSubmit" />
      <button class="search-view__btn" @click="onSubmit">搜索</button>
    </header>
    <nav class="search-view__cats">
      <button
        v-for="c in categories"
        :key="c.value"
        :class="{ active: category === c.value }"
        @click="category = c.value; doSearch()"
      >{{ c.label }}</button>
    </nav>
    <div v-if="loading" class="search-view__loading">搜索中…</div>
    <div v-else-if="result && (result.decks.length + result.cards.length + result.notes.length) === 0" class="search-view__empty">
      未找到 "{{ result.keyword }}" 相关内容
    </div>
    <div v-if="result" class="search-view__results">
      <section v-if="result.decks.length" class="search-view__section">
        <h3>牌组（{{ result.decks.length }}）</h3>
        <ul>
          <li v-for="d in result.decks" :key="d.id" @click="goDeck(d.id)">
            <span class="search-view__name">{{ d.name }}</span>
            <span class="search-view__meta">{{ d.cardCount }} 张卡片</span>
          </li>
        </ul>
      </section>
      <section v-if="result.cards.length" class="search-view__section">
        <h3>卡片（{{ result.cards.length }}）</h3>
        <ul>
          <li v-for="c in result.cards" :key="c.id" @click="c.deckId && goDeck(c.deckId)">
            <span class="search-view__name">{{ c.front }}</span>
            <span class="search-view__meta">{{ c.deckName ?? '—' }}</span>
          </li>
        </ul>
      </section>
      <section v-if="result.notes.length" class="search-view__section">
        <h3>笔记（{{ result.notes.length }}）</h3>
        <ul>
          <li v-for="n in result.notes" :key="n.id" @click="goNote(n.id)">
            <span class="search-view__name">{{ n.title }}</span>
            <span class="search-view__meta">{{ n.snippet }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.search-view { padding: 16px 24px; height: 100%; overflow-y: auto; }
.search-view__bar { display: flex; gap: 8px; margin-bottom: 12px; }
.search-view__input { flex: 1; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: var(--font-size-base); outline: none; }
.search-view__input:focus { border-color: var(--primary); }
.search-view__btn { padding: 8px 16px; background-color: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; }
.search-view__cats { display: flex; gap: 4px; margin-bottom: 16px; }
.search-view__cats button { padding: 4px 12px; background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; font-size: var(--font-size-sm); color: var(--text-secondary); }
.search-view__cats button.active { background-color: var(--primary); color: #fff; border-color: var(--primary); }
.search-view__loading, .search-view__empty { padding: 32px; text-align: center; color: var(--text-tertiary); }
.search-view__section { margin-bottom: 20px; }
.search-view__section h3 { font-size: var(--font-size-base); color: var(--text-secondary); margin: 0 0 8px; }
.search-view__section ul { list-style: none; margin: 0; padding: 0; }
.search-view__section li { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 4px; cursor: pointer; }
.search-view__section li:hover { background-color: var(--bg-hover); }
.search-view__name { font-size: var(--font-size-base); color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.search-view__meta { font-size: var(--font-size-sm); color: var(--text-tertiary); flex-shrink: 0; margin-left: 12px; }
</style>
