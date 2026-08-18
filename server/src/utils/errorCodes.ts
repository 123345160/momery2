/**
 * 错误码全量清单（STANDARDS §6.2）
 *
 * 18 个业务错误码 + 1 个成功码
 * 禁止自创错误码，新增需先更新本文件 + 同步 ARCH §6.4
 */

export const ErrorCodes = {
  // 成功
  SUCCESS: 0,

  // 参数校验（HTTP 400）
  MISSING_FIELD: 40001,
  INVALID_FORMAT: 40002,
  INVALID_RESULT: 40003,
  EMPTY_DECK: 40004,
  INVALID_JSON: 40005,

  // 资源不存在（HTTP 404）
  DECK_NOT_FOUND: 40401,
  CARD_NOT_FOUND: 40402,
  NOTE_NOT_FOUND: 40403,
  FOLDER_NOT_FOUND: 40404,
  TEMPLATE_NOT_FOUND: 40405,

  // 业务冲突（HTTP 409）
  DECK_DUPLICATE: 40901,
  FOLDER_NOT_EMPTY: 40902,
  DEFAULT_TEMPLATE: 40903,

  // 服务端错误（HTTP 500）
  DB_ERROR: 50001,
  FILE_WRITE_ERROR: 50002,
  FILE_READ_ERROR: 50003,
  INTERNAL_ERROR: 50004,
} as const;

/** 错误码 → HTTP 状态码映射 */
export const ErrorCodeToHttpStatus: Record<number, number> = {
  [ErrorCodes.SUCCESS]: 200,
  [ErrorCodes.MISSING_FIELD]: 400,
  [ErrorCodes.INVALID_FORMAT]: 400,
  [ErrorCodes.INVALID_RESULT]: 400,
  [ErrorCodes.EMPTY_DECK]: 400,
  [ErrorCodes.INVALID_JSON]: 400,
  [ErrorCodes.DECK_NOT_FOUND]: 404,
  [ErrorCodes.CARD_NOT_FOUND]: 404,
  [ErrorCodes.NOTE_NOT_FOUND]: 404,
  [ErrorCodes.FOLDER_NOT_FOUND]: 404,
  [ErrorCodes.TEMPLATE_NOT_FOUND]: 404,
  [ErrorCodes.DECK_DUPLICATE]: 409,
  [ErrorCodes.FOLDER_NOT_EMPTY]: 409,
  [ErrorCodes.DEFAULT_TEMPLATE]: 409,
  [ErrorCodes.DB_ERROR]: 500,
  [ErrorCodes.FILE_WRITE_ERROR]: 500,
  [ErrorCodes.FILE_READ_ERROR]: 500,
  [ErrorCodes.INTERNAL_ERROR]: 500,
};
