/**
 * 记忆学习平台 — 前端应用入口
 * createApp + use(pinia) + mount
 * Stage 0：最小入口，Stage 4 补全 router + 全局样式
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles/variables.css';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
