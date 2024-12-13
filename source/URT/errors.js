/**
 * URT系统基础错误类
 */
export class URTError extends Error {
  constructor(message) {
    super(message);
    this.name = 'URTError';
  }
}

/**
 * 验证错误
 */
export class ValidationError extends URTError {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 解析错误
 */
export class ParseError extends URTError {
  constructor(message) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * 导入错误
 */
export class ImportError extends URTError {
  constructor(message) {
    super(message);
    this.name = 'ImportError';
  }
}

/**
 * 不支持的操作错误
 */
export class UnsupportedOperationError extends URTError {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedOperationError';
  }
}

/**
 * 资源不存在错误
 */
export class ResourceNotFoundError extends URTError {
  constructor(message) {
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}

/**
 * 权限错误
 */
export class PermissionError extends URTError {
  constructor(message) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * 网络错误
 */
export class NetworkError extends URTError {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}
