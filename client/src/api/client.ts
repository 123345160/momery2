/**
 * Axios 客户端实例 + 拦截器（FRONTEND §6.2）
 *
 * - baseURL: /api（由 Vite proxy 转发到 localhost:3000）
 * - 响应拦截器：code===0 提取 data；code!==0 reject + toast
 * - 请求拦截器：V1.0/M1 留空，M2 注入 Authorization
 *
 * 调用方拿到的 Promise<T> 已经是解包后的 data 字段，不是 ApiResponse<T>
 */

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types';

const client: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器（V1.0/M1 无额外 header；M2 注入 Authorization）
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // M2: const token = localStorage.getItem('token');
    //     if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器（FRONTEND §6.2.1）
client.interceptors.response.use(
  (response) => {
    // Blob/ArrayBuffer 响应直接返回（exportAll/exportDeck 导出文件场景）
    if (
      response.config.responseType === 'blob' ||
      response.config.responseType === 'arraybuffer'
    ) {
      return response.data;
    }

    const body = response.data as ApiResponse<unknown>;

    // 业务失败：code !== 0
    if (body.code !== 0) {
      const message = body.message || '请求失败';
      // TODO: 等 useUIStore 就位后切换为 showToast(message, 'error')
      console.error('[API Error]', body.code, message);
      return Promise.reject(new Error(message));
    }

    // 业务成功：提取 data
    return body.data;
  },
  (error) => {
    // 网络错误（无响应）
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        console.error('[API Timeout] 请求超时，请稍后重试');
      } else {
        console.error('[API Network] 网络连接失败，请检查网络');
      }
    } else {
      console.error('[API HTTP]', error.response.status, error.message);
    }
    return Promise.reject(error);
  }
);

export default client;
