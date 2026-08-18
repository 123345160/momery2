/**
 * 记忆学习平台 — 前端应用入口（FRONTEND §2.2）
 *
 * createApp + use(pinia) + use(router) + mount
 * 全局样式按序引入：variables → reset → base → layout → typography → utilities
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// 全局样式（顺序重要：variables 在最前，utilities 在最后）
import './styles/variables.css';
import './styles/reset.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/typography.css';
import './styles/utilities.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
