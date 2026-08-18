<script setup lang="ts">
// CalendarBar.vue — 顶部栏日期选择（FRONTEND §3.2.1）
// State: selectedDate: string (YYYY-MM-DD)
// Events: @date-change(date: string)

import { ref } from 'vue';

const emit = defineEmits<{
  dateChange: [date: string];
}>();

function todayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const selectedDate = ref<string>(todayStr());

function onChange(): void {
  emit('dateChange', selectedDate.value);
}
</script>

<template>
  <div class="calendar-bar">
    <input
      v-model="selectedDate"
      class="calendar-bar__input"
      type="date"
      @change="onChange"
    />
  </div>
</template>

<style scoped>
.calendar-bar {
  display: flex;
  align-items: center;
}

.calendar-bar__input {
  font-size: var(--font-size-sm);
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}
</style>
