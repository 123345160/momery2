/**
 * 自定义业务异常（STANDARDS §7.1）
 *
 * 属性：code (业务错误码), message (描述), httpStatus (HTTP 状态码)
 * 继承自 Error，保留 stack trace
 * 用于所有可预期的业务异常
 */

export class AppError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
