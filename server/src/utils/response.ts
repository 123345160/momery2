/**
 * 响应工具函数（STANDARDS §6.3，强制使用）
 *
 * 所有 controller 必须通过本文件的工具函数发送响应
 * 禁止直接调用 res.json() 或 res.status().json()
 */

import type { Response } from 'express';

/** 成功响应：HTTP 200 */
export function success<T>(res: Response, data: T, message: string = 'ok'): void {
  res.json({ code: 0, message, data });
}

/** 创建成功响应：HTTP 201 */
export function created<T>(res: Response, data: T): void {
  res.status(201).json({ code: 0, message: 'created', data });
}

/** 失败响应：HTTP 400/404/409/500 */
export function fail(res: Response, code: number, message: string, httpStatus: number = 400): void {
  res.status(httpStatus).json({ code, message, data: null });
}
