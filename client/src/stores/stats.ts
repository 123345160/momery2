/**
 * useStatsStore — 统计业务域（FRONTEND §5.2.5）
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as statsApi from '@/api/stats';
import type { CalendarDay, StatsOverview, TimelineItem } from '@/types';

export const useStatsStore = defineStore('stats', () => {
  const overview = ref<StatsOverview | null>(null);
  const calendarData = ref<CalendarDay[]>([]);
  const timeline = ref<TimelineItem[]>([]);
  const loading = ref(false);

  const masteredCount = computed(() => overview.value?.masteredCards ?? 0);
  const dueToday = computed(() => overview.value?.dueToday ?? 0);

  async function fetchOverview(): Promise<void> {
    loading.value = true;
    try { overview.value = await statsApi.getOverview(); }
    finally { loading.value = false; }
  }

  async function fetchCalendar(days = 30): Promise<void> {
    loading.value = true;
    try { calendarData.value = await statsApi.getCalendar(days); }
    finally { loading.value = false; }
  }

  async function fetchTimeline(limit = 50): Promise<void> {
    loading.value = true;
    try { timeline.value = await statsApi.getTimeline(limit); }
    finally { loading.value = false; }
  }

  return {
    overview, calendarData, timeline, loading,
    masteredCount, dueToday,
    fetchOverview, fetchCalendar, fetchTimeline,
  };
});
