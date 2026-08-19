<script setup lang="ts">
// FolderTree.vue — 文件夹树（扁平渲染，避免递归类型）
import { ref } from 'vue';
import type { FolderNode } from '@/types';

defineProps<{ tree: FolderNode[]; selectedFolder: number | null; loading?: boolean }>();
const emit = defineEmits<{
  'folder-select': [id: number | null];
  'folder-create': [name: string, parentId: number | null];
  'folder-delete': [id: number];
}>();
const newFolderName = ref('');
const showInput = ref(false);
function onCreate() {
  const name = newFolderName.value.trim();
  if (!name) return;
  emit('folder-create', name, null);
  newFolderName.value = '';
  showInput.value = false;
}
function flatten(nodes: FolderNode[], level = 0, acc: { node: FolderNode; level: number }[] = []) {
  for (const n of nodes) {
    acc.push({ node: n, level });
    if (n.children?.length) flatten(n.children, level + 1, acc);
  }
  return acc;
}
</script>

<template>
  <aside class="folder-tree" :class="{ 'is-loading': loading }">
    <div class="ft-head">
      <span class="ft-title">文件夹</span>
      <button class="ft-add" @click="showInput = !showInput">+</button>
    </div>
    <div v-if="showInput" class="ft-input">
      <input v-model="newFolderName" placeholder="新文件夹名" @keyup.enter="onCreate" @keyup.esc="showInput = false" />
      <button @click="onCreate">确定</button>
    </div>
    <ul class="ft-list">
      <li class="ft-item" :class="{ 'is-active': selectedFolder === null }" @click="emit('folder-select', null)">
        <span class="ft-icon">📁</span><span class="ft-name">全部笔记</span>
      </li>
      <li v-for="item in flatten(tree)" :key="item.node.id" class="ft-item" :class="{ 'is-active': selectedFolder === item.node.id }" :style="{ paddingLeft: item.level * 16 + 16 + 'px' }" @click="emit('folder-select', item.node.id)">
        <span class="ft-icon">📁</span>
        <span class="ft-name">{{ item.node.name }}</span>
        <span class="ft-count">({{ item.node.noteCount }})</span>
        <button class="ft-del" @click.stop="emit('folder-delete', item.node.id)">×</button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.folder-tree { width: 240px; flex-shrink: 0; border-right: 1px solid var(--border-color); padding: 12px 0; background-color: var(--bg-card); overflow-y: auto; }
.folder-tree.is-loading { opacity: 0.6; }
.ft-head { display: flex; justify-content: space-between; align-items: center; padding: 0 16px 8px; }
.ft-title { font-size: var(--font-size-sm); color: var(--text-secondary); font-weight: 600; }
.ft-add { background: none; border: none; cursor: pointer; color: var(--primary); font-size: 16px; }
.ft-input { display: flex; gap: 4px; padding: 0 12px 8px; }
.ft-input input { flex: 1; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
.ft-input button { padding: 4px 8px; cursor: pointer; background-color: var(--primary); color: #fff; border: none; border-radius: var(--radius-sm); }
.ft-list { list-style: none; margin: 0; padding: 0; }
.ft-item { display: flex; align-items: center; gap: 6px; padding: 6px 16px; cursor: pointer; font-size: var(--font-size-base); color: var(--text-primary); }
.ft-item:hover { background-color: var(--bg-hover); }
.ft-item.is-active { background-color: var(--bg-active); color: var(--primary); font-weight: 500; }
.ft-icon { font-size: 14px; }
.ft-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ft-count { font-size: var(--font-size-sm); color: var(--text-tertiary); }
.ft-del { background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-size: 14px; padding: 0 4px; }
.ft-del:hover { color: var(--danger); }
</style>
