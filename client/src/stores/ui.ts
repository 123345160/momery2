/**
 * useUIStore — UI 业务域（FRONTEND §5.2.4）
 *
 * - state: sidebarCollapsed/currentTabGroup/toasts
 * - actions: toggleSidebar/setTabGroup/showToast/dismissToast
 *
 * §9.4 验收点：sidebarCollapsed 持久化到 localStorage
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ToastItem } from '@/types';

const SIDEBAR_COLLAPSED_KEY = 'memory_app_sidebar_collapsed';

function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

let toastIdCounter = 0;

export const useUIStore = defineStore('ui', () => {
  // ===== state =====
  const sidebarCollapsed = ref<boolean>(loadSidebarCollapsed());
  const currentTabGroup = ref<'cards' | 'notes' | null>(null);
  const toasts = ref<ToastItem[]>([]);

  // ===== actions =====
  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value;
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed.value));
    } catch {
      // localStorage 不可用时静默失败
    }
  }

  function setTabGroup(group: 'cards' | 'notes' | null): void {
    currentTabGroup.value = group;
  }

  function showToast(message: string, type: ToastItem['type'] = 'info'): void {
    const id = ++toastIdCounter;
    toasts.value.push({ id, message, type });
    // 3 秒后自动消失
    setTimeout(() => dismissToast(id), 3000);
  }

  function dismissToast(id: number): void {
    const idx = toasts.value.findIndex((t) => t.id === id);
    if (idx >= 0) {
      toasts.value.splice(idx, 1);
    }
  }

  return {
    // state
    sidebarCollapsed,
    currentTabGroup,
    toasts,
    // actions
    toggleSidebar,
    setTabGroup,
    showToast,
    dismissToast,
  };
});
