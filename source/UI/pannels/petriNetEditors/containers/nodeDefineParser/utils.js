import { TYPE_MAP } from './types.js';

export const utils = {
  normalizeType(type) {
    try {
      if (!type) return null;
      if (typeof type === 'string') {
        return TYPE_MAP[type.toLowerCase()] || null;
      }
      if (typeof type === 'function') {
        return type;
      }
      if (Array.isArray(type)) {
        return type[0] || null;
      }
      if (typeof type === 'object' && type.type) {
        return this.normalizeType(type.type);
      }
      return null;
    } catch (error) {
      console.warn('类型规范化失败:', error);
      return null;
    }
  },

  validateValue(value, type) {
    if (!type || type === 'any') return true;
    const normalizedType = this.normalizeType(type);
    if (!normalizedType) return true;
    if (value === null || value === undefined) {
      return false;
    }
    if (normalizedType === String) return typeof value === 'string';
    if (normalizedType === Number) return typeof value === 'number' && !isNaN(value);
    if (normalizedType === Boolean) return typeof value === 'boolean';
    return value instanceof normalizedType;
  }
};

export const handleError = (operation, error) => {
  console.error(`${operation}失败:`, error);
  throw error;
};
