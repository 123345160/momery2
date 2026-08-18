/**
 * useStatsStore — 统计业务域（FRONTEND §5.2.5）
 *
 * - state: overview/calendarData/timeline/loading
 * - actions: fetchOverview（fetchCalendar/fetchTimeline/fetchDeckStats 为 M1 占位）
 * - getters: masteredCount/dueToday
 *
 * V1.0 后端只实现 GET /api/stats/overview；calendar/timeline/deckStats 为 M1
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as statsApi from '@/api/stats';
import type { CalendarDay, StatsOverview, TimelineItem } from '@/types';

export const useStatsStore = defineStore('stats', () => {
  // ===== state =====
  const overview = ref<StatsOverview | null>(null);
  const calendarData = ref<{ year: number; month: number; days: CalendarDay[] }>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    days: [],
  });
  const timeline = ref<TimelineItem[]>([]);
  const loading = ref(false);

  // ===== getters =====
  /** 已掌握卡片数（口径见立项 R11：repetitions>=3 且 interval>=30240 分钟） */
  const masteredCount = computed(() => overview.value?.masteredCards ?? 0);

  /** 今日待复习数 */
  const dueToday = computed(() => overview.value?.dueToday ?? 0);

  // ===== actions =====
  async function fetchOverview(): Promise<void> {
    loading.value = true;
    try {
      overview.value = await statsApi.getOverview();
    } finally {
      loading.value = false;
    }
  }

  /** GET /api/stats/calendar（M1 占位） */
  async function fetchCalendar(year: number, month: number): Promise<void> {
    loading.value = true;
    try {
      const days = await statsApi.getCalendar(year, month);
      calendarData.value = { year, month, days };
    } finally {
      loading.value = false;
    }
  }

  /** GET /api/stats/timeline（M1 占位） */
  async function fetchTimeline(): Promise<void> {
    loading.value = true;
    try {
      timeline.value = await statsApi.getTimeline();
    } finally {
      loading.value = false;
    }
  }

  /** GET /api/stats/deck/:id（M1 占位） */
  async function fetchDeckStats(_deckId: number): Promise<void> {
    // M1 后端就绪后实现
  }

  return {
    // state
    overview,
    calendarData,
    timeline,
    loading,
    // getters
    masteredCount,
    dueToday,
    // actions
    fetchOverview,
    fetchCalendar,
    fetchTimeline,
    fetchDeckStats,
  };
});
