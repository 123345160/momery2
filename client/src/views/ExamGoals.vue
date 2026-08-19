<script setup lang="ts">
// ExamGoals.vue — 考试目标页（FRONTEND §4.1 路由 /cards/exam）
import { onMounted, ref } from 'vue';
import { examsApi, type ExamProgress, type CreateExamDto } from '@/api/exams';
import { useDeckStore } from '@/stores/deck';
import { useUIStore } from '@/stores/ui';
import Modal from '@/components/common/Modal.vue';
import type { Exam } from '@/types';

const deckStore = useDeckStore();
const uiStore = useUIStore();
const exams = ref<Exam[]>([]);
const progresses = ref<Record<number, ExamProgress>>({});
const loading = ref(false);
const modalVisible = ref(false);
const form = ref<CreateExamDto>({ name: '', deckId: null, targetDate: '', targetCount: 50 });
const saving = ref(false);

onMounted(async () => {
  await Promise.all([loadExams(), deckStore.fetchDecks()]);
});

async function loadExams() {
  loading.value = true;
  try {
    exams.value = await examsApi.list();
    progresses.value = {};
    for (const e of exams.value) {
      try { progresses.value[e.id] = await examsApi.progress(e.id); }
      catch (err) { console.error('progress', e.id, err); }
    }
  } finally { loading.value = false; }
}

async function onCreate() {
  if (!form.value.name.trim()) { uiStore.showToast('考试名称不能为空', 'warning'); return; }
  saving.value = true;
  try {
    await examsApi.create(form.value);
    modalVisible.value = false;
    form.value = { name: '', deckId: null, targetDate: '', targetCount: 50 };
    await loadExams();
    uiStore.showToast('已创建', 'success');
  } catch (err) {
    uiStore.showToast('失败：' + (err as Error).message, 'error');
  } finally { saving.value = false; }
}

async function onDelete(id: number) {
  if (!confirm('确认删除？')) return;
  try { await examsApi.remove(id); await loadExams(); uiStore.showToast('已删除', 'success'); }
  catch (err) { uiStore.showToast('失败：' + (err as Error).message, 'error'); }
}

function deckName(id: number | null): string {
  if (!id) return '—';
  return deckStore.decks.find((d) => d.id === id)?.name ?? '—';
}
</script>

<template>
  <div class="exam-goals">
    <header class="eg-head">
      <h2>考试与目标</h2>
      <button class="eg-add" @click="modalVisible = true">+ 新建目标</button>
    </header>
    <div v-if="loading" class="eg-empty">加载中…</div>
    <div v-else-if="exams.length === 0" class="eg-empty"><p>还没有考试目标</p><button class="eg-add" @click="modalVisible = true">添加</button></div>
    <div v-else class="eg-list">
      <article v-for="e in exams" :key="e.id" class="eg-card">
        <header class="eg-card-head"><h3>{{ e.name }}</h3><button class="eg-del" @click="onDelete(e.id)">×</button></header>
        <dl class="eg-meta">
          <div><dt>牌组</dt><dd>{{ deckName(e.deck_id) }}</dd></div>
          <div><dt>目标日期</dt><dd>{{ e.target_date ?? '—' }}</dd></div>
          <div><dt>目标数</dt><dd>{{ e.target_count }}</dd></div>
          <div><dt>状态</dt><dd>{{ e.status }}</dd></div>
        </dl>
        <div v-if="progresses[e.id]" class="eg-prog">
          <div class="eg-bar"><div class="eg-bar-fill" :style="{ width: Math.min(progresses[e.id].currentAccuracy, 100) + '%' }" /></div>
          <p class="eg-prog-meta">已掌握 {{ progresses[e.id].currentCount }}/{{ progresses[e.id].targetCount }} · 正确率 {{ progresses[e.id].currentAccuracy }}% · 剩 {{ progresses[e.id].daysLeft }} 天</p>
        </div>
      </article>
    </div>
    <Modal :visible="modalVisible" title="新建考试目标" @close="modalVisible = false">
      <div class="eg-form">
        <label>名称<input v-model="form.name" placeholder="如：期末考试" /></label>
        <label>关联牌组<select v-model="form.deckId"><option :value="null">无</option><option v-for="d in deckStore.decks" :key="d.id" :value="d.id">{{ d.name }}</option></select></label>
        <label>目标日期<input v-model="form.targetDate" type="date" /></label>
        <label>目标卡片数<input v-model.number="form.targetCount" type="number" min="1" /></label>
      </div>
      <template #footer>
        <button @click="modalVisible = false">取消</button>
        <button class="primary" :disabled="saving" @click="onCreate">{{ saving ? '保存中…' : '创建' }}</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.exam-goals { padding: 16px 24px; height: 100%; overflow-y: auto; }
.eg-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.eg-head h2 { font-size: var(--font-size-xl); margin: 0; }
.eg-add { padding: 6px 14px; background-color: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; }
.eg-empty { padding: 48px; text-align: center; color: var(--text-tertiary); }
.eg-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.eg-card { background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; }
.eg-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.eg-card-head h3 { margin: 0; font-size: var(--font-size-lg); }
.eg-del { background: none; border: none; cursor: pointer; color: var(--text-tertiary); font-size: 18px; }
.eg-del:hover { color: var(--danger); }
.eg-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 12px; }
.eg-meta dt { font-size: var(--font-size-sm); color: var(--text-tertiary); margin: 0; }
.eg-meta dd { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-primary); }
.eg-prog { margin-top: 8px; }
.eg-bar { height: 6px; background-color: var(--bg-hover); border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.eg-bar-fill { height: 100%; background-color: var(--primary); transition: width 0.3s ease; }
.eg-prog-meta { margin: 0; font-size: var(--font-size-sm); color: var(--text-secondary); }
.eg-form { display: flex; flex-direction: column; gap: 10px; }
.eg-form label { display: flex; flex-direction: column; gap: 4px; font-size: var(--font-size-sm); color: var(--text-secondary); }
.eg-form input, .eg-form select { padding: 6px 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: var(--font-size-base); }
</style>
