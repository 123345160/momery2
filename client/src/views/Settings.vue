<script setup lang="ts">
// Settings.vue — 设置页（FRONTEND §4.1 路由 /settings）
// M1：卡片模板管理（CRUD，预置保护）

import { onMounted, ref } from 'vue';
import { templatesApi, type CreateTemplateDto } from '@/api/templates';
import { useUIStore } from '@/stores/ui';
import Modal from '@/components/common/Modal.vue';
import type { Template } from '@/types';

const uiStore = useUIStore();
const templates = ref<Template[]>([]);
const loading = ref(false);
const modalVisible = ref(false);
const editing = ref<Template | null>(null);
const form = ref<CreateTemplateDto>({ name: '', description: '', front: '', back: '' });
const saving = ref(false);

onMounted(async () => { await load(); });

async function load() {
  loading.value = true;
  try { templates.value = await templatesApi.list(); }
  catch (err) { uiStore.showToast('加载失败：' + (err as Error).message, 'error'); }
  finally { loading.value = false; }
}

function openCreate() {
  editing.value = null;
  form.value = { name: '', description: '', front: '', back: '' };
  modalVisible.value = true;
}

function openEdit(t: Template) {
  if (t.is_default) { uiStore.showToast('预置模板不可修改', 'warning'); return; }
  editing.value = t;
  form.value = { name: t.name, description: t.description, front: t.front, back: t.back };
  modalVisible.value = true;
}

async function onSave() {
  if (!form.value.name.trim()) { uiStore.showToast('名称不能为空', 'warning'); return; }
  saving.value = true;
  try {
    if (editing.value) await templatesApi.update(editing.value.id, form.value);
    else await templatesApi.create(form.value);
    modalVisible.value = false;
    await load();
    uiStore.showToast(editing.value ? '已更新' : '已创建', 'success');
  } catch (err) {
    uiStore.showToast('失败：' + (err as Error).message, 'error');
  } finally { saving.value = false; }
}

async function onDelete(t: Template) {
  if (t.is_default) { uiStore.showToast('预置模板不可删除', 'warning'); return; }
  if (!confirm(`确认删除模板「${t.name}」？`)) return;
  try { await templatesApi.remove(t.id); await load(); uiStore.showToast('已删除', 'success'); }
  catch (err) { uiStore.showToast('失败：' + (err as Error).message, 'error'); }
}
</script>

<template>
  <div class="settings">
    <header class="settings__head">
      <h2>设置</h2>
      <button class="settings__add" @click="openCreate">+ 新建模板</button>
    </header>
    <p class="settings__hint">卡片模板用于规范 Q/A 格式；预置模板受保护。</p>
    <div v-if="loading" class="settings__empty">加载中…</div>
    <div v-else-if="templates.length === 0" class="settings__empty">暂无模板</div>
    <ul v-else class="settings__list">
      <li v-for="t in templates" :key="t.id" class="settings__item">
        <div class="settings__item-head">
          <span class="settings__item-name">{{ t.name }}</span>
          <span v-if="t.is_default" class="settings__badge">预置</span>
        </div>
        <p class="settings__item-front"><strong>正:</strong> {{ t.front }}</p>
        <p class="settings__item-back"><strong>背:</strong> {{ t.back }}</p>
        <div class="settings__item-actions">
          <button @click="openEdit(t)" :disabled="!!t.is_default">编辑</button>
          <button @click="onDelete(t)" :disabled="!!t.is_default" class="danger">删除</button>
        </div>
      </li>
    </ul>
    <Modal :visible="modalVisible" :title="editing ? '编辑模板' : '新建模板'" @close="modalVisible = false">
      <div class="tpl-form">
        <label>名称<input v-model="form.name" /></label>
        <label>描述<input v-model="form.description" /></label>
        <label>正面模板<textarea v-model="form.front" rows="3" /></label>
        <label>背面模板<textarea v-model="form.back" rows="3" /></label>
      </div>
      <template #footer>
        <button @click="modalVisible = false">取消</button>
        <button class="primary" :disabled="saving" @click="onSave">{{ saving ? '保存中…' : '保存' }}</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.settings { padding: 16px 24px; height: 100%; overflow-y: auto; }
.settings__head { display: flex; justify-content: space-between; align-items: center; }
.settings__head h2 { font-size: var(--font-size-xl); margin: 0; }
.settings__add { padding: 6px 14px; background-color: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; }
.settings__hint { color: var(--text-tertiary); font-size: var(--font-size-sm); margin: 4px 0 16px; }
.settings__empty { padding: 32px; text-align: center; color: var(--text-tertiary); }
.settings__list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.settings__item { background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 14px; }
.settings__item-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.settings__item-name { font-weight: 600; font-size: var(--font-size-base); }
.settings__badge { font-size: var(--font-size-sm); color: var(--primary); border: 1px solid var(--primary); border-radius: var(--radius-sm); padding: 0 6px; }
.settings__item-front, .settings__item-back { margin: 4px 0; font-size: var(--font-size-sm); color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.settings__item-actions { display: flex; gap: 8px; margin-top: 8px; }
.settings__item-actions button { padding: 4px 10px; background-color: var(--bg-hover); border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; font-size: var(--font-size-sm); }
.settings__item-actions button:disabled { opacity: 0.4; cursor: not-allowed; }
.settings__item-actions button.danger { color: var(--danger); }
.tpl-form { display: flex; flex-direction: column; gap: 10px; }
.tpl-form label { display: flex; flex-direction: column; gap: 4px; font-size: var(--font-size-sm); color: var(--text-secondary); }
.tpl-form input, .tpl-form textarea { padding: 6px 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: var(--font-size-base); resize: vertical; }
</style>
