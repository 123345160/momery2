/**
 * api/exams.ts — 考试目标（FRONTEND §6.3.8）
 */

import client from './client';
import type { Exam } from '@/types';

export interface CreateExamDto {
  name: string;
  deckId?: number | null;
  targetDate?: string;
  targetCount?: number;
}

export interface UpdateExamDto {
  name?: string;
  deckId?: number | null;
  targetDate?: string;
  targetCount?: number;
  status?: string;
}

export interface ExamProgress {
  targetCount: number;
  currentCount: number;
  targetAccuracy: number;
  currentAccuracy: number;
  daysLeft: number;
}

export const examsApi = {
  list: () => client.get('/exams') as unknown as Promise<Exam[]>,
  get: (id: number) => client.get(`/exams/${id}`) as unknown as Promise<Exam>,
  create: (data: CreateExamDto) =>
    client.post('/exams', data) as unknown as Promise<{ id: number }>,
  update: (id: number, data: UpdateExamDto) =>
    client.put(`/exams/${id}`, data) as unknown as Promise<null>,
  remove: (id: number) => client.delete(`/exams/${id}`) as unknown as Promise<null>,
  progress: (id: number) =>
    client.get(`/exams/${id}/progress`) as unknown as Promise<ExamProgress>,
};
