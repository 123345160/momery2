<script setup lang="ts">
// MarkdownPreview.vue — Markdown 渲染组件（FRONTEND §3.2.3）
// Props: content: string
// 使用 marked 渲染；marked v14 默认转义 HTML（防 XSS）
// 代码块按默认样式渲染（无语法高亮）——V1.0 简化实现，M1 可加 marked-highlight 扩展
// 样式通过 :deep() 穿透 scoped（FRONTEND §3.4.3）

import { computed } from 'vue';
import { marked } from 'marked';

const props = defineProps<{
  content: string;
}>();

const html = computed<string>(() => {
  if (!props.content) return '';
  return marked.parse(props.content, { async: false }) as string;
});
</script>

<template>
  <div class="markdown-body" v-html="html" />
</template>

<style scoped>
.markdown-body {
  font-size: var(--font-size-base);
  color: var(--text-primary);
  line-height: 1.7;
  word-break: break-word;
}

/* 通过 :deep() 穿透 scoped，作用于 v-html 注入的内容 */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 16px 0 8px;
  font-weight: 600;
  line-height: 1.3;
}

.markdown-body :deep(h1) { font-size: var(--font-size-2xl); }
.markdown-body :deep(h2) { font-size: var(--font-size-xl); }
.markdown-body :deep(h3) { font-size: var(--font-size-lg); }

.markdown-body :deep(p) {
  margin-bottom: 12px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0 12px 24px;
}

.markdown-body :deep(ul) { list-style: disc; }
.markdown-body :deep(ol) { list-style: decimal; }

.markdown-body :deep(code) {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  background-color: var(--bg-hover);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
}

.markdown-body :deep(pre) {
  background-color: var(--bg-hover);
  padding: 12px;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: 8px 0;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--accent);
  padding-left: 12px;
  color: var(--text-secondary);
  margin: 8px 0;
}

.markdown-body :deep(table) {
  width: 100%;
  margin: 8px 0;
  border-collapse: collapse;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--border-color);
  padding: 6px 10px;
  text-align: left;
}

.markdown-body :deep(th) {
  background-color: var(--bg-hover);
  font-weight: 600;
}

.markdown-body :deep(a) {
  color: var(--accent);
  text-decoration: underline;
}
</style>
